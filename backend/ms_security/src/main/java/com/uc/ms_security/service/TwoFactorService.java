package com.uc.ms_security.service;

import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.uc.ms_security.dto.auth.*;
import com.uc.ms_security.entity.*;
import com.uc.ms_security.entity.TwoFactorChallenge.Purpose;
import com.uc.ms_security.repository.*;

@Service
@Transactional
public class TwoFactorService {
    private final TwoFactorChallengeRepository challenges;
    private final UserRepository users;
    private final SessionRepository sessions;
    private final AuthService auth;
    private final PasswordEncoder passwords;
    private final PasswordRecoveryMailer mailer;
    private final PasswordRecoveryRateLimiter limiter;
    private final SecretKeySpec key;
    private final SecureRandom random = new SecureRandom();

    public TwoFactorService(TwoFactorChallengeRepository challenges, UserRepository users,
            SessionRepository sessions, AuthService auth, PasswordEncoder passwords,
            PasswordRecoveryMailer mailer, PasswordRecoveryRateLimiter limiter,
            @Value("${app.two-factor.hmac-key:}") String secret) {
        this.challenges = challenges; this.users = users; this.sessions = sessions;
        this.auth = auth; this.passwords = passwords; this.mailer = mailer; this.limiter = limiter;
        if (secret.isBlank()) key = null;
        else {
            byte[] bytes;
            try { bytes = Base64.getDecoder().decode(secret); }
            catch (IllegalArgumentException exception) { throw new IllegalStateException("TWO_FACTOR_HMAC_KEY debe ser Base64"); }
            if (bytes.length < 32) throw new IllegalStateException("TWO_FACTOR_HMAC_KEY requiere al menos 32 bytes aleatorios");
            key = new SecretKeySpec(bytes, "HmacSHA256");
        }
    }

    public TwoFactorDTO.Settings settings(Long userId) {
        User user = users.findById(userId).orElseThrow(this::invalid);
        return new TwoFactorDTO.Settings(user.getAccountType() == AccountType.LOCAL,
                user.isTwoFactorEnabled(), key != null && mailer.isEnabled());
    }

    // Called only after the password has been checked and the user row locked by AuthService.
    public TwoFactorDTO.Challenge beginLogin(User user, String ip) {
        return begin(user, Purpose.LOGIN, ip);
    }

    public TwoFactorDTO.Challenge requestChange(Long userId, TwoFactorDTO.Change dto, String ip) {
        limit("change-ip:" + ip, 10);
        User user = users.findForPasswordRecoveryById(userId).orElseThrow(this::invalid);
        requireLocal(user);
        limit("change-user:" + userId, 5);
        if (!passwords.matches(dto.password(), user.getPassword())) {
            throw error(HttpStatus.BAD_REQUEST, "La contraseña actual no es correcta.");
        }
        if (dto.enabled() == user.isTwoFactorEnabled()) {
            throw error(HttpStatus.CONFLICT, "La configuración ya tiene ese estado. Actualiza la página.");
        }
        return begin(user, dto.enabled() ? Purpose.ENABLE : Purpose.DISABLE, ip);
    }

    private TwoFactorDTO.Challenge begin(User user, Purpose purpose, String ip) {
        configured(); requireLocal(user);
        limit("issue-ip:" + ip, 10); limit("issue-user:" + user.getId(), 5);
        Instant now = Instant.now().truncatedTo(ChronoUnit.MICROS);
        challenges.consumeAll(user.getId(), now);
        byte[] id = new byte[32]; random.nextBytes(id);
        TwoFactorChallenge challenge = new TwoFactorChallenge();
        challenge.setId(Base64.getUrlEncoder().withoutPadding().encodeToString(id));
        challenge.setUser(user); challenge.setPurpose(purpose);
        challenge.setCreatedAt(now); challenge.setLastSentAt(now); challenge.setExpiresAt(now.plusSeconds(300));
        challenge.setCredentialHash(credentialHash(user));
        String code = newCode(); challenge.setCodeHash(codeHash(challenge, code));
        challenges.saveAndFlush(challenge);
        send(challenge, code);
        return response(challenge);
    }

    @Transactional(noRollbackFor = ResponseStatusException.class)
    public AuthResponseDTO verifyLogin(TwoFactorDTO.Verify dto, String ip) {
        TwoFactorChallenge challenge = verify(dto, null, true, ip);
        return auth.openSession(challenge.getUser());
    }

    @Transactional(noRollbackFor = ResponseStatusException.class)
    public TwoFactorDTO.Settings confirmChange(Long userId, TwoFactorDTO.Verify dto, String ip) {
        TwoFactorChallenge challenge = verify(dto, userId, false, ip);
        User user = challenge.getUser();
        user.setTwoFactorEnabled(challenge.getPurpose() == Purpose.ENABLE);
        challenges.flush();
        challenges.consumeAll(userId, Instant.now());
        sessions.deleteAllForPasswordRecovery(userId);
        return new TwoFactorDTO.Settings(true, user.isTwoFactorEnabled(), true);
    }

    private TwoFactorChallenge verify(TwoFactorDTO.Verify dto, Long owner, boolean login, String ip) {
        configured(); limit("verify-ip:" + ip, 30);
        TwoFactorChallenge challenge = locked(dto.challengeId(), owner, login);
        active(challenge);
        limit("verify-user:" + challenge.getUser().getId(), 15);
        challenge.setAttempts(challenge.getAttempts() + 1);
        if (!equal(challenge.getCodeHash(), codeHash(challenge, dto.code()))) {
            if (challenge.getAttempts() >= 5) challenge.setConsumedAt(Instant.now());
            // noRollbackFor on both entry points commits these counters on failed verification.
            throw error(HttpStatus.BAD_REQUEST, challenge.getAttempts() >= 5
                    ? "Se agotaron los cinco intentos. Cancela y comienza de nuevo."
                    : "El código no es correcto. Inténtalo nuevamente.");
        }
        challenge.setConsumedAt(Instant.now());
        return challenge;
    }

