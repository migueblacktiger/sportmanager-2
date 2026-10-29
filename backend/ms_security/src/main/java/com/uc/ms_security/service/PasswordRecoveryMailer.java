package com.uc.ms_security.service;

import java.net.URI;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class PasswordRecoveryMailer {
    private final ObjectProvider<JavaMailSender> senders;
    private final boolean enabled;
    private final String from;
    private final String frontendUrl;

    public PasswordRecoveryMailer(ObjectProvider<JavaMailSender> senders,
            @Value("${app.password-recovery.mail-enabled:false}") boolean enabled,
            @Value("${app.password-recovery.mail-from:}") String from,
            @Value("${app.password-recovery.frontend-url:http://localhost:4200/}") String frontendUrl) {
        this.senders = senders;
        this.enabled = enabled;
        this.from = from;
        this.frontendUrl = frontendUrl;
        URI uri = URI.create(frontendUrl);
        boolean localHttp = "http".equals(uri.getScheme())
                && ("localhost".equals(uri.getHost()) || "127.0.0.1".equals(uri.getHost()));
        if ((!"https".equals(uri.getScheme()) && !localHttp) || uri.getHost() == null
                || uri.getUserInfo() != null || uri.getFragment() != null || uri.getQuery() != null) {
            throw new IllegalStateException("PASSWORD_RESET_FRONTEND_URL requiere HTTPS (HTTP solo en localhost), sin query ni fragmento");
        }
    }

    public boolean isEnabled() { return enabled; }

    public void send(String email, String token) {
        sendText(email, "SportManager: recupera tu contraseña",
                "Solicitaste recuperar tu contraseña de SportManager.\n\n"
                + "Abre este enlace en los próximos 15 minutos:\n"
                + frontendUrl + "#reset-password=" + token
                + "\n\nEl enlace solo se puede usar una vez. Si no lo solicitaste, ignora este correo.");
    }

    public void sendTwoFactorCode(String email, String code, String action) {
        sendText(email, "SportManager: código de seguridad",
                "Código para " + action + ": " + code
                + "\n\nEl desafío vence cinco minutos después del envío inicial. Reenviar no amplía ese plazo."
                + " No compartas el código. Si no lo solicitaste, revisa la seguridad de tu cuenta.");
    }

    private void sendText(String email, String subject, String text) {
        JavaMailSender sender = senders.getIfAvailable();
        if (!enabled || sender == null || from.isBlank()) {
            throw new IllegalStateException("El envío de recuperación no está configurado");
        }
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(email);
        message.setSubject(subject);
        message.setText(text);
        sender.send(message);
    }
}
