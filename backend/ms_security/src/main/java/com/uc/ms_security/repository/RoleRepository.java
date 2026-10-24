package com.uc.ms_security.repository;

import com.uc.ms_security.entity.Role;
import java.util.Optional;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RoleRepository extends JpaRepository<Role, Long> {

    boolean existsByNameIgnoreCase(String name);

    Optional<Role> findByNameIgnoreCase(String name);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select role from Role role where lower(role.name) = lower(:name)")
    Optional<Role> findByNameIgnoreCaseForUpdate(@Param("name") String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
}