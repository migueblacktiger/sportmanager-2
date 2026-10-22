package com.uc.ms_security.dto.permission;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PermissionRequestDTO {

    @NotBlank(message = "La URL es obligatoria")
    @Size(max = 255, message = "La URL no puede superar 255 caracteres")
    private String url;

    @NotBlank(message = "El método es obligatorio")
    @Pattern(
            regexp = "(?i)GET|POST|PUT|PATCH|DELETE",
            message = "El método debe ser GET, POST, PUT, PATCH o DELETE"
    )
    private String method;

    @NotBlank(message = "El modelo es obligatorio")
    @Size(max = 50, message = "El modelo no puede superar 50 caracteres")
    private String model;
}