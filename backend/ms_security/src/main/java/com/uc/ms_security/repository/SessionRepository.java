package com.uc.ms_security.repository;

import com.uc.ms_security.entity.Session;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SessionRepository
        extends JpaRepository<Session, Long> {

    List<Session> findAllByUserId(Long userId);

    Optional<Session> findByIdAndUserId(
            Long sessionId,
            Long userId
    );

    @EntityGraph(attributePaths = "user")
    Optional<Session> findByToken(String token);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("delete from Session s where s.user.id = :userId")
    int deleteAllForPasswordRecovery(@org.springframework.data.repository.query.Param("userId") Long userId);
}
