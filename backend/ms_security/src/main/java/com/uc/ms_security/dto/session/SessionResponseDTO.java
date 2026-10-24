package com.uc.ms_security.dto.session;

import java.time.LocalDateTime;

import lombok.Value;

@Value
public class SessionResponseDTO {

    Long id;

    LocalDateTime expiration;

    boolean active;
}
