package com.uc.ms_security.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.stereotype.Service;

import com.google.firebase.FirebaseApp;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.uc.ms_security.exception.ApplicationException;
import com.uc.ms_security.exception.ErrorCase;

/**
 * Verifies Firebase identity tokens only for the future OAuth exchange endpoint.
 * It is never used by the internal Bearer-token authorization interceptor.
 */
@Service
@ConditionalOnBean(FirebaseApp.class)
public class FirebaseIdTokenVerifier {

    private final FirebaseAuth firebaseAuth;
    private final String projectId;

    public FirebaseIdTokenVerifier(FirebaseApp firebaseApp,
            @Value("${app.firebase.project-id}") String projectId) {
        this.firebaseAuth = FirebaseAuth.getInstance(firebaseApp);
        this.projectId = projectId;
    }

    public VerifiedFirebaseIdentity verify(String idToken) {
        if (idToken == null || idToken.isBlank()) {
            throw invalidToken();
        }
        try {
            // Firebase Admin validates signature and expiry; true also checks revocation.
            var token = firebaseAuth.verifyIdToken(idToken, true);
            if (!projectId.equals(token.getClaims().get("aud"))
                    || !("https://securetoken.google.com/" + projectId).equals(token.getIssuer())) {
                throw invalidToken();
            }
            Object firebase = token.getClaims().get("firebase");
            Object provider = firebase instanceof java.util.Map<?, ?> claims
                    ? claims.get("sign_in_provider") : null;
            return new VerifiedFirebaseIdentity(
                    token.getUid(),
                    provider instanceof String value ? value : null,
                    token.getEmail(),
                    token.isEmailVerified(),
                    token.getName()
            );
        } catch (FirebaseAuthException exception) {
            throw invalidToken();
        }
    }

    private ApplicationException invalidToken() {
        return new ApplicationException(ErrorCase.UNAUTHORIZED, "Token de identidad externo no válido");
    }
}
