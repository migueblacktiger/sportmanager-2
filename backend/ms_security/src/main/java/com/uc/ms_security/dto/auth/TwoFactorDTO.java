package com.uc.ms_security.dto.auth;

import java.time.Instant;
import jakarta.validation.constraints.*;

public final class TwoFactorDTO {
    private TwoFactorDTO() { }

    public record Challenge(boolean twoFactorRequired, String challengeId, Instant expiresAt,
            long expiresInSeconds, long resendAfterSeconds, String purpose, String maskedEmail) implements LoginResultDTO { }
    public record Settings(boolean available, boolean enabled, boolean configured) { }
    public record Change(@NotBlank(message = "Ingresa tu contraseña actual") String password, boolean enabled) {
        @Override public String toString() { return "TwoFactorChange[redacted]"; }
    }
    public record Verify(
            @NotBlank @Pattern(regexp = "[A-Za-z0-9_-]{43}", message = "Desafío inválido") String challengeId,
            @NotBlank @Pattern(regexp = "[0-9]{6}", message = "Ingresa los seis dígitos del código") String code) {
        @Override public String toString() { return "TwoFactorVerify[redacted]"; }
    }
    public record Reference(
            @NotBlank @Pattern(regexp = "[A-Za-z0-9_-]{43}", message = "Desafío inválido") String challengeId) {
        @Override public String toString() { return "TwoFactorReference[redacted]"; }
    }
}
