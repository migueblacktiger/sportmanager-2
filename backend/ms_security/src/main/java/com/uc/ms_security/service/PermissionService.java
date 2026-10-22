package com.uc.ms_security.service;

import com.uc.ms_security.dto.permission.PermissionRequestDTO;
import com.uc.ms_security.dto.permission.PermissionResponseDTO;
import com.uc.ms_security.entity.Permission;
import com.uc.ms_security.exception.ApplicationException;
import com.uc.ms_security.exception.ErrorCase;
import com.uc.ms_security.mapper.PermissionMapper;
import com.uc.ms_security.repository.PermissionRepository;
import com.uc.ms_security.repository.RolePermissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class PermissionService {

    private final PermissionRepository permissionRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final PermissionMapper permissionMapper;

    public PermissionResponseDTO create(PermissionRequestDTO dto) {
        String method = dto.getMethod().toUpperCase();
        if (permissionRepository.existsByUrlAndMethod(dto.getUrl(), method)) {
            throw new ApplicationException(
                    ErrorCase.ALREADY_EXISTS,
                    "Ya existe un permiso para " + method + " " + dto.getUrl()
            );
        }
        Permission permission = permissionMapper.toEntity(dto);
        Permission savedPermission = permissionRepository.save(permission);
        return permissionMapper.toResponseDTO(savedPermission);
    }

    public List<PermissionResponseDTO> findAll() {
        List<Permission> permissions = permissionRepository.findAll();
        return permissionMapper.toResponseDTOList(permissions);
    }

    public PermissionResponseDTO findById(Long id) {
        Permission permission = findEntityById(id);
        return permissionMapper.toResponseDTO(permission);
    }

    public PermissionResponseDTO update(Long id, PermissionRequestDTO dto) {
        Permission permission = findEntityById(id);
        String method = dto.getMethod().toUpperCase();
        if (permissionRepository.existsByUrlAndMethodAndIdNot(dto.getUrl(), method, id)) {
            throw new ApplicationException(
                    ErrorCase.ALREADY_EXISTS,
                    "Ya existe otro permiso para " + method + " " + dto.getUrl()
            );
        }
        permissionMapper.updateEntity(dto, permission);
        Permission updatedPermission = permissionRepository.save(permission);
        return permissionMapper.toResponseDTO(updatedPermission);
    }

    public void delete(Long id) {
        Permission permission = findEntityById(id);
        if (rolePermissionRepository.existsByPermissionId(id)) {
            throw new ApplicationException(
                    ErrorCase.INVALID_OPERATION,
                    "No se puede eliminar un permiso que está asignado a un rol"
            );
        }
        permissionRepository.delete(permission);
    }

    private Permission findEntityById(Long id) {
        return permissionRepository.findById(id)
                .orElseThrow(() -> new ApplicationException(
                        ErrorCase.NOT_FOUND,
                        "Permiso no encontrado con id: " + id
                ));
    }
}