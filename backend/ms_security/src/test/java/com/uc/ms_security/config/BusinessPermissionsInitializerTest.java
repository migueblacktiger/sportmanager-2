package com.uc.ms_security.config;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;

import com.uc.ms_security.entity.Permission;
import com.uc.ms_security.entity.Role;
import com.uc.ms_security.entity.RolePermission;
import com.uc.ms_security.repository.PermissionRepository;
import com.uc.ms_security.repository.RolePermissionRepository;
import com.uc.ms_security.repository.RoleRepository;
import com.uc.ms_security.service.AuthService;

class BusinessPermissionsInitializerTest {
    private static final int CURRENT_CATALOG_SIZE = 90;
    private static final Map<String, String> EXPECTED = Map.ofEntries(
            Map.entry("POST /negocio/sports", "Sport"),
            Map.entry("GET /negocio/sports", "Sport"),
            Map.entry("GET /negocio/sports/{id}", "Sport"),
            Map.entry("PATCH /negocio/sports/{id}", "Sport"),
            Map.entry("DELETE /negocio/sports/{id}", "Sport"),
            Map.entry("POST /negocio/teams", "Team"),
            Map.entry("GET /negocio/teams", "Team"),
            Map.entry("GET /negocio/teams/{id}", "Team"),
            Map.entry("PATCH /negocio/teams/{id}", "Team"),
            Map.entry("DELETE /negocio/teams/{id}", "Team"),
            Map.entry("POST /negocio/team-sports", "TeamSport"),
            Map.entry("GET /negocio/team-sports/teams/{teamId}", "TeamSport"),
            Map.entry("GET /negocio/team-sports/sports/{sportId}", "TeamSport"),
            Map.entry("DELETE /negocio/team-sports/{teamId}/{sportId}", "TeamSport"),
            Map.entry("POST /negocio/players", "Player"),
            Map.entry("GET /negocio/players", "Player"),
            Map.entry("GET /negocio/players/{id}", "Player"),
            Map.entry("PATCH /negocio/players/{id}", "Player"),
            Map.entry("DELETE /negocio/players/{id}", "Player"),
            Map.entry("POST /negocio/habilidades", "Skill"),
            Map.entry("GET /negocio/habilidades", "Skill"),
            Map.entry("GET /negocio/habilidades/{id}", "Skill"),
            Map.entry("PATCH /negocio/habilidades/{id}", "Skill"),
            Map.entry("DELETE /negocio/habilidades/{id}", "Skill"),
            Map.entry("POST /negocio/player-skills", "PlayerSkill"),
            Map.entry("GET /negocio/player-skills/players/{playerId}", "PlayerSkill"),
            Map.entry("GET /negocio/player-skills/skills/{skillId}", "PlayerSkill"),
            Map.entry("DELETE /negocio/player-skills/{playerId}/{skillId}", "PlayerSkill"),
            Map.entry("POST /negocio/player-teams", "PlayerTeam"),
            Map.entry("GET /negocio/player-teams/teams/{teamId}", "PlayerTeam"),
            Map.entry("GET /negocio/player-teams/players/{playerId}", "PlayerTeam"),
            Map.entry("PATCH /negocio/player-teams/{id}/finish", "PlayerTeam"),
            Map.entry("POST /negocio/tournaments", "Tournament"),
            Map.entry("GET /negocio/tournaments", "Tournament"),
            Map.entry("GET /negocio/tournaments/{id}", "Tournament"),
            Map.entry("PATCH /negocio/tournaments/{id}", "Tournament"),
            Map.entry("DELETE /negocio/tournaments/{id}", "Tournament"),
            Map.entry("POST /negocio/matches/{matchId}/audiences/tickets", "MatchAudience"),
            Map.entry("GET /negocio/matches/{matchId}/audiences/tickets", "MatchAudience"),
            Map.entry("DELETE /negocio/matches/{matchId}/audiences/tickets/{fanId}", "MatchAudience"),
            Map.entry("POST /negocio/matches/{matchId}/audiences/bets", "MatchAudience"),
            Map.entry("GET /negocio/matches/{matchId}/audiences/bets", "MatchAudience"),
            Map.entry("DELETE /negocio/matches/{matchId}/audiences/bets/{fanId}", "MatchAudience")
    );

    private PermissionRepository permissionRepository;
    private RoleRepository roleRepository;
    private RolePermissionRepository rolePermissionRepository;
    private BusinessPermissionsInitializer initializer;
    private final Map<String, Permission> permissions = new LinkedHashMap<>();
    private final Map<String, RolePermission> assignments = new LinkedHashMap<>();
    private Role administrator;
    private long nextId;

