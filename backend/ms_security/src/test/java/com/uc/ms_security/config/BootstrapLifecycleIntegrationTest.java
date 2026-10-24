package com.uc.ms_security.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import com.uc.ms_security.entity.Permission;
import com.uc.ms_security.entity.Role;
import com.uc.ms_security.entity.RolePermission;
import com.uc.ms_security.entity.User;
import com.uc.ms_security.entity.UserRole;
import com.uc.ms_security.exception.ApplicationException;
import com.uc.ms_security.repository.PermissionRepository;
import com.uc.ms_security.repository.RolePermissionRepository;
import com.uc.ms_security.repository.RoleRepository;
import com.uc.ms_security.repository.UserRepository;
import com.uc.ms_security.repository.UserRoleRepository;
import com.uc.ms_security.service.AdminProvisioningService;
import com.uc.ms_security.service.AuthService;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:bootstrap_lifecycle_test;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@Transactional
class BootstrapLifecycleIntegrationTest {

    private static final List<PermissionKey> RECENT_PERMISSIONS = List.of(
            new PermissionKey("/api/users/{id}/detail", "GET"),
            new PermissionKey("/api/users/{id}/detail-with-sessions", "GET"),
            new PermissionKey("/api/users/{id}/detail-with-roles", "GET"),
            new PermissionKey("/api/user-roles/users/{userId}", "GET"),
            new PermissionKey("/api/user-roles/roles/{roleId}", "GET")
    );

    @Autowired
    private DataInitializer dataInitializer;

    @Autowired
    private PermissionRepository permissionRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private RolePermissionRepository rolePermissionRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserRoleRepository userRoleRepository;

    @Autowired
    private AdminProvisioningService adminProvisioningService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void freshInitializationCreatesBaseDataWithoutGrantingPermissionsOrProvisioningUsers() {
        Role admin = roleRepository.findByNameIgnoreCase(AuthService.ADMIN_ROLE).orElseThrow();
        Role user = roleRepository.findByNameIgnoreCase(AuthService.DEFAULT_ROLE).orElseThrow();

        assertTrue(permissionRepository.count() > 0);
        assertTrue(userRepository.findAll().isEmpty());
        assertTrue(rolePermissionRepository.findAllByRoleId(admin.getId()).isEmpty());
        assertTrue(rolePermissionRepository.findAllByRoleId(user.getId()).isEmpty());
    }

    @Test
    void existingCatalogReceivesOnlyMissingDefinitionsAndPreservesAssignments() {
        Role admin = roleRepository.findByNameIgnoreCase(AuthService.ADMIN_ROLE).orElseThrow();
        Role user = roleRepository.findByNameIgnoreCase(AuthService.DEFAULT_ROLE).orElseThrow();

        for (PermissionKey key : RECENT_PERMISSIONS) {
            Permission permission = findPermission(key);
            permissionRepository.delete(permission);
        }
        addLegacySessionPermission("/api/users/{userId}/sessions", "POST");
        addLegacySessionPermission("/api/users/{userId}/sessions/{sessionId}", "PUT");
        permissionRepository.flush();

        List<Permission> existingPermissions = permissionRepository.findAll();
        assertEquals(33, existingPermissions.size());
        for (Permission permission : existingPermissions) {
            RolePermission assignment = new RolePermission();
            assignment.setRole(admin);
            assignment.setPermission(permission);
            rolePermissionRepository.save(assignment);
        }
        rolePermissionRepository.flush();
        Set<Long> existingAdminPermissionIds = rolePermissionRepository.findAllByRoleId(admin.getId())
                .stream()
                .map(assignment -> assignment.getPermission().getId())
                .collect(Collectors.toSet());

        dataInitializer.run(new DefaultApplicationArguments(new String[0]));
        permissionRepository.flush();
        rolePermissionRepository.flush();

        assertEquals(38, permissionRepository.count());
        assertEquals(33, rolePermissionRepository.findAllByRoleId(admin.getId()).size());
        assertEquals(existingAdminPermissionIds, rolePermissionRepository.findAllByRoleId(admin.getId())
                .stream()
                .map(assignment -> assignment.getPermission().getId())
                .collect(Collectors.toSet()));
        assertTrue(rolePermissionRepository.findAllByRoleId(user.getId()).isEmpty());
        for (PermissionKey key : RECENT_PERMISSIONS) {
            Permission newPermission = findPermission(key);
            assertTrue(rolePermissionRepository.findByRoleIdAndPermissionId(
                    admin.getId(),
                    newPermission.getId()
            ).isEmpty());
            assertTrue(rolePermissionRepository.findByRoleIdAndPermissionId(
                    user.getId(),
                    newPermission.getId()
            ).isEmpty());
        }

        dataInitializer.run(new DefaultApplicationArguments(new String[0]));
        assertEquals(38, permissionRepository.count());
        assertEquals(33, rolePermissionRepository.findAllByRoleId(admin.getId()).size());
    }

