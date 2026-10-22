package com.uc.ms_security.mapper;

import java.util.List;

import org.springframework.stereotype.Component;

import com.uc.ms_security.dto.role_permission.RolePermissionResponseDTO;
import com.uc.ms_security.entity.RolePermission;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class RolePermissionMapper {

    private final PermissionMapper permissionMapper;

    public RolePermissionResponseDTO toResponseDTO(RolePermission rolePermission) {
        return new RolePermissionResponseDTO(
                rolePermission.getId(),
                rolePermission.getRole().getId(),
                permissionMapper.toResponseDTO(rolePermission.getPermission())
        );
    }

    public List<RolePermissionResponseDTO> toResponseDTOList(
            List<RolePermission> rolePermissions) {
        return rolePermissions.stream()
                .map(this::toResponseDTO)
                .toList();
    }
}