    @BeforeEach
    void setUp() {
        nextId = 100;
        permissions.clear();
        assignments.clear();
        permissionRepository = mock(PermissionRepository.class);
        roleRepository = mock(RoleRepository.class);
        rolePermissionRepository = mock(RolePermissionRepository.class);
        administrator = role(73L, AuthService.ADMIN_ROLE);
        initializer = new BusinessPermissionsInitializer(permissionRepository, roleRepository, rolePermissionRepository);
        when(roleRepository.findByNameIgnoreCaseForUpdate(AuthService.ADMIN_ROLE)).thenReturn(Optional.of(administrator));
        when(permissionRepository.findByUrlAndMethod(anyString(), anyString()))
                .thenAnswer(call -> Optional.ofNullable(permissions.get(call.getArgument(1) + " " + call.getArgument(0))));
        when(permissionRepository.save(any(Permission.class))).thenAnswer(call -> {
            Permission permission = call.getArgument(0);
            permission.setId(nextId++);
            String key = permission.getMethod() + " " + permission.getUrl();
            assertFalse(permissions.containsKey(key), "Duplicate permission insert");
            permissions.put(key, permission);
            return permission;
        });
        when(rolePermissionRepository.existsByRoleIdAndPermissionId(anyLong(), anyLong()))
                .thenAnswer(call -> assignments.containsKey(pair(call.getArgument(0), call.getArgument(1))));
        when(rolePermissionRepository.save(any(RolePermission.class))).thenAnswer(call -> {
            RolePermission assignment = call.getArgument(0);
            String key = pair(assignment.getRole().getId(), assignment.getPermission().getId());
            assertFalse(assignments.containsKey(key), "Duplicate association insert");
            assignment.setId(nextId++);
            assignments.put(key, assignment);
            return assignment;
        });
    }

    @Test
    void ordinaryStartupDoesNothingAndDoesNotRestoreRevokedGrants() {
        initializer.run(new DefaultApplicationArguments());
        verifyNoInteractions(permissionRepository, roleRepository, rolePermissionRepository);
        assertTrue(permissions.isEmpty());
        assertTrue(assignments.isEmpty());
    }

    @Test
    void createsTheCurrentCatalogAndAssignsBusinessPermissionsToTheNamedAdministrator() {
        seed();
        assertEquals(EXPECTED, permissionModels(EXPECTED));
        assertEquals(CURRENT_CATALOG_SIZE, permissions.size());
        assertEquals(CURRENT_CATALOG_SIZE, assignments.size());
        assertEquals("Skill", permissions.get("GET /negocio/habilidades").getModel());
        assertEquals("PlayerSkill", permissions.get(
                "GET /negocio/player-skills/players/{playerId}").getModel());
        assertEquals("Tournament", permissions.get("POST /negocio/tournaments").getModel());
        assertEquals("Tournament", permissions.get("GET /negocio/tournaments").getModel());
        assertEquals("Tournament", permissions.get("GET /negocio/tournaments/{id}").getModel());
        assertEquals("Tournament", permissions.get("PATCH /negocio/tournaments/{id}").getModel());
        assertEquals("Tournament", permissions.get("DELETE /negocio/tournaments/{id}").getModel());
        assertEquals("TournamentPhase", permissions.get(
                "POST /negocio/tournaments/{tournamentId}/phases").getModel());
        assertEquals("TournamentPhase", permissions.get(
                "GET /negocio/tournaments/{tournamentId}/phases").getModel());
        assertEquals("TournamentPhase", permissions.get("GET /negocio/phases/{id}").getModel());
        assertEquals("TournamentPhase", permissions.get("PATCH /negocio/phases/{id}").getModel());
        assertEquals("TournamentPhase", permissions.get("DELETE /negocio/phases/{id}").getModel());
        assertTrue(assignments.values().stream().allMatch(a -> a.getRole().getId().equals(73L)));
        verify(roleRepository).findByNameIgnoreCaseForUpdate(AuthService.ADMIN_ROLE);
        verifyNoMoreInteractions(roleRepository);
    }

    @Test
    void repeatedExecutionDoesNotInsertOrUpdateAnything() {
        seed();
        Map<String, Permission> originalPermissions = new LinkedHashMap<>(permissions);
        Map<String, RolePermission> originalAssignments = new LinkedHashMap<>(assignments);
        clearInvocations(permissionRepository, roleRepository, rolePermissionRepository);
        seed();
        assertEquals(originalPermissions, permissions);
        assertEquals(originalAssignments, assignments);
        verify(permissionRepository, never()).save(any(Permission.class));
        verify(rolePermissionRepository, never()).save(any(RolePermission.class));
        verify(permissionRepository, never()).delete(any(Permission.class));
        verify(rolePermissionRepository, never()).delete(any(RolePermission.class));
    }

