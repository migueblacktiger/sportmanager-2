package com.uc.ms_security.dto.user_role;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AssignRoleRequestDTO {

    @NotNull(message = "El identificador del usuario es obligatorio")
    private Long userId;

    @NotNull(message = "El identificador del rol es obligatorio")
    private Long roleId;
}
