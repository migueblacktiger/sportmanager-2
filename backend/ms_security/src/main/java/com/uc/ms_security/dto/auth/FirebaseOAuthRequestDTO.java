package com.uc.ms_security.dto.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class FirebaseOAuthRequestDTO {
    @NotBlank(message = "El token de identidad es obligatorio")
    private String idToken;
}
