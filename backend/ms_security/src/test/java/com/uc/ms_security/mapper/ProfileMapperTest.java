package com.uc.ms_security.mapper;

import static org.junit.jupiter.api.Assertions.*;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;

import com.uc.ms_security.dto.profile.ProfileResponseDTO;
import com.uc.ms_security.entity.Profile;
import com.uc.ms_security.entity.User;

class ProfileMapperTest {

    private final ProfileMapper profileMapper = new ProfileMapper();

    @Test
    void toResponseDTOShouldReturnNullWhenProfileIsNull() {
        assertNull(profileMapper.toResponseDTO(null));
    }

    @Test
    void toResponseDTOShouldMapAllFields() {
        User user = new User();
        user.setId(7L);

        Profile profile = new Profile();
        profile.setId(3L);
        profile.setPhone("3001234567");
        profile.setBirthDate(LocalDate.of(1995, 5, 20));
        profile.setUser(user);

        ProfileResponseDTO dto = profileMapper.toResponseDTO(profile);

        assertEquals(3L, dto.getId());
        assertEquals(7L, dto.getUserId());
        assertEquals("3001234567", dto.getPhone());
        assertEquals(LocalDate.of(1995, 5, 20), dto.getBirthDate());
    }
}
