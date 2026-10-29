package com.uc.ms_security.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.uc.ms_security.entity.ExternalIdentity;

public interface ExternalIdentityRepository extends JpaRepository<ExternalIdentity, Long> {
    @EntityGraph(attributePaths = "user")
    Optional<ExternalIdentity> findByFirebaseProjectIdAndProviderAndFirebaseUid(
            String firebaseProjectId, String provider, String firebaseUid);
}
