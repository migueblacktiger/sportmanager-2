package com.uc.ms_security.mapper;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

import com.uc.ms_security.dto.user.UserDetailResponseDTO;
import com.uc.ms_security.entity.User;

class UserMapperWithoutProfileTest {

    @Test
    void toDetailResponseDTOShouldReturnNullProfileWhenUserHasNoProfile() {
        User user = new User();
        user.setId(2L);
        user.setName("Ana");
        user.setEmail("ana@email.com");

        UserMapper userMapper = new UserMapper(
                new ProfileMapper(),
                new SessionMapper(),
                new UserRoleMapper(new RoleMapper())
        );

        UserDetailResponseDTO dto = userMapper.toDetailResponseDTO(user);

        assertEquals(2L, dto.getId());
        assertNull(dto.getProfile());
    }
}