    @Test
    void preservesExistingDefinitionsManualGrantsAndOtherRolesWhenOnlySomeAreMissing() {
        Permission existingBusiness = existing("GET /negocio/sports", "ExistingLabel");
        Permission unrelated = existing("GET /api/custom-report", "CustomReport");
        Role otherRole = role(92L, "Custom role");
        grant(administrator, existingBusiness);
        RolePermission manual = grant(administrator, unrelated);
        RolePermission otherAssignment = grant(otherRole, existingBusiness);
        seed();
        assertEquals(CURRENT_CATALOG_SIZE + 1, permissions.size());
        assertSame(existingBusiness, permissions.get("GET /negocio/sports"));
        assertEquals("ExistingLabel", existingBusiness.getModel());
        assertSame(unrelated, permissions.get("GET /api/custom-report"));
        assertSame(manual, assignments.get(pair(73L, unrelated.getId())));
        assertSame(otherAssignment, assignments.get(pair(92L, existingBusiness.getId())));
        assertEquals(CURRENT_CATALOG_SIZE + 1,
                assignments.values().stream().filter(a -> a.getRole().getId().equals(73L)).count());
        assertEquals(1, assignments.values().stream().filter(a -> a.getRole().getId().equals(92L)).count());
        verify(permissionRepository, times(CURRENT_CATALOG_SIZE - 1)).save(any(Permission.class));
        verify(rolePermissionRepository, times(CURRENT_CATALOG_SIZE - 1)).save(any(RolePermission.class));
        verify(roleRepository, never()).save(any(Role.class));
        verify(rolePermissionRepository, never()).deleteAllByRoleId(anyLong());
    }

    @Test
    void reusesLegacyPermissionsAndUsesTheActualRoleIdRatherThanOne() {
        administrator.setId(607L);
        administrator.setName("aDmInIsTrAdOr");
        EXPECTED.forEach(this::existing);
        seed();
        assertEquals(CURRENT_CATALOG_SIZE, permissions.size());
        assertEquals(CURRENT_CATALOG_SIZE, assignments.size());
        assertTrue(assignments.values().stream().allMatch(a -> a.getRole().getId().equals(607L)));
        verify(permissionRepository, times(CURRENT_CATALOG_SIZE - EXPECTED.size())).save(any(Permission.class));
        verify(rolePermissionRepository, times(CURRENT_CATALOG_SIZE)).save(any(RolePermission.class));
        verify(rolePermissionRepository, never()).existsByRoleIdAndPermissionId(eq(1L), anyLong());
        verify(roleRepository).findByNameIgnoreCaseForUpdate(AuthService.ADMIN_ROLE);
        verifyNoMoreInteractions(roleRepository);
    }

    @Test
    void upgradesTheOriginalFourteenWithoutChangingExistingGrants() {
        EXPECTED.forEach((key, model) -> {
            if (model.equals("Sport") || model.equals("Team") || model.equals("TeamSport")) {
                grant(administrator, existing(key, model));
            }
        });
        Role otherRole = role(92L, "Otro rol");
        Permission unrelated = existing("GET /api/custom-report", "CustomReport");
        RolePermission otherAssignment = grant(otherRole, unrelated);
        Map<String, RolePermission> before = new LinkedHashMap<>(assignments);
        seed();
        assertEquals(CURRENT_CATALOG_SIZE + 1, permissions.size());
        assertEquals(CURRENT_CATALOG_SIZE, assignments.values().stream()
                .filter(a -> a.getRole().getId().equals(administrator.getId())).count());
        before.forEach((key, value) -> assertSame(value, assignments.get(key)));
        assertSame(otherAssignment, assignments.get(pair(otherRole.getId(), unrelated.getId())));
        verify(permissionRepository, times(CURRENT_CATALOG_SIZE - 14)).save(any(Permission.class));
        verify(permissionRepository, times(5)).save(argThat(p -> p.getModel().equals("Player")));
        verify(permissionRepository, times(4)).save(argThat(p -> p.getModel().equals("PlayerTeam")));
        verify(rolePermissionRepository, times(4)).save(argThat(a ->
                a.getRole().getId().equals(administrator.getId())
                && a.getPermission().getModel().equals("PlayerTeam")));
        verify(rolePermissionRepository, times(5)).save(argThat(a ->
                a.getRole().getId().equals(administrator.getId())
                && a.getPermission().getModel().equals("Player")));
        verify(rolePermissionRepository, never()).deleteAllByRoleId(anyLong());
        clearInvocations(permissionRepository, rolePermissionRepository);
        seed();
        verify(permissionRepository, never()).save(any(Permission.class));
        verify(rolePermissionRepository, never()).save(any(RolePermission.class));
    }

