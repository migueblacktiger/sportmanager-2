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

import com.uc.ms_security.dto.session.SessionRequestDTO;
import com.uc.ms_security.dto.session.SessionResponseDTO;
import com.uc.ms_security.service.SessionService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/users/{userId}/sessions")
@RequiredArgsConstructor
public class SessionController {

    private final SessionService sessionService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SessionResponseDTO create(
            @PathVariable Long userId,
            @Valid @RequestBody SessionRequestDTO dto) {

        return sessionService.create(userId, dto);
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
    public SessionResponseDTO update(
            @PathVariable Long userId,
            @PathVariable Long sessionId,
            @Valid @RequestBody SessionRequestDTO dto) {

        return sessionService.update(
                userId,
                sessionId,
                dto
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
