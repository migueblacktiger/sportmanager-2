package com.uc.ms_security.controller;

import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.uc.ms_security.dto.auth.ForgotPasswordRequestDTO;
import com.uc.ms_security.dto.auth.ResetPasswordRequestDTO;
import com.uc.ms_security.service.PasswordRecoveryService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth/password")
@RequiredArgsConstructor
public class PasswordRecoveryController {
    private final PasswordRecoveryService service;

    @PostMapping("/forgot")
    public ResponseEntity<Map<String, String>> forgot(@Valid @RequestBody ForgotPasswordRequestDTO dto,
            HttpServletRequest request) {
        service.request(dto.email(), request.getRemoteAddr());
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(Map.of("message", PasswordRecoveryService.GENERIC_CONFIRMATION));
    }

    @PostMapping("/reset")
    public ResponseEntity<Map<String, String>> reset(@Valid @RequestBody ResetPasswordRequestDTO dto,
            HttpServletRequest request) {
        service.reset(dto.token(), dto.password(), request.getRemoteAddr());
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(Map.of("message", "Contraseña actualizada. Inicia sesión con tu nueva contraseña."));
    }
}
