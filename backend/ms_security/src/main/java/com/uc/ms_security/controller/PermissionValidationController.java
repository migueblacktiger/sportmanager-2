package com.uc.ms_security.controller;

import com.uc.ms_security.dto.permission.PermissionValidationRequestDTO;
import com.uc.ms_security.dto.permission.PermissionValidationResponseDTO;
import com.uc.ms_security.security.RequestUserContext;
import com.uc.ms_security.service.PermissionAuthorizationService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/internal/security")
@RequiredArgsConstructor
public class PermissionValidationController {
    private final PermissionAuthorizationService permissionAuthorizationService;

    @PostMapping("/permissions-validation")
    public PermissionValidationResponseDTO validate(
            @RequestAttribute(RequestUserContext.USER_ID_ATTRIBUTE) Long authenticatedUserId,
            @Valid @RequestBody PermissionValidationRequestDTO request) {
        return new PermissionValidationResponseDTO(permissionAuthorizationService.hasPermission(
                authenticatedUserId, request.getMethod(), request.getUrl()));
    }
}