    @Test
    void upgradesTheOriginalNineteenWithOnlyFourPlayerTeamPermissionsIdempotently() {
        EXPECTED.forEach((key, model) -> {
            if (model.equals("Sport") || model.equals("Team") || model.equals("TeamSport")
                    || model.equals("Player")) {
                grant(administrator, existing(key, model));
            }
        });
        Permission unrelated = existing("GET /api/custom-report", "CustomReport");
        Role otherRole = role(92L, "Otro rol");
        RolePermission manual = grant(administrator, unrelated);
        RolePermission otherAssignment = grant(otherRole, unrelated);
        Map<String, Permission> originalPermissions = new LinkedHashMap<>(permissions);
        Map<String, RolePermission> originalAssignments = new LinkedHashMap<>(assignments);
        seed();
        assertEquals(CURRENT_CATALOG_SIZE + 1, permissions.size());
        assertEquals(CURRENT_CATALOG_SIZE + 1, assignments.values().stream()
                .filter(a -> a.getRole().getId().equals(administrator.getId())).count());
        originalPermissions.forEach((key, value) -> assertSame(value, permissions.get(key)));
        originalAssignments.forEach((key, value) -> assertSame(value, assignments.get(key)));
        assertSame(manual, assignments.get(pair(administrator.getId(), unrelated.getId())));
        assertSame(otherAssignment, assignments.get(pair(otherRole.getId(), unrelated.getId())));
        verify(permissionRepository, times(CURRENT_CATALOG_SIZE - 19)).save(any(Permission.class));
        verify(permissionRepository, times(4)).save(argThat(p -> p.getModel().equals("PlayerTeam")));
        verify(rolePermissionRepository, times(4)).save(argThat(a ->
                a.getRole().getId().equals(administrator.getId())
                && a.getPermission().getModel().equals("PlayerTeam")));
        verify(roleRepository, never()).save(any(Role.class));
        verify(rolePermissionRepository, never()).deleteAllByRoleId(anyLong());
        clearInvocations(permissionRepository, rolePermissionRepository);
        seed();
        verify(permissionRepository, never()).save(any(Permission.class));
        verify(rolePermissionRepository, never()).save(any(RolePermission.class));
    }

    @Test
    void missingAdministratorFailsWithoutCreatingRolesPermissionsOrGrants() {
        when(roleRepository.findByNameIgnoreCaseForUpdate(AuthService.ADMIN_ROLE)).thenReturn(Optional.empty());
        assertThrows(IllegalStateException.class, this::seed);
        verifyNoInteractions(permissionRepository, rolePermissionRepository);
        verify(roleRepository).findByNameIgnoreCaseForUpdate(AuthService.ADMIN_ROLE);
        verifyNoMoreInteractions(roleRepository);
    }

    @Test
    void aBooleanValueDoesNotAccidentallyEnableTheSeed() {
        assertThrows(IllegalArgumentException.class,
                () -> initializer.run(new DefaultApplicationArguments("--seed-business-permissions=false")));
        verifyNoInteractions(permissionRepository, roleRepository, rolePermissionRepository);
    }

    private void seed() {
        initializer.run(new DefaultApplicationArguments("--seed-business-permissions"));
    }

    private Map<String, String> permissionModels(Map<String, String> expected) {
        Map<String, String> result = new LinkedHashMap<>();
        expected.keySet().forEach(key -> {
            Permission permission = permissions.get(key);
            if (permission != null) {
                result.put(key, permission.getModel());
            }
        });
        return result;
    }

    private Permission existing(String key, String model) {
        String[] parts = key.split(" ", 2);
        Permission permission = new Permission();
        permission.setId(nextId++);
        permission.setMethod(parts[0]);
        permission.setUrl(parts[1]);
        permission.setModel(model);
        permissions.put(key, permission);
        return permission;
    }

    private RolePermission grant(Role role, Permission permission) {
        RolePermission assignment = new RolePermission();
        assignment.setId(nextId++);
        assignment.setRole(role);
        assignment.setPermission(permission);
        assignments.put(pair(role.getId(), permission.getId()), assignment);
        return assignment;
    }

    private static Role role(Long id, String name) {
        Role role = new Role();
        role.setId(id);
        role.setName(name);
        return role;
    }

    private static String pair(Long roleId, Long permissionId) {
        return roleId + ":" + permissionId;
    }
}
