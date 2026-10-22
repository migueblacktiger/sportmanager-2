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

import com.uc.ms_security.dto.profile.CreateProfileDTO;
import com.uc.ms_security.dto.profile.ProfileResponseDTO;
import com.uc.ms_security.dto.profile.UpdateProfileDTO;
import com.uc.ms_security.service.ProfileService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/profiles")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProfileResponseDTO create(@Valid @RequestBody CreateProfileDTO dto) {
        return profileService.create(dto);
    }

    @GetMapping
    public List<ProfileResponseDTO> findAll() {
        return profileService.findAll();
    }

    @GetMapping("/{id}")
    public ProfileResponseDTO findById(@PathVariable Long id) {
        return profileService.findById(id);
    }

    @PutMapping("/{id}")
    public ProfileResponseDTO update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateProfileDTO dto) {
        return profileService.update(id, dto);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        profileService.delete(id);
    }
}