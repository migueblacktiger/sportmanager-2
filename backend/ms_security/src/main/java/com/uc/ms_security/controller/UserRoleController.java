package com.uc.ms_security.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.uc.ms_security.dto.user_role.AssignRoleRequestDTO;
import com.uc.ms_security.dto.user_role.RoleUserResponseDTO;
import com.uc.ms_security.dto.user_role.UserRoleResponseDTO;
import com.uc.ms_security.service.UserRoleService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/user-roles")
@RequiredArgsConstructor
public class UserRoleController {

    private final UserRoleService userRoleService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserRoleResponseDTO assign(
            @Valid @RequestBody AssignRoleRequestDTO dto) {

        return userRoleService.assign(dto);
    }

    @GetMapping
    public List<UserRoleResponseDTO> findAll() {
        return userRoleService.findAll();
    }

    @GetMapping("/users/{userId}")
    public List<UserRoleResponseDTO> findByUserId(
            @PathVariable Long userId) {

        return userRoleService.findByUserId(userId);
    }

    @GetMapping("/roles/{roleId}")
    public List<RoleUserResponseDTO> findByRoleId(
            @PathVariable Long roleId) {

        return userRoleService.findByRoleId(roleId);
    }

    @DeleteMapping("/{userId}/{roleId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable Long userId,
            @PathVariable Long roleId) {

        userRoleService.delete(userId, roleId);
    }
}
