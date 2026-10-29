package com.uc.ms_security.repository;

import java.time.LocalDateTime;
import java.util.Optional;

import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import com.uc.ms_security.entity.PasswordResetRequest;
import jakarta.persistence.LockModeType;

public interface PasswordResetRequestRepository extends JpaRepository<PasswordResetRequest, Long> {
    @Query("select r.user.id from PasswordResetRequest r where r.tokenHash = :hash")
    Optional<Long> findUserIdByTokenHash(@Param("hash") String hash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<PasswordResetRequest> findByTokenHash(String tokenHash);

    @Modifying
    @Query("update PasswordResetRequest r set r.usedAt = :now where r.user.id = :userId and r.usedAt is null")
    int consumeAllForUser(@Param("userId") Long userId, @Param("now") LocalDateTime now);
}
