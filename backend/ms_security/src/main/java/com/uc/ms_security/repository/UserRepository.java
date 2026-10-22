package com.uc.ms_security.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.uc.ms_security.entity.User;

public interface UserRepository extends JpaRepository<User, Long> {

    boolean existsByEmail(String email);

    Optional<User> findByEmail(String email);

    /*
     * User.profile es el lado inverso (mappedBy) de un @OneToOne opcional:
     * Hibernate no puede dejarlo realmente LAZY y lanzaría un SELECT por usuario (N+1).
     * Con el EntityGraph el listado trae los perfiles en una sola consulta.
     */
    @Override
    @EntityGraph(attributePaths = {"profile"})
    List<User> findAll();

    boolean existsByEmailAndIdNot(
            String email,
            Long id
    );

    @EntityGraph(attributePaths = {"profile"})
    Optional<User> findWithProfileById(Long id);

    @EntityGraph(attributePaths = {"sessions"})
    Optional<User> findWithSessionsById(Long id);

    @EntityGraph(
            attributePaths = {
                    "userRoles",
                    "userRoles.role"
            }
    )
    Optional<User> findWithRolesById(Long id);
}

