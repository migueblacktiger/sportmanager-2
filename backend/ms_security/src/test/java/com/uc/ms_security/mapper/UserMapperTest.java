package com.uc.ms_security.mapper;

import static org.junit.jupiter.api.Assertions.*;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;

import com.uc.ms_security.dto.user.UserDetailResponseDTO;
import com.uc.ms_security.entity.Profile;
import com.uc.ms_security.entity.User;

class UserMapperTest {

    @Test
    void toDetailResponseDTOShouldIncludeProfile() {
        User user = new User();
        user.setId(1L);
        user.setName("Ana");
        user.setEmail("ana@email.com");
        user.setPassword("secret");

        Profile profile = new Profile();
        profile.setId(10L);
        profile.setPhone("3001234567");
        profile.setBirthDate(LocalDate.of(1998, 5, 21));
        profile.setUser(user);
        user.setProfile(profile);

        UserMapper userMapper = new UserMapper(
                new ProfileMapper(),
                new SessionMapper(),
                new UserRoleMapper(new RoleMapper())
        );

        UserDetailResponseDTO dto = userMapper.toDetailResponseDTO(user);

        assertNotNull(dto);
        assertEquals(1L, dto.getId());
        assertEquals("Ana", dto.getName());
        assertNotNull(dto.getProfile());
        assertEquals(10L, dto.getProfile().getId());
        assertEquals("3001234567", dto.getProfile().getPhone());
        assertEquals(LocalDate.of(1998, 5, 21), dto.getProfile().getBirthDate());
    }
}
