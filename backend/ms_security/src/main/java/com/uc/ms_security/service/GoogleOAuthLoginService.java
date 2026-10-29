package com.uc.ms_security.service;

import java.util.Locale;

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

/** Creates/reuses only Google identities and exchanges them for an internal session. */
@Service
@Transactional
public class GoogleOAuthLoginService {
    private static final String GOOGLE_PROVIDER = "google.com";

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
        validateGoogleIdentity(identity);

        User user = externalIdentityRepository
                .findByFirebaseProjectIdAndProviderAndFirebaseUid(
                        projectId, GOOGLE_PROVIDER, identity.firebaseUid())
                .map(ExternalIdentity::getUser)
                .orElseGet(() -> createUser(identity));

        if (!user.isEnabled()) {
            throw new ApplicationException(ErrorCase.UNAUTHORIZED, "La cuenta no está habilitada");
        }
        return authService.openSession(user);
    }

    private User createUser(VerifiedFirebaseIdentity identity) {
        String email = identity.email().trim().toLowerCase(Locale.ROOT);
        userRepository.findByEmail(email).ifPresent(user -> {
            throw new ApplicationException(ErrorCase.INVALID_OPERATION,
                    "El correo ya está asociado a una cuenta de SportManager");
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
        externalIdentity.setProvider(GOOGLE_PROVIDER);
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

    private static void validateGoogleIdentity(VerifiedFirebaseIdentity identity) {
        if (!GOOGLE_PROVIDER.equals(identity.provider()) || identity.firebaseUid() == null
                || identity.firebaseUid().isBlank() || identity.email() == null
                || identity.email().isBlank() || !identity.emailVerified()) {
            throw new ApplicationException(ErrorCase.UNAUTHORIZED,
                    "La identidad de Google no contiene información verificada suficiente");
        }
        String email = identity.email().trim();
        if (email.indexOf('@') <= 0 || email.endsWith("@")) {
            throw new ApplicationException(ErrorCase.UNAUTHORIZED,
                    "La identidad de Google no contiene información verificada suficiente");
        }
    }

    private static String displayName(VerifiedFirebaseIdentity identity) {
        String name = identity.displayName();
        if (name == null || name.isBlank()) name = identity.email().substring(0, identity.email().indexOf('@'));
        return name.trim().substring(0, Math.min(name.trim().length(), 100));
    }
}
