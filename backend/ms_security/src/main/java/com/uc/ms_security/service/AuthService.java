package com.uc.ms_security.service;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.time.ZoneId;
import com.uc.ms_security.security.InternalJwtService;
import io.jsonwebtoken.Claims;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.uc.ms_security.dto.auth.AuthResponseDTO;
import com.uc.ms_security.dto.auth.LoginRequestDTO;
import com.uc.ms_security.dto.auth.RegisterRequestDTO;
import com.uc.ms_security.dto.permission.PermissionResponseDTO;
import com.uc.ms_security.dto.role.RoleResponseDTO;
import com.uc.ms_security.entity.Role;
import com.uc.ms_security.entity.AccountType;
import com.uc.ms_security.entity.RolePermission;
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

import lombok.RequiredArgsConstructor;

/**
 * Registro y autenticación por credenciales (email + contraseña).
 * La sesión se guarda en la tabla sessions con un JWT firmado.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

    public static final String ADMIN_ROLE = "Administrador";
    public static final String DEFAULT_ROLE = "Usuario";
    private static final long SESSION_HOURS = 8;

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final SessionRepository sessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final InternalJwtService jwtService;
    private final UserMapper userMapper;
    private final RoleMapper roleMapper;
    private final PermissionMapper permissionMapper;
    private final org.springframework.beans.factory.ObjectProvider<TwoFactorService> twoFactor;

    /** Crea una cuenta pública con el rol Usuario y abre una sesión. */
    public AuthResponseDTO register(RegisterRequestDTO dto) {
        if (userRepository.existsByEmail(dto.getEmail())) {
            throw new ApplicationException(
                    ErrorCase.ALREADY_EXISTS,
                    "Ya existe un usuario con este email"
            );
        }

        User user = new User();
        user.setName(dto.getName());
        user.setEmail(dto.getEmail());
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        user.setAccountType(AccountType.LOCAL);
        User savedUser = userRepository.save(user);

        Role role = findBaseRole(DEFAULT_ROLE);

        UserRole userRole = new UserRole();
        userRole.setUser(savedUser);
        userRole.setRole(role);
        userRoleRepository.save(userRole);

        return openSession(savedUser);
    }

    public com.uc.ms_security.dto.auth.LoginResultDTO login(LoginRequestDTO dto, String remoteAddress) {
        Long userId = userRepository.findPasswordRecoveryUserIdByEmail(dto.getEmail())
                .orElseThrow(this::invalidCredentials);
        User user = userRepository.findForPasswordRecoveryById(userId)
                .orElseThrow(this::invalidCredentials);

        if (!user.isEnabled() || user.getAccountType() != AccountType.LOCAL
                || user.getPassword() == null || !passwordEncoder.matches(dto.getPassword(), user.getPassword())) {
            throw invalidCredentials();
        }

        if (user.isTwoFactorEnabled()) return twoFactor.getObject().beginLogin(user, remoteAddress);
        return openSession(user);
    }

    /** Valida el token y devuelve el usuario con sus roles y permisos vigentes. */
    public AuthResponseDTO me(String token) {
        Session session = findValidSession(token);
        return buildResponse(
                session.getUser(),
                session.getToken(),
                session.getExpiration()
        );
    }

    public void logout(String token) {
        if (token == null || token.isBlank()) {
            return;
        }
        sessionRepository.delete(findValidSession(token));
    }

    AuthResponseDTO openSession(User user) {
        if (!user.isEnabled()) {
            throw new ApplicationException(ErrorCase.UNAUTHORIZED, "La cuenta no está habilitada");
        }
        Session session = new Session();

        session.setExpiration(LocalDateTime.now().plusHours(SESSION_HOURS).withNano(0));
        session.setToken(jwtService.issue(user.getId(), session.getExpiration().atZone(ZoneId.systemDefault()).toInstant()));
        session.setUser(user);
        Session saved = sessionRepository.save(session);

        return buildResponse(user, saved.getToken(), saved.getExpiration());
    }

    public Session findValidSession(String token) {
        if (token == null || token.isBlank()) {
            throw new ApplicationException(
                    ErrorCase.UNAUTHORIZED,
                    "Sesión no válida"
            );
        }

        Session session = sessionRepository.findByToken(token)
                .orElseThrow(() -> new ApplicationException(
                        ErrorCase.UNAUTHORIZED,
                        "Sesión no válida"
                ));

        if (!session.getExpiration().isAfter(LocalDateTime.now())) {
            throw new ApplicationException(
                    ErrorCase.UNAUTHORIZED,
                    "La sesión expiró, inicia sesión de nuevo"
            );
        }
        // Existing opaque sessions remain valid until their persisted expiration.
        // JWT sessions still require the original signature and claims validation.
        if (!token.matches("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")) {
            Claims claims = jwtService.verify(token);
            if (!session.getUser().getId().toString().equals(claims.getSubject())
                    || !session.getExpiration().atZone(ZoneId.systemDefault()).toInstant()
                            .equals(claims.getExpiration().toInstant())) {
                throw new ApplicationException(ErrorCase.UNAUTHORIZED, "Sesión no válida");
            }
        }
        return session;
    }

    private AuthResponseDTO buildResponse(
            User user,
            String token,
            LocalDateTime expiration) {

        List<Role> roles = userRoleRepository.findAllByUserId(user.getId())
                .stream()
            .map(userRole -> java.util.Objects.requireNonNull(userRole).getRole())
                .toList();

        List<Long> roleIds = roles.stream()
            .map(role -> java.util.Objects.requireNonNull(role).getId())
            .toList();

        Map<Long, PermissionResponseDTO> permissions = new LinkedHashMap<>();
        if (!roleIds.isEmpty()) {
            for (RolePermission rolePermission
                    : rolePermissionRepository.findAllByRoleIdIn(roleIds)) {
                permissions.putIfAbsent(
                        rolePermission.getPermission().getId(),
                        permissionMapper.toResponseDTO(rolePermission.getPermission())
                );
            }
        }

        List<RoleResponseDTO> roleDTOs = roleMapper.toResponseDTOList(roles);

        return new AuthResponseDTO(
                token,
                expiration,
                userMapper.toResponseDTO(user),
                roleDTOs,
                List.copyOf(permissions.values())
        );
    }

    private Role findBaseRole(String name) {
        return roleRepository.findByNameIgnoreCase(name)
                .orElseThrow(() -> new ApplicationException(
                        ErrorCase.INVALID_OPERATION,
                        "No existe el rol base '" + name + "'"
                ));
    }

    private ApplicationException invalidCredentials() {
        return new ApplicationException(
                ErrorCase.UNAUTHORIZED,
                "Correo o contraseña incorrectos"
        );
    }
}
