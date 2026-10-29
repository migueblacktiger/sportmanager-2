package com.uc.ms_security.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequestDTO(
        @NotBlank(message = "El enlace no es válido")
        @Pattern(regexp = "[A-Za-z0-9_-]{43}", message = "El enlace no es válido") String token,
        @NotBlank(message = "La contraseña es obligatoria")
        @Size(min = 8, message = "La contraseña debe tener mínimo 8 caracteres") String password) {
    @Override
    public String toString() { return "ResetPasswordRequestDTO[redacted]"; }
}
