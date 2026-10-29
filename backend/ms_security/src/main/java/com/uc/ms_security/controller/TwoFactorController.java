package com.uc.ms_security.controller;

import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.uc.ms_security.dto.auth.*;
import com.uc.ms_security.security.RequestUserContext;
import com.uc.ms_security.service.TwoFactorService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth/2fa")
@RequiredArgsConstructor
public class TwoFactorController {
    private final TwoFactorService service;

    @PostMapping("/verify")
    public ResponseEntity<AuthResponseDTO> verify(@Valid @RequestBody TwoFactorDTO.Verify dto, HttpServletRequest request) {
        return response(service.verifyLogin(dto, request.getRemoteAddr()));
    }
    @PostMapping("/resend")
    public ResponseEntity<TwoFactorDTO.Challenge> resend(@Valid @RequestBody TwoFactorDTO.Reference dto, HttpServletRequest request) {
        return response(service.resend(dto.challengeId(), null, true, request.getRemoteAddr()));
    }
    @PostMapping("/cancel")
    public ResponseEntity<Map<String, String>> cancel(@Valid @RequestBody TwoFactorDTO.Reference dto) {
        service.cancel(dto.challengeId(), null, true);
        return response(Map.of("message", "Desafío cancelado"));
    }
    @GetMapping("/settings")
    public ResponseEntity<TwoFactorDTO.Settings> settings(@RequestAttribute(RequestUserContext.USER_ID_ATTRIBUTE) Long userId) {
        return response(service.settings(userId));
    }
    @PostMapping("/settings/request")
    public ResponseEntity<TwoFactorDTO.Challenge> requestChange(@RequestAttribute(RequestUserContext.USER_ID_ATTRIBUTE) Long userId,
            @Valid @RequestBody TwoFactorDTO.Change dto, HttpServletRequest request) {
        return response(service.requestChange(userId, dto, request.getRemoteAddr()));
    }
    @PostMapping("/settings/confirm")
    public ResponseEntity<TwoFactorDTO.Settings> confirmChange(@RequestAttribute(RequestUserContext.USER_ID_ATTRIBUTE) Long userId,
            @Valid @RequestBody TwoFactorDTO.Verify dto, HttpServletRequest request) {
        return response(service.confirmChange(userId, dto, request.getRemoteAddr()));
    }
    @PostMapping("/settings/resend")
    public ResponseEntity<TwoFactorDTO.Challenge> resendChange(@RequestAttribute(RequestUserContext.USER_ID_ATTRIBUTE) Long userId,
            @Valid @RequestBody TwoFactorDTO.Reference dto, HttpServletRequest request) {
        return response(service.resend(dto.challengeId(), userId, false, request.getRemoteAddr()));
    }
    @PostMapping("/settings/cancel")
    public ResponseEntity<Map<String, String>> cancelChange(@RequestAttribute(RequestUserContext.USER_ID_ATTRIBUTE) Long userId,
            @Valid @RequestBody TwoFactorDTO.Reference dto) {
        service.cancel(dto.challengeId(), userId, false);
        return response(Map.of("message", "Cambio cancelado"));
    }
    private <T> ResponseEntity<T> response(T body) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body); }
}