    public TwoFactorDTO.Challenge resend(String id, Long owner, boolean login, String ip) {
        configured(); limit("resend-ip:" + ip, 10);
        TwoFactorChallenge challenge = locked(id, owner, login);
        active(challenge);
        if (challenge.getResends() >= 3 || Instant.now().isBefore(challenge.getLastSentAt().plusSeconds(60))) {
            throw error(HttpStatus.TOO_MANY_REQUESTS, "Espera 60 segundos entre envíos. Máximo tres reenvíos por desafío.");
        }
        limit("resend-user:" + challenge.getUser().getId(), 5);
        String code;
        do { code = newCode(); } while (equal(challenge.getCodeHash(), codeHash(challenge, code)));
        challenge.setCodeHash(codeHash(challenge, code));
        challenge.setLastSentAt(Instant.now()); challenge.setResends(challenge.getResends() + 1);
        send(challenge, code);
        // Do not reset attempts or extend the original five-minute lifetime.
        return response(challenge);
    }

    public void cancel(String id, Long owner, boolean login) {
        TwoFactorChallenge challenge = locked(id, owner, login);
        if (challenge.getConsumedAt() == null) challenge.setConsumedAt(Instant.now());
    }

    private TwoFactorChallenge locked(String id, Long owner, boolean login) {
        Long userId = challenges.findUserId(id).orElseThrow(this::invalid);
        if (owner != null && !owner.equals(userId)) throw invalid();
        users.findForPasswordRecoveryById(userId).orElseThrow(this::invalid);
        TwoFactorChallenge challenge = challenges.findLocked(id).orElseThrow(this::invalid);
        if (login != (challenge.getPurpose() == Purpose.LOGIN)) throw invalid();
        return challenge;
    }

    private void active(TwoFactorChallenge challenge) {
        requireLocal(challenge.getUser());
        if (challenge.getConsumedAt() != null || challenge.getAttempts() >= 5
                || !challenge.getExpiresAt().isAfter(Instant.now())
                || !equal(challenge.getCredentialHash(), credentialHash(challenge.getUser()))
                || (challenge.getPurpose() == Purpose.LOGIN && !challenge.getUser().isTwoFactorEnabled())) throw invalid();
    }

    private void requireLocal(User user) {
        if (!user.isEnabled() || user.getAccountType() != AccountType.LOCAL || user.getPassword() == null) {
            throw error(HttpStatus.BAD_REQUEST, "El 2FA interno solo está disponible para cuentas LOCAL habilitadas.");
        }
    }

    private void configured() {
        if (key == null || !mailer.isEnabled()) throw error(HttpStatus.SERVICE_UNAVAILABLE,
                "El envío de códigos 2FA no está configurado. Contacta al administrador.");
    }

    private void send(TwoFactorChallenge challenge, String code) {
        String action = switch (challenge.getPurpose()) {
            case LOGIN -> "iniciar sesión"; case ENABLE -> "activar 2FA"; case DISABLE -> "desactivar 2FA";
        };
        try { mailer.sendTwoFactorCode(challenge.getUser().getEmail(), code, action); }
        catch (RuntimeException exception) {
            throw error(HttpStatus.SERVICE_UNAVAILABLE, "No se pudo enviar el código. Inténtalo más tarde.");
        }
    }

    private TwoFactorDTO.Challenge response(TwoFactorChallenge challenge) {
        String email = challenge.getUser().getEmail();
        int at = email.indexOf('@');
        String masked = at > 0 ? email.substring(0, 1) + "***" + email.substring(at) : "tu correo registrado";
        return new TwoFactorDTO.Challenge(true, challenge.getId(), challenge.getExpiresAt(),
                Math.max(0, challenge.getExpiresAt().getEpochSecond() - Instant.now().getEpochSecond()),
                Math.max(0, challenge.getLastSentAt().plusSeconds(60).getEpochSecond() - Instant.now().getEpochSecond()),
                challenge.getPurpose().name(), masked);
    }

    private String newCode() { return String.format(Locale.ROOT, "%06d", random.nextInt(1_000_000)); }
    private String credentialHash(User user) {
        return hmac("credentials:" + user.getPassword() + ":" + user.getEmail() + ":" + user.isTwoFactorEnabled());
    }
    private String codeHash(TwoFactorChallenge challenge, String code) {
        return hmac(challenge.getId() + ":" + challenge.getUser().getId() + ":" + challenge.getPurpose() + ":" + code);
    }
    private String hmac(String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256"); mac.init(key);
            return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException exception) { throw new IllegalStateException("No se pudo calcular HMAC"); }
    }
    private boolean equal(String left, String right) {
        return MessageDigest.isEqual(left.getBytes(StandardCharsets.US_ASCII), right.getBytes(StandardCharsets.US_ASCII));
    }
    private void limit(String key, int maximum) {
        if (!limiter.allow("2fa:" + key, maximum)) throw error(HttpStatus.TOO_MANY_REQUESTS,
                "Demasiados intentos de 2FA. Espera 15 minutos antes de volver a intentarlo.");
    }
    private ResponseStatusException invalid() {
        return error(HttpStatus.BAD_REQUEST, "El desafío expiró, fue utilizado o ya no es válido. Cancela y comienza de nuevo.");
    }
    private ResponseStatusException error(HttpStatus status, String message) { return new ResponseStatusException(status, message); }
}
