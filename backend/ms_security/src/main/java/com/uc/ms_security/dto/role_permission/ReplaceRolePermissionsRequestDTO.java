package com.uc.ms_security.dto.role_permission;

import java.util.List;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ReplaceRolePermissionsRequestDTO {

    @NotNull(message = "La lista de permisos es obligatoria (puede estar vacía)")
    private List<@NotNull(message = "Los identificadores de permiso no pueden ser nulos") Long> permissionIds;
}
