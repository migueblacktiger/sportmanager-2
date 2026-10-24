package com.uc.ms_security.config;

import java.util.ArrayList;
import java.util.List;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.uc.ms_security.entity.Permission;
import com.uc.ms_security.entity.Role;
import com.uc.ms_security.repository.PermissionRepository;
import com.uc.ms_security.repository.RoleRepository;
import com.uc.ms_security.service.AuthService;

import lombok.RequiredArgsConstructor;

/**
 * Datos base del módulo de seguridad. Es idempotente: solo crea lo que falta.
 *  - Catálogo de permisos (uno por endpoint de la API).
 *  - Roles base "Administrador" y "Usuario" (los usa el registro).
 */
@Component
@RequiredArgsConstructor
@Order(1)
public class DataInitializer implements ApplicationRunner {

    private final PermissionRepository permissionRepository;
    private final RoleRepository roleRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedPermissions();
        seedRole(
                AuthService.ADMIN_ROLE,
                "Control total de la plataforma"
        );
        seedRole(
                AuthService.DEFAULT_ROLE,
                "Usuario registrado con acceso básico"
        );
    }

    private void seedPermissions() {
        List<String[]> catalog = new ArrayList<>();

        crud(catalog, "User", "/api/users");
        crud(catalog, "Profile", "/api/profiles");
        crud(catalog, "Role", "/api/roles");
        crud(catalog, "Permission", "/api/permissions");

        catalog.add(new String[]{"User", "/api/users/{id}/detail", "GET"});
        catalog.add(new String[]{"User", "/api/users/{id}/detail-with-sessions", "GET"});
        catalog.add(new String[]{"User", "/api/users/{id}/detail-with-roles", "GET"});

        catalog.add(new String[]{"UserRole", "/api/user-roles", "GET"});
        catalog.add(new String[]{"UserRole", "/api/user-roles/users/{userId}", "GET"});
        catalog.add(new String[]{"UserRole", "/api/user-roles/roles/{roleId}", "GET"});
        catalog.add(new String[]{"UserRole", "/api/user-roles", "POST"});
        catalog.add(new String[]{"UserRole", "/api/user-roles/{userId}/{roleId}", "DELETE"});

        catalog.add(new String[]{"RolePermission", "/api/role-permissions", "GET"});
        catalog.add(new String[]{"RolePermission", "/api/role-permissions/roles/{roleId}", "GET"});
        catalog.add(new String[]{"RolePermission", "/api/role-permissions", "POST"});
        catalog.add(new String[]{"RolePermission", "/api/role-permissions/roles/{roleId}", "PUT"});
        catalog.add(new String[]{"RolePermission", "/api/role-permissions/{roleId}/{permissionId}", "DELETE"});

        catalog.add(new String[]{"Session", "/api/users/{userId}/sessions", "GET"});
        catalog.add(new String[]{"Session", "/api/users/{userId}/sessions/{sessionId}", "GET"});
        catalog.add(new String[]{"Session", "/api/users/{userId}/sessions/{sessionId}", "DELETE"});

        for (String[] entry : catalog) {
            String model = entry[0];
            String url = entry[1];
            String method = entry[2];
            if (!permissionRepository.existsByUrlAndMethod(url, method)) {
                Permission permission = new Permission();
                permission.setModel(model);
                permission.setUrl(url);
                permission.setMethod(method);
                permissionRepository.save(permission);
            }
        }
    }

    private void crud(List<String[]> catalog, String model, String base) {
        crud(catalog, model, base, "{id}");
    }

    private void crud(List<String[]> catalog, String model, String base, String idVar) {
        catalog.add(new String[]{model, base, "GET"});
        catalog.add(new String[]{model, base + "/" + idVar, "GET"});
        catalog.add(new String[]{model, base, "POST"});
        catalog.add(new String[]{model, base + "/" + idVar, "PUT"});
        catalog.add(new String[]{model, base + "/" + idVar, "DELETE"});
    }

    private Role seedRole(String name, String description) {
        return roleRepository.findByNameIgnoreCase(name).orElseGet(() -> {
            Role role = new Role();
            role.setName(name);
            role.setDescription(description);
            return roleRepository.save(role);
        });
    }

}
