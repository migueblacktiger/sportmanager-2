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

import com.uc.ms_security.dto.permission.PermissionRequestDTO;
import com.uc.ms_security.dto.permission.PermissionResponseDTO;
import com.uc.ms_security.service.PermissionService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/permissions")
@RequiredArgsConstructor
public class PermissionController {

    private final PermissionService permissionService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PermissionResponseDTO create(@Valid @RequestBody PermissionRequestDTO dto) {
        return permissionService.create(dto);
    }

    @GetMapping
    public List<PermissionResponseDTO> findAll() {
        return permissionService.findAll();
    }

    @GetMapping("/{id}")
    public PermissionResponseDTO findById(@PathVariable Long id) {
        return permissionService.findById(id);
    }

    @PutMapping("/{id}")
    public PermissionResponseDTO update(
            @PathVariable Long id,
            @Valid @RequestBody PermissionRequestDTO dto) {
        return permissionService.update(id, dto);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        permissionService.delete(id);
    }
}