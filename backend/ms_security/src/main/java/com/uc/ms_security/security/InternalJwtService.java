package com.uc.ms_security.security;

import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import com.uc.ms_security.exception.ApplicationException;
import com.uc.ms_security.exception.ErrorCase;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.JwtParser;
import io.jsonwebtoken.Jwts;

/** Internal tokens only. Never logs tokens or propagates parser diagnostics. */
@Service
public class InternalJwtService {
    private final SecretKey key;
    private final String issuer;
    private final String audience;
    private final JwtParser parser;

    public InternalJwtService(@Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.issuer}") String issuer,
            @Value("${app.jwt.audience}") String audience) {
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(secret);
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("JWT_SECRET must be Base64 encoded");
        }
        if (bytes.length < 32 || issuer.isBlank() || audience.isBlank()
                || issuer.length() > 64 || audience.length() > 64) {
            throw new IllegalStateException("JWT requires a 256-bit key and issuer/audience of 1-64 characters");
        }
        key = new SecretKeySpec(bytes, "HmacSHA256");
        this.issuer = issuer;
        this.audience = audience;
        parser = Jwts.parser().verifyWith(key).requireIssuer(issuer).requireAudience(audience)
                .sig().clear().add(Jwts.SIG.HS256).and().build();
    }

    public String issue(Long userId, Instant expiration) {
        String token = Jwts.builder().subject(userId.toString()).id(UUID.randomUUID().toString())
                .issuer(issuer).audience().add(audience).and()
                .issuedAt(Date.from(Instant.now())).expiration(Date.from(expiration))
                .signWith(key, Jwts.SIG.HS256).compact();
        if (token.length() > 500) {
            throw new IllegalStateException("JWT exceeds session token capacity");
        }
        return token;
    }

    public Claims verify(String token) {
        try {
            if (token == null || token.isBlank() || token.length() > 500) throw invalid();
            Claims claims = parser.parseSignedClaims(token).getPayload();
            if (claims.getExpiration() == null || claims.getIssuedAt() == null
                    || claims.getSubject() == null || claims.getId() == null
                    || !claims.getSubject().matches("[1-9][0-9]*")
                    || claims.getIssuedAt().toInstant().isAfter(Instant.now())
                    || !claims.getExpiration().after(claims.getIssuedAt())) throw invalid();
            Long.parseLong(claims.getSubject());
            UUID.fromString(claims.getId());
            return claims;
        } catch (JwtException | IllegalArgumentException e) {
            throw invalid();
        }
    }

    private ApplicationException invalid() {
        return new ApplicationException(ErrorCase.UNAUTHORIZED, "Sesión no válida");
    }
}
