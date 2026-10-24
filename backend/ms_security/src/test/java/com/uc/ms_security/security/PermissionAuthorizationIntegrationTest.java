package com.uc.ms_security.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.uc.ms_security.entity.Permission;
import com.uc.ms_security.entity.Role;
import com.uc.ms_security.entity.RolePermission;
import com.uc.ms_security.entity.Session;
import com.uc.ms_security.entity.User;
import com.uc.ms_security.entity.UserRole;
import com.uc.ms_security.repository.PermissionRepository;
import com.uc.ms_security.repository.RolePermissionRepository;
import com.uc.ms_security.repository.RoleRepository;
import com.uc.ms_security.repository.SessionRepository;
import com.uc.ms_security.repository.UserRepository;
import com.uc.ms_security.repository.UserRoleRepository;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:permission_authorization_test;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@AutoConfigureMockMvc
@Transactional
class PermissionAuthorizationIntegrationTest {

    private static final String PERMISSION_LIST_URL = "/api/permissions";

    @Autowired
    private MockMvc mockMvc;

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
    private SessionRepository sessionRepository;

    @Test
    void rejectsMissingToken() throws Exception {
        mockMvc.perform(get(PERMISSION_LIST_URL))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsInvalidToken() throws Exception {
        mockMvc.perform(get(PERMISSION_LIST_URL)
                        .header("Authorization", "Bearer invalid-token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsExpiredToken() throws Exception {
        Fixture fixture = fixture(List.of(), LocalDateTime.now().minusSeconds(1));

        authorizedGet(PERMISSION_LIST_URL, fixture.token())
                .andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsAuthenticatedUserWithoutRequiredPermission() throws Exception {
        Fixture fixture = fixture(List.of(), LocalDateTime.now().plusHours(1));

        authorizedGet(PERMISSION_LIST_URL, fixture.token())
                .andExpect(status().isForbidden());
    }

    @Test
    void permitsUserWhenOneOfMultipleRolesHasPermissionAndRevocationTakesEffect() throws Exception {
        Permission permission = findPermission(PERMISSION_LIST_URL, "GET");
        Role noAccess = createRole("No access");
        Role access = createRole("Read permissions");
        Fixture fixture = fixture(List.of(noAccess, access), LocalDateTime.now().plusHours(1));
        RolePermission assignment = assign(access, permission);

        authorizedGet(PERMISSION_LIST_URL, fixture.token())
                .andExpect(status().isOk());

        rolePermissionRepository.deleteById(assignment.getId());
        rolePermissionRepository.flush();

        authorizedGet(PERMISSION_LIST_URL, fixture.token())
                .andExpect(status().isForbidden());
    }

    @Test
    void matchesParameterizedPermissionRoutes() throws Exception {
        Permission permission = findPermission("/api/permissions/{id}", "GET");
        Role role = createRole("Read permission detail");
        Fixture fixture = fixture(List.of(role), LocalDateTime.now().plusHours(1));
        assign(role, permission);
        Long existingPermissionId = permissionRepository.findAll().get(0).getId();

        authorizedGet("/api/permissions/" + existingPermissionId, fixture.token())
                .andExpect(status().isOk());
    }

    @Test
    void doesNotAuthorizeDifferentHttpMethod() throws Exception {
        Permission getPermission = findPermission(PERMISSION_LIST_URL, "GET");
        Role role = createRole("GET only");
        Fixture fixture = fixture(List.of(role), LocalDateTime.now().plusHours(1));
        assign(role, getPermission);

        mockMvc.perform(post(PERMISSION_LIST_URL)
                        .header("Authorization", "Bearer " + fixture.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"url\":\"/api/example\",\"method\":\"GET\",\"model\":\"Example\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void deniesRouteWhenItsPermissionIsMissingFromCatalog() throws Exception {
        Role role = createRole("Missing catalog permission");
        Fixture fixture = fixture(List.of(role), LocalDateTime.now().plusHours(1));
        Permission listPermission = findPermission(PERMISSION_LIST_URL, "GET");
        rolePermissionRepository.deleteAll();
        permissionRepository.delete(listPermission);
        permissionRepository.flush();

        authorizedGet(PERMISSION_LIST_URL, fixture.token())
                .andExpect(status().isForbidden());
    }

    @Test
    void registrationAndLoginRemainPublic() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String requestBody = """
                {"name":"Test User","email":"%s","password":"test-password-8"}
                """.formatted(email);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"test-password-8"}
                                """.formatted(email)))
                .andExpect(status().isOk());
    }

    @Test
    void sessionEndpointsRequireAValidSession() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void validSessionCanReadItsOwnSessionAndLogout() throws Exception {
        Fixture fixture = fixture(List.of(), LocalDateTime.now().plusHours(1));

        authorizedGet("/api/auth/me", fixture.token())
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/auth/logout")
                        .header("Authorization", "Bearer " + fixture.token()))
                .andExpect(status().isNoContent());
        authorizedGet("/api/auth/me", fixture.token())
                .andExpect(status().isUnauthorized());
    }

    @Test
    void corsPreflightRemainsAvailableWithoutAUserSession() throws Exception {
        mockMvc.perform(options(PERMISSION_LIST_URL)
                        .header("Origin", "http://localhost:4200")
                        .header("Access-Control-Request-Method", "GET")
                        .header("Access-Control-Request-Headers", "authorization"))
                .andExpect(status().isOk());
    }

    @Test
    void userWithAdministratorNamedRoleStillNeedsPermissionForDirectWrites() throws Exception {
        Role administrator = roleRepository.findByNameIgnoreCase("Administrador").orElseThrow();
        rolePermissionRepository.deleteAllByRoleId(administrator.getId());
        rolePermissionRepository.flush();
        Fixture fixture = fixture(List.of(administrator), LocalDateTime.now().plusHours(1));
        Permission permission = permissionRepository.findAll().get(0);

        mockMvc.perform(post("/api/permissions")
                        .header("Authorization", "Bearer " + fixture.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"url\":\"/api/new\",\"method\":\"GET\",\"model\":\"New\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/permissions/" + permission.getId())
                        .header("Authorization", "Bearer " + fixture.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"url\":\"/api/changed\",\"method\":\"GET\",\"model\":\"Changed\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/permissions/" + permission.getId())
                        .header("Authorization", "Bearer " + fixture.token()))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/role-permissions")
                        .header("Authorization", "Bearer " + fixture.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"roleId\":1,\"permissionId\":1}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/role-permissions/roles/" + administrator.getId())
                        .header("Authorization", "Bearer " + fixture.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"permissionIds\":[]}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/role-permissions/" + administrator.getId() + "/" + permission.getId())
                        .header("Authorization", "Bearer " + fixture.token()))
                .andExpect(status().isForbidden());
    }

    @Test
    void permissionAndRolePermissionQueriesRequireEffectivePermissions() throws Exception {
        Fixture fixture = fixture(List.of(), LocalDateTime.now().plusHours(1));

        authorizedGet("/api/permissions", fixture.token())
                .andExpect(status().isForbidden());
        authorizedGet("/api/roles", fixture.token())
                .andExpect(status().isForbidden());
        authorizedGet("/api/role-permissions", fixture.token())
                .andExpect(status().isForbidden());
    }

    private org.springframework.test.web.servlet.ResultActions authorizedGet(String path, String token)
            throws Exception {
        return mockMvc.perform(get(path).header("Authorization", "Bearer " + token));
    }

    private Fixture fixture(List<Role> roles, LocalDateTime expiration) {
        User user = new User();
        user.setName("Authorization test user");
        user.setEmail(UUID.randomUUID() + "@example.com");
        user.setPassword("unused-test-hash");
        user = userRepository.saveAndFlush(user);

        for (Role role : roles) {
            UserRole userRole = new UserRole();
            userRole.setUser(user);
            userRole.setRole(role);
            userRoleRepository.save(userRole);
        }

        String token = UUID.randomUUID().toString();
        Session session = new Session();
        session.setToken(token);
        session.setExpiration(expiration);
        session.setUser(user);
        sessionRepository.saveAndFlush(session);
        return new Fixture(token);
    }

    private Role createRole(String label) {
        Role role = new Role();
        role.setName(label.substring(0, Math.min(label.length(), 20)) + " " + UUID.randomUUID().toString().substring(0, 8));
        role.setDescription("Test role");
        return roleRepository.saveAndFlush(role);
    }

    private Permission findPermission(String url, String method) {
        return permissionRepository.findAll().stream()
                .filter(permission -> permission.getUrl().equals(url))
                .filter(permission -> permission.getMethod().equalsIgnoreCase(method))
                .findFirst()
                .orElseThrow();
    }

    private RolePermission assign(Role role, Permission permission) {
        return rolePermissionRepository.saveAndFlush(assignment(role, permission));
    }

    private RolePermission assignment(Role role, Permission permission) {
        RolePermission rolePermission = new RolePermission();
        rolePermission.setRole(role);
        rolePermission.setPermission(permission);
        return rolePermission;
    }

    private record Fixture(String token) {
    }
}
