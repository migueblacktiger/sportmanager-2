package com.uc.ms_security.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.uc.ms_security.dto.role_permission.AssignPermissionRequestDTO;
import com.uc.ms_security.dto.role_permission.ReplaceRolePermissionsRequestDTO;
import com.uc.ms_security.dto.role_permission.RolePermissionResponseDTO;
import com.uc.ms_security.service.RolePermissionService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/role-permissions")
@RequiredArgsConstructor
public class RolePermissionController {

    private final RolePermissionService rolePermissionService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RolePermissionResponseDTO assign(
            @Valid @RequestBody AssignPermissionRequestDTO dto) {
        return rolePermissionService.assign(dto);
    }

    @GetMapping
    public List<RolePermissionResponseDTO> findAll() {
        return rolePermissionService.findAll();
    }

    @GetMapping("/roles/{roleId}")
    public List<RolePermissionResponseDTO> findByRoleId(
            @PathVariable Long roleId) {
        return rolePermissionService.findByRoleId(roleId);
    }

    @PutMapping("/roles/{roleId}")
    public List<RolePermissionResponseDTO> replaceForRole(
            @PathVariable Long roleId,
            @Valid @RequestBody ReplaceRolePermissionsRequestDTO dto) {
        return rolePermissionService.replaceForRole(roleId, dto);
    }

    @DeleteMapping("/{roleId}/{permissionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable Long roleId,
            @PathVariable Long permissionId) {
        rolePermissionService.delete(roleId, permissionId);
    }
}
