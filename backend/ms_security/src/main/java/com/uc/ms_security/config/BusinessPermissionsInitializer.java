package com.uc.ms_security.config;

import java.util.List;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.uc.ms_security.entity.Permission;
import com.uc.ms_security.entity.Role;
import com.uc.ms_security.entity.RolePermission;
import com.uc.ms_security.repository.PermissionRepository;
import com.uc.ms_security.repository.RolePermissionRepository;
import com.uc.ms_security.repository.RoleRepository;
import com.uc.ms_security.service.AuthService;

import lombok.RequiredArgsConstructor;

/** Explicit, additive bootstrap for HU-GD-01, HU-GD-02 and HU-GD-03. */
@Component
@RequiredArgsConstructor
@Order(3)
public class BusinessPermissionsInitializer implements ApplicationRunner {

    private static final String OPTION = "seed-business-permissions";
    private static final List<Definition> CATALOG = List.of(
            new Definition("Sport", "/negocio/sports", "POST"),
            new Definition("Sport", "/negocio/sports", "GET"),
            new Definition("Sport", "/negocio/sports/{id}", "GET"),
            new Definition("Sport", "/negocio/sports/{id}", "PATCH"),
            new Definition("Sport", "/negocio/sports/{id}", "DELETE"),
            new Definition("Team", "/negocio/teams", "POST"),
            new Definition("Team", "/negocio/teams", "GET"),
            new Definition("Team", "/negocio/teams/{id}", "GET"),
            new Definition("Team", "/negocio/teams/{id}", "PATCH"),
            new Definition("Team", "/negocio/teams/{id}", "DELETE"),
            new Definition("TeamSport", "/negocio/team-sports", "POST"),
            new Definition("TeamSport", "/negocio/team-sports/teams/{teamId}", "GET"),
            new Definition("TeamSport", "/negocio/team-sports/sports/{sportId}", "GET"),
            new Definition("TeamSport", "/negocio/team-sports/{teamId}/{sportId}", "DELETE")
    );

    private final PermissionRepository permissionRepository;
    private final RoleRepository roleRepository;
    private final RolePermissionRepository rolePermissionRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!args.containsOption(OPTION)) {
            return;
        }
        List<String> values = args.getOptionValues(OPTION);
        if (values != null && !values.isEmpty()) {
            throw new IllegalArgumentException("Usa --seed-business-permissions sin valor");
        }
        // DataInitializer (order 1) prepares the base roles. Lock this stable role
        // to serialize concurrent runs, never assume its numeric ID or create users.
        Role administrator = roleRepository.findByNameIgnoreCaseForUpdate(AuthService.ADMIN_ROLE)
                .orElseThrow(() -> new IllegalStateException(
                        "No existe el rol base Administrador; revisa la inicializacion de seguridad"));

        for (Definition definition : CATALOG) {
            Permission permission = permissionRepository.findByUrlAndMethod(definition.url(), definition.method())
                    .orElseGet(() -> {
                        Permission missing = new Permission();
                        missing.setModel(definition.model());
                        missing.setUrl(definition.url());
                        missing.setMethod(definition.method());
                        return permissionRepository.save(missing);
                    });
            if (!rolePermissionRepository.existsByRoleIdAndPermissionId(
                    administrator.getId(), permission.getId())) {
                RolePermission assignment = new RolePermission();
                assignment.setRole(administrator);
                assignment.setPermission(permission);
                rolePermissionRepository.save(assignment);
            }
        }
    }

    private record Definition(String model, String url, String method) {
    }
}
