package com.uc.ms_security.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;

import com.uc.ms_security.dto.auth.AuthResponseDTO;
import com.uc.ms_security.entity.AccountType;
import com.uc.ms_security.entity.ExternalIdentity;
import com.uc.ms_security.entity.Role;
import com.uc.ms_security.entity.User;
import com.uc.ms_security.exception.ApplicationException;
import com.uc.ms_security.repository.ExternalIdentityRepository;
import com.uc.ms_security.repository.RoleRepository;
import com.uc.ms_security.repository.UserRepository;
import com.uc.ms_security.repository.UserRoleRepository;
import com.uc.ms_security.security.FirebaseIdTokenVerifier;
import com.uc.ms_security.security.VerifiedFirebaseIdentity;

@ExtendWith(MockitoExtension.class)
class GoogleOAuthLoginServiceTest {
    @Mock private ObjectProvider<FirebaseIdTokenVerifier> verifierProvider;
    @Mock private FirebaseIdTokenVerifier verifier;
    @Mock private ExternalIdentityRepository externalIdentityRepository;
    @Mock private UserRepository userRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private UserRoleRepository userRoleRepository;
    @Mock private AuthService authService;
    private GoogleOAuthLoginService service;

    @BeforeEach
    void setUp() {
        service = new GoogleOAuthLoginService(verifierProvider, externalIdentityRepository,
                userRepository, roleRepository, userRoleRepository, authService, "sportmanager");
    }

    @Test
    void createsGoogleUserWithDefaultRoleAndInternalSession() {
        VerifiedFirebaseIdentity identity = identity("google.com", "new@example.com", true);
        Role role = new Role(); role.setName(AuthService.DEFAULT_ROLE);
        AuthResponseDTO response = org.mockito.Mockito.mock(AuthResponseDTO.class);
        when(verifierProvider.getIfAvailable()).thenReturn(verifier);
        when(verifier.verify("id-token")).thenReturn(identity);
        when(externalIdentityRepository.findByFirebaseProjectIdAndProviderAndFirebaseUid(
                "sportmanager", "google.com", "firebase-uid")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("new@example.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(call -> {
            User user = call.getArgument(0); user.setId(10L); return user;
        });
        when(roleRepository.findByNameIgnoreCase(AuthService.DEFAULT_ROLE)).thenReturn(Optional.of(role));
        when(authService.openSession(any(User.class))).thenReturn(response);

        assertEquals(response, service.login("id-token"));
        org.mockito.ArgumentCaptor<User> users = org.mockito.ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(users.capture());
        assertEquals(AccountType.EXTERNAL, users.getValue().getAccountType());
        assertEquals("new@example.com", users.getValue().getEmail());
        assertEquals(null, users.getValue().getPassword());
        verify(userRoleRepository).save(any());
        verify(externalIdentityRepository).saveAndFlush(any());
    }

    @Test
    void reusesExistingExternalIdentity() {
        User user = new User(); user.setId(9L); user.setEnabled(true);
        ExternalIdentity externalIdentity = new ExternalIdentity(); externalIdentity.setUser(user);
        AuthResponseDTO response = org.mockito.Mockito.mock(AuthResponseDTO.class);
        when(verifierProvider.getIfAvailable()).thenReturn(verifier);
        when(verifier.verify("id-token")).thenReturn(identity("google.com", "old@example.com", true));
        when(externalIdentityRepository.findByFirebaseProjectIdAndProviderAndFirebaseUid(
                "sportmanager", "google.com", "firebase-uid")).thenReturn(Optional.of(externalIdentity));
        when(authService.openSession(user)).thenReturn(response);

        assertEquals(response, service.login("id-token"));
        verify(userRepository, never()).save(any());
        verify(authService).openSession(user);
    }

    @Test
    void rejectsTraditionalEmailWrongProviderUnverifiedEmailAndDisabledUser() {
        when(verifierProvider.getIfAvailable()).thenReturn(verifier);
        when(verifier.verify("local-email")).thenReturn(identity("google.com", "local@example.com", true));
        User local = new User(); local.setAccountType(AccountType.LOCAL);
        when(externalIdentityRepository.findByFirebaseProjectIdAndProviderAndFirebaseUid(
                "sportmanager", "google.com", "firebase-uid")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("local@example.com")).thenReturn(Optional.of(local));
        assertThrows(ApplicationException.class, () -> service.login("local-email"));

        when(verifier.verify("other-provider")).thenReturn(identity("github.com", "x@example.com", true));
        assertThrows(ApplicationException.class, () -> service.login("other-provider"));
        when(verifier.verify("unverified")).thenReturn(identity("google.com", "x@example.com", false));
        assertThrows(ApplicationException.class, () -> service.login("unverified"));

        User disabled = new User(); disabled.setEnabled(false);
        ExternalIdentity externalIdentity = new ExternalIdentity(); externalIdentity.setUser(disabled);
        when(verifier.verify("disabled")).thenReturn(identity("google.com", "disabled@example.com", true));
        when(externalIdentityRepository.findByFirebaseProjectIdAndProviderAndFirebaseUid(
                "sportmanager", "google.com", "firebase-uid")).thenReturn(Optional.of(externalIdentity));
        assertThrows(ApplicationException.class, () -> service.login("disabled"));
    }

    @Test
    void rejectsWhenFirebaseIsNotConfigured() {
        when(verifierProvider.getIfAvailable()).thenReturn(null);
        assertThrows(ApplicationException.class, () -> service.login("id-token"));
    }

    private static VerifiedFirebaseIdentity identity(String provider, String email, boolean verified) {
        return new VerifiedFirebaseIdentity("firebase-uid", provider, email, verified, "Google User");
    }
}
