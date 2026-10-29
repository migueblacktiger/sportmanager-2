package com.uc.ms_security.security;

public record VerifiedFirebaseIdentity(
        String firebaseUid,
        String provider,
        String email,
        boolean emailVerified,
        String displayName) {
}
