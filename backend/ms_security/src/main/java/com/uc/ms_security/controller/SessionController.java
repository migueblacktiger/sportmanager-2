package com.uc.ms_security.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.uc.ms_security.dto.session.SessionResponseDTO;
import com.uc.ms_security.service.SessionService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/users/{userId}/sessions")
@RequiredArgsConstructor
public class SessionController {

    private final SessionService sessionService;

    @PostMapping
    public void create() {
        throw new ResponseStatusException(
                HttpStatus.METHOD_NOT_ALLOWED,
                "La creación de sesiones solo está disponible mediante autenticación"
        );
    }

    @GetMapping
    public List<SessionResponseDTO> findAll(
            @PathVariable Long userId) {

        return sessionService.findAllByUserId(userId);
    }

    @GetMapping("/{sessionId}")
    public SessionResponseDTO findById(
            @PathVariable Long userId,
            @PathVariable Long sessionId) {

        return sessionService.findById(userId, sessionId);
    }

    @PutMapping("/{sessionId}")
    public void update() {
        throw new ResponseStatusException(
                HttpStatus.METHOD_NOT_ALLOWED,
                "No se permite modificar sesiones ni reemplazar sus tokens"
        );
    }

    @DeleteMapping("/{sessionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable Long userId,
            @PathVariable Long sessionId) {

        sessionService.delete(userId, sessionId);
    }
}
