package com.uc.ms_security.dto.auth;

import java.time.LocalDateTime;
import java.util.List;

import com.uc.ms_security.dto.permission.PermissionResponseDTO;
import com.uc.ms_security.dto.role.RoleResponseDTO;
import com.uc.ms_security.dto.user.UserResponseDTO;

import lombok.Value;

@Value
public class AuthResponseDTO {
    String token;
    LocalDateTime expiration;
    UserResponseDTO user;
    List<RoleResponseDTO> roles;
    List<PermissionResponseDTO> permissions;
}
