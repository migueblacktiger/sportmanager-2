package com.uc.ms_security.dto.permission;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PermissionValidationRequestDTO {
    @NotBlank
    @Size(max = 255)
    @Pattern(regexp = "/(?:[A-Za-z0-9_-]+|\\{[A-Za-z][A-Za-z0-9_]*\\})(?:/(?:[A-Za-z0-9_-]+|\\{[A-Za-z][A-Za-z0-9_]*\\}))*|/",
            message = "La url debe ser una ruta absoluta sin query, fragmentos ni segmentos ambiguos")
    private String url;

    @NotBlank
    @Pattern(regexp = "GET|POST|PUT|PATCH|DELETE", flags = Pattern.Flag.CASE_INSENSITIVE,
            message = "El método HTTP no es válido")
    private String method;
}
