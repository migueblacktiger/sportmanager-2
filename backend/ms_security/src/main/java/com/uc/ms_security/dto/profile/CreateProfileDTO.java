package com.uc.ms_security.dto.profile;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateProfileDTO extends BaseProfileDTO {

    @NotNull(message = "El id del usuario es obligatorio")
    private Long userId;
}