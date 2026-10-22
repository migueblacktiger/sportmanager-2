package com.uc.ms_security.dto.user_role;

import com.uc.ms_security.dto.user.UserResponseDTO;
import lombok.Value;

@Value
public class RoleUserResponseDTO {

    Long id;

    Long roleId;

    UserResponseDTO user;
}
