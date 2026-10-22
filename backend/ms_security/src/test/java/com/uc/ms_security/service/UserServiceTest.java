package com.uc.ms_security.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.uc.ms_security.dto.user.CreateUserDTO;
import com.uc.ms_security.dto.user.UpdateUserDTO;
import com.uc.ms_security.dto.user.UserResponseDTO;
import com.uc.ms_security.entity.User;
import com.uc.ms_security.exception.ApplicationException;
import com.uc.ms_security.exception.ErrorCase;
import com.uc.ms_security.mapper.UserMapper;
import com.uc.ms_security.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserMapper userMapper;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository, userMapper, passwordEncoder);
    }

    @Test
    void createShouldStoreHashedPassword() {
        CreateUserDTO dto = new CreateUserDTO();
        dto.setName("Juan Pérez");
        dto.setEmail("juan@gmail.com");
        dto.setPassword("12345678");

        User entity = new User();
        entity.setPassword("12345678");

        when(userRepository.existsByEmail("juan@gmail.com")).thenReturn(false);
        when(userMapper.toEntity(dto)).thenReturn(entity);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userMapper.toResponseDTO(any(User.class)))
                .thenReturn(new UserResponseDTO(1L, "Juan Pérez", "juan@gmail.com"));

        userService.create(dto);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());

        String stored = captor.getValue().getPassword();
        assertNotEquals("12345678", stored);
        assertTrue(passwordEncoder.matches("12345678", stored));
    }

    @Test
    void createShouldRejectDuplicateEmail() {
        CreateUserDTO dto = new CreateUserDTO();
        dto.setName("Juan Pérez");
        dto.setEmail("juan@gmail.com");
        dto.setPassword("12345678");

        when(userRepository.existsByEmail("juan@gmail.com")).thenReturn(true);

        ApplicationException exception = assertThrows(
                ApplicationException.class,
                () -> userService.create(dto)
        );

        assertEquals(ErrorCase.ALREADY_EXISTS, exception.getErrorCase());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void findAllShouldReturnRegisteredUsersWithoutPasswords() {
        User firstUser = new User();
        firstUser.setId(1L);
        firstUser.setName("Ana");
        firstUser.setEmail("ana@example.com");
        firstUser.setPassword("first-hash");

        User secondUser = new User();
        secondUser.setId(2L);
        secondUser.setName("Luis");
        secondUser.setEmail("luis@example.com");
        secondUser.setPassword("second-hash");

        List<User> users = List.of(firstUser, secondUser);
        List<UserResponseDTO> expected = List.of(
                new UserResponseDTO(1L, "Ana", "ana@example.com"),
                new UserResponseDTO(2L, "Luis", "luis@example.com")
        );

        when(userRepository.findAll()).thenReturn(users);
        when(userMapper.toResponseDTOList(users)).thenReturn(expected);

        List<UserResponseDTO> result = userService.findAll();

        assertEquals(expected, result);
        verify(userMapper).toResponseDTOList(users);
    }

    @Test
    void deleteShouldRemoveExistingUser() {
        User existing = new User();
        existing.setId(1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(existing));

        userService.delete(1L);

        verify(userRepository).delete(existing);
    }

    @Test
    void deleteShouldRejectUnknownUser() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        ApplicationException exception = assertThrows(
                ApplicationException.class,
                () -> userService.delete(99L)
        );

        assertEquals(ErrorCase.NOT_FOUND, exception.getErrorCase());
        verify(userRepository, never()).delete(any(User.class));
    }

    @Test
    void updateWithoutPasswordShouldKeepExistingHash() {
        User existing = new User();
        existing.setId(1L);
        existing.setPassword("EXISTING_HASH");

        UpdateUserDTO dto = new UpdateUserDTO();
        dto.setName("Juan David");
        dto.setEmail("juan@gmail.com");

        when(userRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(userRepository.existsByEmailAndIdNot("juan@gmail.com", 1L)).thenReturn(false);
        when(userRepository.save(existing)).thenReturn(existing);
        when(userMapper.toResponseDTO(existing))
                .thenReturn(new UserResponseDTO(1L, "Juan David", "juan@gmail.com"));

        userService.update(1L, dto);

        assertEquals("EXISTING_HASH", existing.getPassword());
    }

    @Test
    void updateShouldRejectEmailUsedByAnotherUser() {
        User existing = new User();
        existing.setId(1L);

        UpdateUserDTO dto = new UpdateUserDTO();
        dto.setName("Juan David");
        dto.setEmail("otro@gmail.com");

        when(userRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(userRepository.existsByEmailAndIdNot("otro@gmail.com", 1L)).thenReturn(true);

        ApplicationException exception = assertThrows(
                ApplicationException.class,
                () -> userService.update(1L, dto)
        );

        assertEquals(ErrorCase.ALREADY_EXISTS, exception.getErrorCase());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void updateWithPasswordShouldStoreNewHash() {
        User existing = new User();
        existing.setId(1L);
        existing.setPassword("EXISTING_HASH");

        UpdateUserDTO dto = new UpdateUserDTO();
        dto.setName("Juan David");
        dto.setEmail("juan@gmail.com");
        dto.setPassword("87654321");

        when(userRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(userRepository.existsByEmailAndIdNot("juan@gmail.com", 1L)).thenReturn(false);
        when(userRepository.save(existing)).thenReturn(existing);
        when(userMapper.toResponseDTO(existing))
                .thenReturn(new UserResponseDTO(1L, "Juan David", "juan@gmail.com"));

        userService.update(1L, dto);

        assertNotEquals("87654321", existing.getPassword());
        assertTrue(passwordEncoder.matches("87654321", existing.getPassword()));
    }
}
