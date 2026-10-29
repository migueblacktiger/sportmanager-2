package com.uc.ms_security.repository;

import java.time.Instant;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import com.uc.ms_security.entity.TwoFactorChallenge;

public interface TwoFactorChallengeRepository extends JpaRepository<TwoFactorChallenge, String> {
    @Query("select c.user.id from TwoFactorChallenge c where c.id = :id")
    Optional<Long> findUserId(@Param("id") String id);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from TwoFactorChallenge c where c.id = :id")
    Optional<TwoFactorChallenge> findLocked(@Param("id") String id);
    @Modifying
    @Query("update TwoFactorChallenge c set c.consumedAt = :now where c.user.id = :userId and c.consumedAt is null")
    int consumeAll(@Param("userId") Long userId, @Param("now") Instant now);
}
