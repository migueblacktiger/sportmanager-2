package com.uc.ms_security.service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.uc.ms_security.dto.role_permission.AssignPermissionRequestDTO;
import com.uc.ms_security.dto.role_permission.ReplaceRolePermissionsRequestDTO;
import com.uc.ms_security.dto.role_permission.RolePermissionResponseDTO;
import com.uc.ms_security.entity.Permission;
import com.uc.ms_security.entity.Role;
import com.uc.ms_security.entity.RolePermission;
import com.uc.ms_security.exception.ApplicationException;
import com.uc.ms_security.exception.ErrorCase;
import com.uc.ms_security.mapper.RolePermissionMapper;
import com.uc.ms_security.repository.PermissionRepository;
import com.uc.ms_security.repository.RolePermissionRepository;
import com.uc.ms_security.repository.RoleRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RolePermissionService {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final RolePermissionMapper rolePermissionMapper;

    @Transactional
    public RolePermissionResponseDTO assign(AssignPermissionRequestDTO dto) {
        Role role = findRole(dto.getRoleId());
        Permission permission = findPermission(dto.getPermissionId());

        if (rolePermissionRepository.existsByRoleIdAndPermissionId(
                dto.getRoleId(), dto.getPermissionId())) {
            throw new ApplicationException(
                    ErrorCase.ALREADY_EXISTS,
                    "El rol ya tiene asignado ese permiso"
            );
        }

        RolePermission rolePermission = new RolePermission();
        rolePermission.setRole(role);
        rolePermission.setPermission(permission);

        return rolePermissionMapper.toResponseDTO(
                rolePermissionRepository.save(rolePermission)
        );
    }

    @Transactional(readOnly = true)
    public List<RolePermissionResponseDTO> findAll() {
        return rolePermissionMapper.toResponseDTOList(
                rolePermissionRepository.findAll()
        );
    }

    @Transactional(readOnly = true)
    public List<RolePermissionResponseDTO> findByRoleId(Long roleId) {
        if (!roleRepository.existsById(roleId)) {
            throw new ApplicationException(
                    ErrorCase.NOT_FOUND,
                    "Rol no encontrado"
            );
        }
        return rolePermissionMapper.toResponseDTOList(
                rolePermissionRepository.findAllByRoleId(roleId)
        );
    }

    /**
     * Deja el rol con exactamente los permisos indicados: agrega los que faltan
     * y retira los que sobran, todo en una sola transacción.
     */
    @Transactional
    public List<RolePermissionResponseDTO> replaceForRole(
            Long roleId,
            ReplaceRolePermissionsRequestDTO dto) {

        Role role = findRole(roleId);

        Set<Long> requested = new HashSet<>(dto.getPermissionIds());
        List<Permission> permissions = permissionRepository.findAllById(requested);

        if (permissions.size() != requested.size()) {
            throw new ApplicationException(
                    ErrorCase.NOT_FOUND,
                    "Alguno de los permisos indicados no existe"
            );
        }

        List<RolePermission> current = rolePermissionRepository.findAllByRoleId(roleId);
        Set<Long> currentIds = new HashSet<>();

        for (RolePermission rolePermission : current) {
            Long permissionId = rolePermission.getPermission().getId();
            if (requested.contains(permissionId)) {
                currentIds.add(permissionId);
            } else {
                rolePermissionRepository.delete(rolePermission);
            }
        }

        for (Permission permission : permissions) {
            if (!currentIds.contains(permission.getId())) {
                RolePermission rolePermission = new RolePermission();
                rolePermission.setRole(role);
                rolePermission.setPermission(permission);
                rolePermissionRepository.save(rolePermission);
            }
        }

        rolePermissionRepository.flush();

        return rolePermissionMapper.toResponseDTOList(
                rolePermissionRepository.findAllByRoleId(roleId)
        );
    }

    @Transactional
    public void delete(Long roleId, Long permissionId) {
        RolePermission rolePermission = rolePermissionRepository
                .findByRoleIdAndPermissionId(roleId, permissionId)
                .orElseThrow(() -> new ApplicationException(
                        ErrorCase.NOT_FOUND,
                        "Asignación de permiso no encontrada"
                ));
        rolePermissionRepository.delete(rolePermission);
    }

    private Role findRole(Long roleId) {
        return roleRepository.findById(roleId)
                .orElseThrow(() -> new ApplicationException(
                        ErrorCase.NOT_FOUND,
                        "Rol no encontrado"
                ));
    }

    private Permission findPermission(Long permissionId) {
        return permissionRepository.findById(permissionId)
                .orElseThrow(() -> new ApplicationException(
                        ErrorCase.NOT_FOUND,
                        "Permiso no encontrado"
                ));
    }
}
