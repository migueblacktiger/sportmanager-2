package com.uc.ms_security.security;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import com.uc.ms_security.controller.PermissionValidationController;
import com.uc.ms_security.entity.*;
import com.uc.ms_security.exception.*;
import com.uc.ms_security.repository.*;
import com.uc.ms_security.service.*;

class PermissionValidationTest {
    private static final String ENDPOINT = "/api/internal/security/permissions-validation";
    private AuthService auth;
    private PermissionRepository permissions;
    private UserRoleRepository userRoles;
    private RolePermissionRepository rolePermissions;
    private MockMvc mvc;
    private PermissionAuthorizationService authorization;

    @BeforeEach
    void setup() {
        auth = mock(AuthService.class, withSettings().mockMaker(org.mockito.MockMakers.SUBCLASS));
        permissions = mock(PermissionRepository.class, withSettings().mockMaker(org.mockito.MockMakers.SUBCLASS));
        userRoles = mock(UserRoleRepository.class, withSettings().mockMaker(org.mockito.MockMakers.SUBCLASS));
        rolePermissions = mock(RolePermissionRepository.class, withSettings().mockMaker(org.mockito.MockMakers.SUBCLASS));
        authorization = new PermissionAuthorizationService(permissions, userRoles, rolePermissions);
        mvc = MockMvcBuilders.standaloneSetup(new PermissionValidationController(authorization))
                .addInterceptors(new PermissionAuthorizationInterceptor(auth, authorization))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
        User user = new User();
        user.setId(7L);
        Session session = new Session();
        session.setUser(user);
        when(auth.findValidSession("valid")).thenReturn(session);
        when(auth.findValidSession("invalid")).thenThrow(
                new ApplicationException(ErrorCase.UNAUTHORIZED, "Invalid session"));
    }

    private void grant(String route, String method) {
        Role role = new Role();
        role.setId(2L);
        UserRole assignment = new UserRole();
        assignment.setRole(role);
        Permission permission = new Permission();
        permission.setId(3L);
        permission.setUrl(route);
        RolePermission grant = new RolePermission();
        grant.setPermission(permission);
        when(userRoles.findAllByUserId(7L)).thenReturn(List.of(assignment));
        when(rolePermissions.findAllByRoleIdIn(Set.of(2L))).thenReturn(List.of(grant));
        when(permissions.findAllByMethodIgnoreCase(method)).thenReturn(List.of(permission));
    }

    private org.springframework.test.web.servlet.ResultActions request(String body) throws Exception {
        return mvc.perform(post(ENDPOINT).header("Authorization", "Bearer valid")
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    @Test
    void requiresSessionEvenForInvalidBody() throws Exception {
        mvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post(ENDPOINT).header("Authorization", "Bearer invalid")
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(userRoles, rolePermissions, permissions);
    }

    @Test
    void noRolesReturnsFalseWithoutPermissionOnEndpoint() throws Exception {
        request("{\"url\":\"/negocio/sports\",\"method\":\"POST\"}")
                .andExpect(status().isOk()).andExpect(content().json("{\"allowed\":false}"));
        verify(userRoles).findAllByUserId(7L);
    }

    @Test
    void usesSessionIdentityAndAcceptsLowercaseMethod() throws Exception {
        grant("/negocio/sports", "post");
        request("{\"url\":\"/negocio/sports\",\"method\":\"post\",\"userId\":999}")
                .andExpect(status().isOk()).andExpect(content().json("{\"allowed\":true}"));
        verify(userRoles).findAllByUserId(7L);
        verify(userRoles, never()).findAllByUserId(999L);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/negocio/sports/15", "/negocio/sports/{id}", "/negocio/sports/{sportId}"})
    void numericAndCanonicalPathsMatch(String route) throws Exception {
        grant("/negocio/sports/{id}", "DELETE");
        request("{\"url\":\"" + route + "\",\"method\":\"DELETE\"}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.allowed").value(true));
    }

    @ParameterizedTest
    @ValueSource(strings = {"/otro/sports/15", "/negocio/sports/15/extra", "/negocio/sports/name"})
    void doesNotBroadenRouteMatching(String route) throws Exception {
        grant("/negocio/sports/{id}", "DELETE");
        request("{\"url\":\"" + route + "\",\"method\":\"DELETE\"}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.allowed").value(false));
    }

    @Test
    void methodAndRevokedAssignmentDeny() throws Exception {
        grant("/negocio/sports", "POST");
        request("{\"url\":\"/negocio/sports\",\"method\":\"DELETE\"}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.allowed").value(false));
        when(rolePermissions.findAllByRoleIdIn(Set.of(2L))).thenReturn(List.of());
        request("{\"url\":\"/negocio/sports\",\"method\":\"POST\"}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.allowed").value(false));
    }

    @ParameterizedTest
    @ValueSource(strings = {"{}", "{\"url\":null,\"method\":\"POST\"}",
            "{\"url\":\"\",\"method\":\"POST\"}", "{\"url\":\"/x\",\"method\":\"TRACE\"}",
            "{\"url\":\"https://example.com/x\",\"method\":\"GET\"}",
            "{\"url\":\"/x?userId=5\",\"method\":\"GET\"}",
            "{\"url\":\"/x/../y\",\"method\":\"GET\"}", "not-json"})
    void rejectsInvalidInput(String body) throws Exception {
        request(body).andExpect(status().isBadRequest());
        verifyNoInteractions(userRoles, rolePermissions, permissions);
    }

    @Test
    void oversizedPathIsBadRequest() throws Exception {
        request("{\"url\":\"/" + "x".repeat(255) + "\",\"method\":\"GET\"}")
                .andExpect(status().isBadRequest());
    }

    @Test
    void unexpectedFailureNeverReturnsAllowed() throws Exception {
        when(userRoles.findAllByUserId(7L)).thenThrow(new IllegalStateException("Database unavailable"));
        request("{\"url\":\"/negocio/sports\",\"method\":\"POST\"}")
                .andExpect(status().isInternalServerError()).andExpect(jsonPath("$.allowed").doesNotExist());
    }

    @Test
    void preservesLocalHandlerMatching() {
        grant("/api/sports/{id}", "GET");
        org.junit.jupiter.api.Assertions.assertTrue(
                authorization.hasPermissionForHandler(7L, "GET", "/api/sports/{sportId}"));
        org.junit.jupiter.api.Assertions.assertFalse(
                authorization.hasPermissionForHandler(7L, "GET", "/api/sports/15"));
    }
}
