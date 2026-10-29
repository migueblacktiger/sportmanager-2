package com.uc.ms_security.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.task.TaskExecutor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import com.uc.ms_security.entity.AccountType;
import com.uc.ms_security.entity.PasswordResetRequest;
import com.uc.ms_security.entity.User;
import com.uc.ms_security.repository.PasswordResetRequestRepository;
import com.uc.ms_security.repository.SessionRepository;
import com.uc.ms_security.repository.UserRepository;

@Service
public class PasswordRecoveryService {
    public static final String GENERIC_CONFIRMATION =
            "Si existe una cuenta que puede recuperar su contraseña, recibirás un correo con las instrucciones";
    private static final Logger log = LoggerFactory.getLogger(PasswordRecoveryService.class);
    private final SecureRandom random = new SecureRandom();
    private final UserRepository users;
    private final PasswordResetRequestRepository requests;
    private final SessionRepository sessions;
    private final PasswordEncoder passwords;
    private final PasswordRecoveryMailer mailer;
    private final PasswordRecoveryRateLimiter limiter;
    private final TaskExecutor executor;
    private final TransactionTemplate transactions;

    public PasswordRecoveryService(UserRepository users, PasswordResetRequestRepository requests,
            SessionRepository sessions, PasswordEncoder passwords, PasswordRecoveryMailer mailer,
            PasswordRecoveryRateLimiter limiter,
            @Qualifier("passwordRecoveryExecutor") TaskExecutor executor,
            PlatformTransactionManager transactionManager) {
        this.users = users;
        this.requests = requests;
        this.sessions = sessions;
        this.passwords = passwords;
        this.mailer = mailer;
        this.limiter = limiter;
        this.executor = executor;
        this.transactions = new TransactionTemplate(transactionManager);
    }

    public void request(String email, String remoteAddress) {
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        if (!limiter.allow("forgot-ip:" + remoteAddress, 5)
                || !limiter.allow("forgot-email:" + hash(normalized), 3)) return;
        // Return the same response without account-dependent DB or SMTP latency.
        try {
            executor.execute(() -> deliver(normalized));
        } catch (RuntimeException exception) {
            log.warn("No se pudo encolar una solicitud de recuperación; respuesta pública genérica");
        }
    }

    private void deliver(String email) {
        if (!mailer.isEnabled()) {
            log.warn("Recuperación solicitada con envío de correo deshabilitado");
            return;
        }
        try {
            transactions.executeWithoutResult(status -> {
                Long id = users.findPasswordRecoveryUserIdByEmail(email).orElse(null);
                if (id == null) return;
                // Use the same user-first lock order for issuing and consuming all tokens.
                User user = users.findForPasswordRecoveryById(id).orElse(null);
                if (!eligible(user)) return;
                LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
                requests.consumeAllForUser(id, now);
                byte[] bytes = new byte[32];
                random.nextBytes(bytes);
                String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
                PasswordResetRequest request = new PasswordResetRequest();
                request.setTokenHash(hash(token));
                request.setUser(user);
                request.setCreatedAt(now);
                request.setExpiresAt(now.plusMinutes(15));
                requests.saveAndFlush(request);
                // Roll back the request if SMTP fails, leaving earlier links usable.
                mailer.send(user.getEmail(), token);
            });
        } catch (RuntimeException exception) {
            // Do not log exception details: SMTP diagnostics may contain message bodies or addresses.
            log.warn("No se pudo completar el envío de recuperación; revisar SMTP y la migración, sin datos de la solicitud");
        }
    }

    @Transactional
    public void reset(String token, String password, String remoteAddress) {
        if (!limiter.allow("reset-ip:" + remoteAddress, 10)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Demasiados intentos. Espera 15 minutos antes de volver a intentarlo.");
        }
        String tokenHash = hash(token);
        Long userId = requests.findUserIdByTokenHash(tokenHash).orElseThrow(this::invalidLink);
        User user = users.findForPasswordRecoveryById(userId).orElseThrow(this::invalidLink);
        PasswordResetRequest request = requests.findByTokenHash(tokenHash).orElseThrow(this::invalidLink);
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        if (!eligible(user) || request.getUsedAt() != null || !request.getExpiresAt().isAfter(now)) {
            throw invalidLink();
        }
        try {
            user.setPassword(passwords.encode(password));
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La contraseña no es compatible con el cifrado de la aplicación; utiliza hasta 72 bytes UTF-8.");
        }
        request.setUsedAt(now);
        requests.flush();
        requests.consumeAllForUser(userId, now);
        sessions.deleteAllForPasswordRecovery(userId);
        // No automatic session or JWT: the normal login (and its future second factor) remains mandatory.
    }

    private boolean eligible(User user) {
        return user != null && user.isEnabled() && user.getAccountType() == AccountType.LOCAL;
    }

    private ResponseStatusException invalidLink() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "El enlace no es válido, ya fue utilizado o expiró. Solicita uno nuevo.");
    }

    private static String hash(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 no disponible");
        }
    }
}