    @Test
    void repeatedInitializationDoesNotRestoreFullyRevokedPermissionsOrChangeManualAssignments() {
        Role admin = roleRepository.findByNameIgnoreCase(AuthService.ADMIN_ROLE).orElseThrow();
        Role user = roleRepository.findByNameIgnoreCase(AuthService.DEFAULT_ROLE).orElseThrow();
        Permission manuallyGranted = permissionRepository.findAll().get(0);

        RolePermission adminAssignment = new RolePermission();
        adminAssignment.setRole(admin);
        adminAssignment.setPermission(manuallyGranted);
        rolePermissionRepository.save(adminAssignment);
        RolePermission userAssignment = new RolePermission();
        userAssignment.setRole(user);
        userAssignment.setPermission(manuallyGranted);
        rolePermissionRepository.save(userAssignment);
        rolePermissionRepository.flush();

        rolePermissionRepository.deleteAllByRoleId(admin.getId());
        rolePermissionRepository.flush();
        assertTrue(rolePermissionRepository.findAllByRoleId(admin.getId()).isEmpty());

        dataInitializer.run(new DefaultApplicationArguments(new String[0]));
        dataInitializer.run(new DefaultApplicationArguments(new String[0]));

        assertTrue(rolePermissionRepository.findAllByRoleId(admin.getId()).isEmpty());
        assertEquals(1, rolePermissionRepository.findAllByRoleId(user.getId()).size());
    }

    @Test
    void explicitProvisioningCreatesOneAdminWithBCryptAndRejectsRepeatedProvisioning() {
        String email = UUID.randomUUID() + "@example.com";
        char[] password = ("one-time-" + UUID.randomUUID()).toCharArray();

        adminProvisioningService.provision("First Administrator", email, password);

        User provisioned = userRepository.findByEmail(email).orElseThrow();
        assertFalse(new String(password).equals(provisioned.getPassword()));
        assertTrue(passwordEncoder.matches(new String(password), provisioned.getPassword()));
        List<UserRole> roles = userRoleRepository.findAllByUserId(provisioned.getId());
        assertEquals(1, roles.size());
        assertEquals(AuthService.ADMIN_ROLE, roles.get(0).getRole().getName());
        assertTrue(rolePermissionRepository.findAllByRoleId(roles.get(0).getRole().getId()).isEmpty());

        String secondEmail = UUID.randomUUID() + "@example.com";
        assertThrows(
                ApplicationException.class,
                () -> adminProvisioningService.provision(
                        "Second Administrator",
                        secondEmail,
                        ("another-" + UUID.randomUUID()).toCharArray()
                )
        );
        assertFalse(userRepository.existsByEmail(secondEmail));
        assertEquals(1, userRoleRepository.findAllByRoleId(roles.get(0).getRole().getId()).size());
    }

    @Test
    void explicitProvisioningRejectsExistingEmailWithoutPromotingThatAccount() {
        String email = UUID.randomUUID() + "@example.com";
        User existing = new User();
        existing.setName("Existing User");
        existing.setEmail(email);
        existing.setPassword(passwordEncoder.encode("existing-password"));
        existing = userRepository.saveAndFlush(existing);

        Role userRole = roleRepository.findByNameIgnoreCase(AuthService.DEFAULT_ROLE).orElseThrow();
        UserRole existingAssignment = new UserRole();
        existingAssignment.setUser(existing);
        existingAssignment.setRole(userRole);
        userRoleRepository.saveAndFlush(existingAssignment);

        assertThrows(
                ApplicationException.class,
                () -> adminProvisioningService.provision(
                        "Existing User",
                        email,
                        "some-secret-password".toCharArray()
                )
        );
        assertEquals(
                AuthService.DEFAULT_ROLE,
                userRoleRepository.findAllByUserId(existing.getId()).get(0).getRole().getName()
        );
        assertFalse(userRoleRepository.existsByRoleId(
                roleRepository.findByNameIgnoreCase(AuthService.ADMIN_ROLE).orElseThrow().getId()
        ));
    }

    @Test
    void provisionRunnerDoesNothingWithoutExplicitCommandOption() throws Exception {
        long usersBefore = userRepository.count();
        new AdminProvisioningRunner(adminProvisioningService, org.mockito.Mockito.mock(Environment.class))
                .run(new DefaultApplicationArguments(new String[0]));
        assertEquals(usersBefore, userRepository.count());
    }

    private Permission findPermission(PermissionKey key) {
        return permissionRepository.findAll().stream()
                .filter(permission -> permission.getUrl().equals(key.url()))
                .filter(permission -> permission.getMethod().equalsIgnoreCase(key.method()))
                .findFirst()
                .orElseThrow();
    }

    private void addLegacySessionPermission(String url, String method) {
        Permission permission = new Permission();
        permission.setModel("Session");
        permission.setUrl(url);
        permission.setMethod(method);
        permissionRepository.save(permission);
    }

    private record PermissionKey(String url, String method) {
    }
}
