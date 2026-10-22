package com.uc.ms_security;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import com.uc.ms_security.entity.Profile;
import com.uc.ms_security.entity.Permission;
import com.uc.ms_security.entity.Role;
import com.uc.ms_security.entity.RolePermission;
import com.uc.ms_security.entity.Session;
import com.uc.ms_security.entity.User;
import com.uc.ms_security.entity.UserRole;
import com.uc.ms_security.repository.ProfileRepository;
import com.uc.ms_security.repository.PermissionRepository;
import com.uc.ms_security.repository.RolePermissionRepository;
import com.uc.ms_security.repository.RoleRepository;
import com.uc.ms_security.repository.SessionRepository;
import com.uc.ms_security.repository.UserRepository;
import com.uc.ms_security.repository.UserRoleRepository;
import com.uc.ms_security.service.UserService;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:user_deletion_test;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
class UserDeletionIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProfileRepository profileRepository;

    @Autowired
    private SessionRepository sessionRepository;

    @Autowired
    private UserRoleRepository userRoleRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PermissionRepository permissionRepository;

    @Autowired
    private RolePermissionRepository rolePermissionRepository;

    @Autowired
    private UserService userService;

    @Test
    void deletingUserShouldRemoveItsProfileSessionsAndRoleAssignments() {
        String email = UUID.randomUUID() + "@example.com";
        User user = new User();
        user.setName("Test user");
        user.setEmail(email);
        user.setPassword("encoded-password");
        user = userRepository.saveAndFlush(user);

        Profile profile = new Profile();
        profile.setUser(user);
        profile.setPhone("5551234567");
        profile.setBirthDate(LocalDate.of(1990, 1, 1));
        profileRepository.saveAndFlush(profile);

        Session session = new Session();
        session.setToken(UUID.randomUUID().toString());
        session.setExpiration(LocalDateTime.now().plusHours(1));
        session.setUser(user);
        sessionRepository.saveAndFlush(session);

        Role role = roleRepository.findByNameIgnoreCase("Usuario").orElseThrow();
        Permission permission = permissionRepository.findAll().get(0);
        RolePermission rolePermission = new RolePermission();
        rolePermission.setRole(role);
        rolePermission.setPermission(permission);
        rolePermissionRepository.saveAndFlush(rolePermission);

        UserRole userRole = new UserRole();
        userRole.setUser(user);
        userRole.setRole(role);
        userRoleRepository.saveAndFlush(userRole);

        Long userId = user.getId();
        Long roleId = role.getId();
        Long permissionId = permission.getId();
        userService.delete(userId);
        userRepository.flush();

        assertFalse(userRepository.existsByEmail(email));
        assertFalse(profileRepository.existsByUserId(userId));
        assertTrue(sessionRepository.findAllByUserId(userId).isEmpty());
        assertFalse(userRoleRepository.existsByUserIdAndRoleId(userId, roleId));
        assertTrue(roleRepository.existsById(roleId));
        assertTrue(permissionRepository.existsById(permissionId));
        assertTrue(rolePermissionRepository.existsByRoleIdAndPermissionId(roleId, permissionId));
    }
}
