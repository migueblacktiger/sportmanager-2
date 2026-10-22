package com.uc.ms_security.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.uc.ms_security.entity.RolePermission;

public interface RolePermissionRepository
        extends JpaRepository<RolePermission, Long> {

    boolean existsByRoleIdAndPermissionId(Long roleId, Long permissionId);

    boolean existsByPermissionId(Long permissionId);

    @Override
    @EntityGraph(attributePaths = {"role", "permission"})
    List<RolePermission> findAll();

    @EntityGraph(attributePaths = {"role", "permission"})
    List<RolePermission> findAllByRoleId(Long roleId);

    @EntityGraph(attributePaths = {"role", "permission"})
    List<RolePermission> findAllByRoleIdIn(Collection<Long> roleIds);

    @EntityGraph(attributePaths = {"role", "permission"})
    Optional<RolePermission> findByRoleIdAndPermissionId(
            Long roleId,
            Long permissionId
    );

    void deleteAllByRoleId(Long roleId);
}
