package com.uc.ms_security.service;

import java.nio.CharBuffer;
import java.util.regex.Pattern;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.uc.ms_security.entity.Role;
import com.uc.ms_security.entity.User;
import com.uc.ms_security.entity.UserRole;
import com.uc.ms_security.exception.ApplicationException;
import com.uc.ms_security.exception.ErrorCase;
import com.uc.ms_security.repository.RoleRepository;
import com.uc.ms_security.repository.UserRepository;
import com.uc.ms_security.repository.UserRoleRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AdminProvisioningService {

    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public void provision(String name, String email, char[] password) {
        String normalizedName = name == null ? "" : name.trim();
        String normalizedEmail = email == null ? "" : email.trim();
        if (normalizedName.length() < 2 || normalizedName.length() > 100) {
            throw new ApplicationException(
                    ErrorCase.INVALID_OPERATION,
                    "El nombre debe tener entre 2 y 100 caracteres"
            );
        }
        if (!EMAIL_PATTERN.matcher(normalizedEmail).matches()) {
            throw new ApplicationException(
                    ErrorCase.INVALID_OPERATION,
                    "El correo electrónico no tiene un formato válido"
            );
        }
        if (password == null || password.length < 8) {
            throw new ApplicationException(
                    ErrorCase.INVALID_OPERATION,
                    "La contraseña debe tener mínimo 8 caracteres"
            );
        }
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new ApplicationException(
                    ErrorCase.ALREADY_EXISTS,
                    "Ya existe un usuario con este correo"
            );
        }

        Role adminRole = roleRepository.findByNameIgnoreCaseForUpdate(AuthService.ADMIN_ROLE)
                .orElseThrow(() -> new ApplicationException(
                        ErrorCase.INVALID_OPERATION,
                        "No existe el rol Administrador; inicializa primero los roles base"
                ));
        if (userRoleRepository.existsByRoleId(adminRole.getId())) {
            throw new ApplicationException(
                    ErrorCase.INVALID_OPERATION,
                    "Ya existe una cuenta asociada al rol Administrador"
            );
        }

        User user = new User();
        user.setName(normalizedName);
        user.setEmail(normalizedEmail);
        user.setPassword(passwordEncoder.encode(CharBuffer.wrap(password)));
        User savedUser = userRepository.save(user);

        UserRole userRole = new UserRole();
        userRole.setUser(savedUser);
        userRole.setRole(adminRole);
        userRoleRepository.save(userRole);
    }
}
