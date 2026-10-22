package com.uc.ms_security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import com.uc.ms_security.dto.user.UserRolesResponseDTO;
import com.uc.ms_security.entity.Role;
import com.uc.ms_security.entity.User;
import com.uc.ms_security.entity.UserRole;
import com.uc.ms_security.repository.RoleRepository;
import com.uc.ms_security.repository.UserRepository;
import com.uc.ms_security.repository.UserRoleRepository;
import com.uc.ms_security.service.UserService;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:user_multiple_roles_test;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
class UserMultipleRolesIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserRoleRepository userRoleRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserService userService;

    @Test
    void userCanHaveAndRetrieveMultipleRoles() {
        User user = new User();
        user.setName("Test user");
        user.setEmail(UUID.randomUUID() + "@example.com");
        user.setPassword("encoded-password");
        user = userRepository.saveAndFlush(user);

        Role adminRole = roleRepository.findByNameIgnoreCase("Administrador").orElseThrow();
        Role userRole = roleRepository.findByNameIgnoreCase("Usuario").orElseThrow();
        assignRole(user, adminRole);
        assignRole(user, userRole);

        UserRolesResponseDTO result = userService.findByIdAndRoles(user.getId());

        assertEquals(2, result.getRoles().size());
        Set<String> roleNames = result.getRoles().stream()
                .map(assignment -> assignment.getRole().getName())
                .collect(Collectors.toSet());
        assertTrue(roleNames.contains("Administrador"));
        assertTrue(roleNames.contains("Usuario"));
    }

    private void assignRole(User user, Role role) {
        UserRole assignment = new UserRole();
        assignment.setUser(user);
        assignment.setRole(role);
        userRoleRepository.saveAndFlush(assignment);
    }
}
