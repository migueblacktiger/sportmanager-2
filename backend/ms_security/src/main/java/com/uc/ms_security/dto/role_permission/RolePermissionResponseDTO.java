package com.uc.ms_security.dto.role_permission;

import com.uc.ms_security.dto.permission.PermissionResponseDTO;

import lombok.Value;

@Value
public class RolePermissionResponseDTO {
    Long id;
    Long roleId;
    PermissionResponseDTO permission;
}
