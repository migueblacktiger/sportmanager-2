package com.uc.ms_security.security;

import static org.junit.jupiter.api.Assertions.*;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import com.uc.ms_security.exception.ApplicationException;
import io.jsonwebtoken.Jwts;

class InternalJwtServiceTest {
    private final byte[] bytes = new byte[64];
    private final InternalJwtService service = new InternalJwtService(
            Base64.getEncoder().encodeToString(bytes), "sportmanager", "sportmanager-api");

    private String token(String issuer, String audience, Instant expiration, boolean wrongKey, boolean wrongAlgorithm) {
        byte[] signing = bytes.clone();
        if (wrongKey) signing[0] = 1;
        return Jwts.builder().subject("1").id(UUID.randomUUID().toString())
                .issuer(issuer).audience().add(audience).and()
                .issuedAt(Date.from(Instant.now().minusSeconds(60))).expiration(Date.from(expiration))
                .signWith(new SecretKeySpec(signing, wrongAlgorithm ? "HmacSHA512" : "HmacSHA256"),
                        wrongAlgorithm ? Jwts.SIG.HS512 : Jwts.SIG.HS256).compact();
    }

    @Test void acceptsIssuedTokenAndRequiredClaims() {
        var claims = service.verify(service.issue(42L, Instant.now().plusSeconds(28800)));
        assertEquals("42", claims.getSubject());
        assertNotNull(claims.getId());
        assertNotNull(claims.getIssuedAt());
        assertNotNull(claims.getExpiration());
    }
    @Test void rejectsMissingMalformedAndUnsigned() {
        for (String value : new String[]{null, "", "opaque-uuid", "eyJhbGciOiJub25lIn0.eyJzdWIiOiIxIn0."})
            assertThrows(ApplicationException.class, () -> service.verify(value));
    }
    @Test void rejectsTampering() {
        String value = service.issue(1L, Instant.now().plusSeconds(100));
        int start = value.lastIndexOf('.') + 1;
        String altered = value.substring(0, start) + (value.charAt(start) == 'A' ? 'B' : 'A') + value.substring(start + 1);
        assertThrows(ApplicationException.class, () -> service.verify(altered));
    }
    @Test void rejectsInvalidSignatureIssuerAudienceExpiryAndAlgorithm() {
        Instant future = Instant.now().plusSeconds(100);
        for (String value : new String[]{
                token("sportmanager", "sportmanager-api", future, true, false),
                token("https://securetoken.google.com/foreign-project", "sportmanager-api", future, false, false),
                token("sportmanager", "other", future, false, false),
                token("sportmanager", "sportmanager-api", Instant.now().minusSeconds(1), false, false),
                token("sportmanager", "sportmanager-api", future, false, true)})
            assertThrows(ApplicationException.class, () -> service.verify(value));
    }
    @Test void rejectsMissingClaimsAndWeakConfiguration() {
        String value = Jwts.builder().subject("1").issuer("sportmanager").audience().add("sportmanager-api").and()
                .signWith(new SecretKeySpec(bytes, "HmacSHA256"), Jwts.SIG.HS256).compact();
        assertThrows(ApplicationException.class, () -> service.verify(value));
        assertThrows(IllegalStateException.class, () -> new InternalJwtService("AA==", "issuer", "audience"));
        assertThrows(IllegalStateException.class, () -> new InternalJwtService("!", "issuer", "audience"));
    }
}
