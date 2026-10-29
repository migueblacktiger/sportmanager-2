package com.uc.ms_security.service;

import java.util.Locale;
import java.util.Set;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.uc.ms_security.dto.auth.AuthResponseDTO;
import com.uc.ms_security.entity.AccountType;
import com.uc.ms_security.entity.ExternalIdentity;
import com.uc.ms_security.entity.Role;
import com.uc.ms_security.entity.User;
import com.uc.ms_security.entity.UserRole;
import com.uc.ms_security.exception.ApplicationException;
import com.uc.ms_security.exception.ErrorCase;
import com.uc.ms_security.repository.ExternalIdentityRepository;
import com.uc.ms_security.repository.RoleRepository;
import com.uc.ms_security.repository.UserRepository;
import com.uc.ms_security.repository.UserRoleRepository;
import com.uc.ms_security.security.FirebaseIdTokenVerifier;
import com.uc.ms_security.security.VerifiedFirebaseIdentity;

/** Exchanges verified Firebase provider identities for an internal session. */
@Service
@Transactional
public class GoogleOAuthLoginService {
    private static final Set<String> SUPPORTED_PROVIDERS =
            Set.of("google.com", "github.com", "microsoft.com");

    private final ObjectProvider<FirebaseIdTokenVerifier> firebaseIdTokenVerifier;
    private final ExternalIdentityRepository externalIdentityRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final AuthService authService;
    private final String projectId;

    public GoogleOAuthLoginService(ObjectProvider<FirebaseIdTokenVerifier> firebaseIdTokenVerifier,
            ExternalIdentityRepository externalIdentityRepository, UserRepository userRepository,
            RoleRepository roleRepository, UserRoleRepository userRoleRepository,
            AuthService authService,
            @org.springframework.beans.factory.annotation.Value("${app.firebase.project-id}") String projectId) {
        this.firebaseIdTokenVerifier = firebaseIdTokenVerifier;
        this.externalIdentityRepository = externalIdentityRepository;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
        this.authService = authService;
        this.projectId = projectId;
    }

    public AuthResponseDTO login(String idToken) {
        FirebaseIdTokenVerifier verifier = firebaseIdTokenVerifier.getIfAvailable();
        if (verifier == null) {
            throw new ApplicationException(ErrorCase.INVALID_OPERATION,
                    "La autenticación externa no está configurada");
        }
        VerifiedFirebaseIdentity identity = verifier.verify(idToken);
        validateIdentity(identity);

        User user = externalIdentityRepository
                .findByFirebaseProjectIdAndProviderAndFirebaseUid(
                        projectId, identity.provider(), identity.firebaseUid())
                .map(ExternalIdentity::getUser)
                .orElseGet(() -> createUser(identity));

        if (user.getAccountType() != AccountType.EXTERNAL) {
            throw new ApplicationException(ErrorCase.INVALID_OPERATION,
                    "La identidad externa no puede acceder a una cuenta local");
        }
        if (!user.isEnabled()) {
            throw new ApplicationException(ErrorCase.UNAUTHORIZED, "La cuenta no está habilitada");
        }
        return authService.openSession(user);
    }

    private User createUser(VerifiedFirebaseIdentity identity) {
        String email = identity.email().trim().toLowerCase(Locale.ROOT);
        userRepository.findByEmail(email).ifPresent(user -> {
            throw new ApplicationException(ErrorCase.INVALID_OPERATION,
                    user.getAccountType() == AccountType.LOCAL
                            ? "El correo ya está asociado a una cuenta local. Inicia sesión con contraseña."
                            : "El correo ya está asociado a otra identidad externa. Usa el proveedor original.");
        });

        User user = new User();
        user.setName(displayName(identity));
        user.setEmail(email);
        user.setPassword(null);
        user.setAccountType(AccountType.EXTERNAL);
        user.setEnabled(true);
        User savedUser = userRepository.save(user);

        Role role = roleRepository.findByNameIgnoreCase(AuthService.DEFAULT_ROLE)
                .orElseThrow(() -> new ApplicationException(ErrorCase.INVALID_OPERATION,
                        "No existe el rol base '" + AuthService.DEFAULT_ROLE + "'"));
        UserRole userRole = new UserRole();
        userRole.setUser(savedUser);
        userRole.setRole(role);
        userRoleRepository.save(userRole);

        ExternalIdentity externalIdentity = new ExternalIdentity();
        externalIdentity.setUser(savedUser);
        externalIdentity.setFirebaseProjectId(projectId);
        externalIdentity.setProvider(identity.provider());
        externalIdentity.setFirebaseUid(identity.firebaseUid());
        try {
            externalIdentityRepository.saveAndFlush(externalIdentity);
        } catch (DataIntegrityViolationException exception) {
            // The unique constraint is the concurrency guard; do not create duplicate identities.
            throw new ApplicationException(ErrorCase.ALREADY_EXISTS,
                    "La identidad externa ya está siendo registrada");
        }
        return savedUser;
    }

    private static void validateIdentity(VerifiedFirebaseIdentity identity) {
        if (identity.provider() == null || !SUPPORTED_PROVIDERS.contains(identity.provider())
                || identity.firebaseUid() == null || identity.firebaseUid().isBlank()) {
            throw new ApplicationException(ErrorCase.UNAUTHORIZED,
                    "El proveedor OAuth no está admitido o su identidad no es válida");
        }
        if (identity.email() == null || identity.email().isBlank()) {
            throw new ApplicationException(ErrorCase.UNAUTHORIZED,
                    "Firebase no proporcionó una dirección de correo verificable. No se puede completar el acceso.");
        }
        if (!identity.emailVerified()) {
            throw new ApplicationException(ErrorCase.UNAUTHORIZED,
                    "Verifica tu correo con Firebase y confirma la verificación antes de completar el acceso.");
        }
        String email = identity.email().trim();
        if (email.indexOf('@') <= 0 || email.endsWith("@")) {
            throw new ApplicationException(ErrorCase.UNAUTHORIZED,
                    "El proveedor no entregó un correo válido");
        }
    }

    private static String displayName(VerifiedFirebaseIdentity identity) {
        String name = identity.displayName();
        if (name == null || name.isBlank()) name = identity.email().substring(0, identity.email().indexOf('@'));
        return name.trim().substring(0, Math.min(name.trim().length(), 100));
    }
}
