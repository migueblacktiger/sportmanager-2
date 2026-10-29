package com.uc.ms_security.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
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

import com.uc.ms_security.dto.auth.RegisterRequestDTO;
import com.uc.ms_security.entity.Role;
import com.uc.ms_security.entity.Session;
import com.uc.ms_security.entity.User;
import com.uc.ms_security.entity.UserRole;
import com.uc.ms_security.exception.ApplicationException;
import com.uc.ms_security.exception.ErrorCase;
import com.uc.ms_security.mapper.PermissionMapper;
import com.uc.ms_security.mapper.RoleMapper;
import com.uc.ms_security.mapper.UserMapper;
import com.uc.ms_security.repository.RolePermissionRepository;
import com.uc.ms_security.repository.RoleRepository;
import com.uc.ms_security.repository.SessionRepository;
import com.uc.ms_security.repository.UserRepository;
import com.uc.ms_security.repository.UserRoleRepository;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private UserRoleRepository userRoleRepository;

    @Mock
    private RolePermissionRepository rolePermissionRepository;

    @Mock
    private SessionRepository sessionRepository;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Mock
    private UserMapper userMapper;

    @Mock
    private RoleMapper roleMapper;

    @Mock
    private PermissionMapper permissionMapper;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                userRepository,
                roleRepository,
                userRoleRepository,
                rolePermissionRepository,
                sessionRepository,
                passwordEncoder,
                new com.uc.ms_security.security.InternalJwtService(java.util.Base64.getEncoder().encodeToString(new byte[32]), "sportmanager", "sportmanager-api"),
                userMapper,
                roleMapper,
                permissionMapper
        );
    }

    @Test
    void registerShouldRejectDuplicateEmail() {
        RegisterRequestDTO dto = new RegisterRequestDTO();
        dto.setName("Juan Pérez");
        dto.setEmail("juan@gmail.com");
        dto.setPassword("12345678");

        when(userRepository.existsByEmail("juan@gmail.com")).thenReturn(true);

        ApplicationException exception = assertThrows(
                ApplicationException.class,
                () -> authService.register(dto)
        );

        assertEquals(ErrorCase.ALREADY_EXISTS, exception.getErrorCase());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void registerShouldStoreBCryptPasswordAndAssignTheUserRole() {
        String rawPassword = "12345678";
        RegisterRequestDTO dto = new RegisterRequestDTO();
        dto.setName("Juan Pérez");
        dto.setEmail("juan@gmail.com");
        dto.setPassword(rawPassword);

        Role userRole = new Role();
        userRole.setId(2L);
        userRole.setName(AuthService.DEFAULT_ROLE);

        when(userRepository.existsByEmail(dto.getEmail())).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User savedUser = invocation.getArgument(0);
            savedUser.setId(1L);
            return savedUser;
        });
        when(roleRepository.findByNameIgnoreCase(AuthService.DEFAULT_ROLE))
                .thenReturn(Optional.of(userRole));
        when(sessionRepository.save(any(Session.class))).thenAnswer(invocation -> {
            Session session = invocation.getArgument(0);
            session.setId(1L);
            return session;
        });
        when(userRoleRepository.findAllByUserId(1L)).thenReturn(List.of());

        authService.register(dto);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        String storedPassword = userCaptor.getValue().getPassword();
        assertNotEquals(rawPassword, storedPassword);
        assertTrue(passwordEncoder.matches(rawPassword, storedPassword));

        ArgumentCaptor<UserRole> userRoleCaptor = ArgumentCaptor.forClass(UserRole.class);
        verify(userRoleRepository).save(userRoleCaptor.capture());
        assertEquals(AuthService.DEFAULT_ROLE, userRoleCaptor.getValue().getRole().getName());
    }
}
