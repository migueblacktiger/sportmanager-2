package com.uc.ms_security.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

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
import com.uc.ms_security.entity.Profile;
import com.uc.ms_security.entity.Role;
import com.uc.ms_security.entity.RolePermission;
import com.uc.ms_security.entity.Session;
import com.uc.ms_security.entity.User;
import com.uc.ms_security.entity.UserRole;
import com.uc.ms_security.repository.PermissionRepository;
import com.uc.ms_security.repository.ProfileRepository;
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
    private InternalJwtService jwtService;

    @Autowired
    private PermissionRepository permissionRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private RolePermissionRepository rolePermissionRepository;

    @Autowired
    private ProfileRepository profileRepository;

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
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.roles[0].name").value("Usuario"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"test-password-8"}
                                """.formatted(email)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());

        String secondEmail = UUID.randomUUID() + "@example.com";
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Second User","email":"%s","password":"test-password-8"}
                                """.formatted(secondEmail)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.roles[0].name").value("Usuario"));
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
    void ownSessionQueriesAreScopedAndDoNotRequireAdministrativePermissions() throws Exception {
        Fixture owner = fixture(List.of(), LocalDateTime.now().plusHours(1));
        Fixture otherUser = fixture(List.of(), LocalDateTime.now().plusHours(1));

        authorizedGet("/api/users/" + owner.userId() + "/sessions", owner.token())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].token").doesNotExist())
                .andExpect(jsonPath("$[0].code2FA").doesNotExist());
        authorizedGet("/api/users/" + owner.userId() + "/sessions/" + owner.sessionId(), owner.token())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.code2FA").doesNotExist());

        authorizedGet("/api/users/" + otherUser.userId() + "/sessions", owner.token())
                .andExpect(status().isForbidden());
        authorizedGet("/api/users/" + otherUser.userId() + "/sessions/" + otherUser.sessionId(), owner.token())
                .andExpect(status().isForbidden());
        authorizedGet("/api/users/" + owner.userId() + "/sessions/" + otherUser.sessionId(), owner.token())
                .andExpect(status().isNotFound());
        mockMvc.perform(delete("/api/users/" + otherUser.userId() + "/sessions/" + otherUser.sessionId())
                        .header("Authorization", "Bearer " + owner.token()))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/users/" + owner.userId() + "/sessions/" + otherUser.sessionId())
                        .header("Authorization", "Bearer " + owner.token()))
                .andExpect(status().isNotFound());

        mockMvc.perform(delete("/api/users/" + owner.userId() + "/sessions/" + owner.sessionId())
                        .header("Authorization", "Bearer " + owner.token()))
                .andExpect(status().isNoContent());
        org.junit.jupiter.api.Assertions.assertTrue(
                sessionRepository.findById(owner.sessionId()).isEmpty()
        );
    }

    @Test
    void administrativeSessionQueriesHideCredentialsAndCanRevokeSessions() throws Exception {
        Role sessionAdministrator = createRole("Session administrator");
        Fixture administrator = fixture(
                List.of(sessionAdministrator),
                LocalDateTime.now().plusHours(1)
        );
        Fixture target = fixture(List.of(), LocalDateTime.now().plusHours(1));
        assign(sessionAdministrator, findPermission("/api/users/{userId}/sessions", "GET"));
        assign(sessionAdministrator, findPermission("/api/users/{userId}/sessions/{sessionId}", "GET"));
        assign(sessionAdministrator, findPermission("/api/users/{userId}/sessions/{sessionId}", "DELETE"));
        assign(sessionAdministrator, findPermission("/api/users/{id}/detail-with-sessions", "GET"));

        authorizedGet("/api/users/" + target.userId() + "/sessions", administrator.token())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(target.sessionId()))
                .andExpect(jsonPath("$[0].active").value(true))
                .andExpect(jsonPath("$[0].token").doesNotExist())
                .andExpect(jsonPath("$[0].code2FA").doesNotExist());
        authorizedGet(
                "/api/users/" + target.userId() + "/sessions/" + target.sessionId(),
                administrator.token()
        )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.code2FA").doesNotExist());
        authorizedGet("/api/users/" + target.userId() + "/detail-with-sessions", administrator.token())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessions[0].token").doesNotExist())
                .andExpect(jsonPath("$.sessions[0].code2FA").doesNotExist());

        mockMvc.perform(delete("/api/users/" + target.userId() + "/sessions/" + target.sessionId())
                        .header("Authorization", "Bearer " + administrator.token()))
                .andExpect(status().isNoContent());
        org.junit.jupiter.api.Assertions.assertTrue(
                sessionRepository.findById(target.sessionId()).isEmpty()
        );
    }

    @Test
    void administrativeSessionCreationAndTokenReplacementAreDisabled() throws Exception {
        Role sessionAdministrator = createRole("Session administrator");
        Fixture fixture = fixture(List.of(sessionAdministrator), LocalDateTime.now().plusHours(1));
        assign(
                sessionAdministrator,
                createPermission("/api/users/{userId}/sessions", "POST")
        );
        assign(
                sessionAdministrator,
                createPermission("/api/users/{userId}/sessions/{sessionId}", "PUT")
        );
        String arbitraryToken = "attacker-chosen-token-" + UUID.randomUUID();
        long initialSessionCount = sessionRepository.count();

        mockMvc.perform(post("/api/users/" + fixture.userId() + "/sessions")
                        .header("Authorization", "Bearer " + fixture.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"token":"%s","expiration":"%s","code2FA":"123456"}
                                """.formatted(
                                arbitraryToken,
                                LocalDateTime.now().plusHours(2)
                        )))
                .andExpect(status().isMethodNotAllowed());
        org.junit.jupiter.api.Assertions.assertEquals(initialSessionCount, sessionRepository.count());
        org.junit.jupiter.api.Assertions.assertTrue(sessionRepository.findByToken(arbitraryToken).isEmpty());

        mockMvc.perform(put("/api/users/" + fixture.userId() + "/sessions/" + fixture.sessionId())
                        .header("Authorization", "Bearer " + fixture.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"token":"%s","expiration":"%s","code2FA":"123456"}
                                """.formatted(
                                arbitraryToken,
                                LocalDateTime.now().plusHours(2)
                        )))
                .andExpect(status().isMethodNotAllowed());
        org.junit.jupiter.api.Assertions.assertTrue(
                sessionRepository.findByToken(fixture.token()).isPresent()
        );
        org.junit.jupiter.api.Assertions.assertTrue(sessionRepository.findByToken(arbitraryToken).isEmpty());
    }

    @Test
    void sessionAdministrationRejectsMissingOrInsufficientAuthorization() throws Exception {
        Fixture owner = fixture(List.of(), LocalDateTime.now().plusHours(1));
        Fixture otherUser = fixture(List.of(), LocalDateTime.now().plusHours(1));

        mockMvc.perform(get("/api/users/" + owner.userId() + "/sessions"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/users/" + otherUser.userId() + "/sessions")
                        .header("Authorization", "Bearer " + owner.token()))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/users/" + owner.userId() + "/sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"arbitrary\"}"))
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

    @Test
    void personalProfileRoutesUseAuthenticatedUserAndIgnoreClientIdentity() throws Exception {
        Fixture owner = fixture(List.of(), LocalDateTime.now().plusHours(1));
        Fixture otherUser = fixture(List.of(), LocalDateTime.now().plusHours(1));
        Profile ownerProfile = createProfile(owner.userId(), "1111111111");
        Profile otherProfile = createProfile(otherUser.userId(), "2222222222");

        authorizedGet("/api/users/me/detail", owner.token())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(owner.userId()))
                .andExpect(jsonPath("$.profile.id").value(ownerProfile.getId()));

        mockMvc.perform(put("/api/users/me/profile")
                        .header("Authorization", "Bearer " + owner.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "phone":"3333333333",
                                  "birthDate":"1990-05-12",
                                  "userId":%d
                                }
                                """.formatted(otherUser.userId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(owner.userId()))
                .andExpect(jsonPath("$.phone").value("3333333333"));

        org.junit.jupiter.api.Assertions.assertEquals(
                "3333333333",
                profileRepository.findById(ownerProfile.getId()).orElseThrow().getPhone()
        );
        org.junit.jupiter.api.Assertions.assertEquals(
                "2222222222",
                profileRepository.findById(otherProfile.getId()).orElseThrow().getPhone()
        );

        authorizedGet("/api/users/" + otherUser.userId() + "/detail", owner.token())
                .andExpect(status().isForbidden());
        authorizedGet("/api/profiles/" + otherProfile.getId(), owner.token())
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/profiles/" + otherProfile.getId())
                        .header("Authorization", "Bearer " + owner.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"phone":"9999999999","birthDate":"1990-05-12"}
                                """))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/users/" + otherUser.userId())
                        .header("Authorization", "Bearer " + owner.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Changed User","email":"changed@example.com"}
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void personalProfileCanBeCreatedWithoutAcceptingAUserId() throws Exception {
        Fixture owner = fixture(List.of(), LocalDateTime.now().plusHours(1));
        Fixture otherUser = fixture(List.of(), LocalDateTime.now().plusHours(1));

        mockMvc.perform(put("/api/users/me/profile")
                        .header("Authorization", "Bearer " + owner.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "phone":"4444444444",
                                  "birthDate":"1991-06-13",
                                  "userId":%d
                                }
                                """.formatted(otherUser.userId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(owner.userId()));

        org.junit.jupiter.api.Assertions.assertTrue(profileRepository.existsByUserId(owner.userId()));
        org.junit.jupiter.api.Assertions.assertFalse(profileRepository.existsByUserId(otherUser.userId()));
    }

    @Test
    void personalRoutesRequireAValidSession() throws Exception {
        mockMvc.perform(get("/api/users/me/detail"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(put("/api/users/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Own User","email":"own@example.com"}
                                """))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(put("/api/users/me/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"phone":"5555555555","birthDate":"1990-05-12"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void administrativeProfileOperationsStillRequireAndHonorEffectivePermissions() throws Exception {
        Role profileAdministrator = createRole("Profile administrator");
        Fixture administrator = fixture(List.of(profileAdministrator), LocalDateTime.now().plusHours(1));
        Fixture target = fixture(List.of(), LocalDateTime.now().plusHours(1));
        Profile targetProfile = createProfile(target.userId(), "6666666666");
        assign(profileAdministrator, findPermission("/api/users/{id}/detail", "GET"));
        assign(profileAdministrator, findPermission("/api/profiles/{id}", "PUT"));

        authorizedGet("/api/users/" + target.userId() + "/detail", administrator.token())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(target.userId()));
        mockMvc.perform(put("/api/profiles/" + targetProfile.getId())
                        .header("Authorization", "Bearer " + administrator.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"phone":"7777777777","birthDate":"1990-05-12"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(target.userId()))
                .andExpect(jsonPath("$.phone").value("7777777777"));

        org.junit.jupiter.api.Assertions.assertEquals(
                "7777777777",
                profileRepository.findById(targetProfile.getId()).orElseThrow().getPhone()
        );
    }

    @Test
    void rejectsDeletedSessionEvenWithValidSignature() throws Exception {
        Fixture fixture = fixture(List.of(), LocalDateTime.now().plusHours(1));
        sessionRepository.deleteById(fixture.sessionId());
        sessionRepository.flush();
        authorizedGet("/api/auth/me", fixture.token()).andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsSessionReassignedToAnotherUser() throws Exception {
        Fixture first = fixture(List.of(), LocalDateTime.now().plusHours(1));
        Fixture second = fixture(List.of(), LocalDateTime.now().plusHours(1));
        Session session = sessionRepository.findById(first.sessionId()).orElseThrow();
        session.setUser(userRepository.findById(second.userId()).orElseThrow());
        sessionRepository.saveAndFlush(session);
        authorizedGet("/api/auth/me", first.token()).andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsChangedDatabaseExpiration() throws Exception {
        Fixture fixture = fixture(List.of(), LocalDateTime.now().plusHours(1));
        Session session = sessionRepository.findById(fixture.sessionId()).orElseThrow();
        session.setExpiration(LocalDateTime.now().minusMinutes(1));
        sessionRepository.saveAndFlush(session);
        authorizedGet("/api/auth/me", fixture.token()).andExpect(status().isUnauthorized());
    }

    private org.springframework.test.web.servlet.ResultActions authorizedGet(String path, String token)
            throws Exception {
        return mockMvc.perform(get(path).header("Authorization", "Bearer " + token));
    }

    private Profile createProfile(Long userId, String phone) {
        User user = userRepository.findById(userId).orElseThrow();
        Profile profile = new Profile();
        profile.setUser(user);
        profile.setPhone(phone);
        profile.setBirthDate(java.time.LocalDate.of(1990, 5, 12));
        Profile savedProfile = profileRepository.saveAndFlush(profile);
        user.setProfile(savedProfile);
        return savedProfile;
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

        expiration = expiration.withNano(0);
        String token = jwtService.issue(user.getId(), expiration.atZone(java.time.ZoneId.systemDefault()).toInstant());
        Session session = new Session();
        session.setToken(token);
        session.setExpiration(expiration);
        session.setCode2FA("654321");
        session.setUser(user);
        Session savedSession = sessionRepository.saveAndFlush(session);
        return new Fixture(token, user.getId(), savedSession.getId());
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

    private Permission createPermission(String url, String method) {
        Permission permission = new Permission();
        permission.setModel("Session");
        permission.setUrl(url);
        permission.setMethod(method);
        return permissionRepository.saveAndFlush(permission);
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

    private record Fixture(String token, Long userId, Long sessionId) {
    }
}
