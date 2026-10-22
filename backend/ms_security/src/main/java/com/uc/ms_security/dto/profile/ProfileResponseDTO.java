package com.uc.ms_security.dto.profile;

import java.time.LocalDate;

import lombok.Value;

@Value
public class ProfileResponseDTO {
    Long id;
    Long userId;
    String phone;
    LocalDate birthDate;
}