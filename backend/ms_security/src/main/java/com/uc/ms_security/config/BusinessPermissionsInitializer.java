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

/** Explicit, additive bootstrap for the business API permission catalog. */
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
            new Definition("TeamSport", "/negocio/team-sports/{teamId}/{sportId}", "DELETE"),
            new Definition("Player", "/negocio/players", "POST"),
            new Definition("Player", "/negocio/players", "GET"),
            new Definition("Player", "/negocio/players/{id}", "GET"),
            new Definition("Player", "/negocio/players/{id}", "PATCH"),
            new Definition("Player", "/negocio/players/{id}", "DELETE"),
            new Definition("Skill", "/negocio/habilidades", "POST"),
            new Definition("Skill", "/negocio/habilidades", "GET"),
            new Definition("Skill", "/negocio/habilidades/{id}", "GET"),
            new Definition("Skill", "/negocio/habilidades/{id}", "PATCH"),
            new Definition("Skill", "/negocio/habilidades/{id}", "DELETE"),
            new Definition("PlayerSkill", "/negocio/player-skills", "POST"),
            new Definition("PlayerSkill", "/negocio/player-skills/players/{playerId}", "GET"),
            new Definition("PlayerSkill", "/negocio/player-skills/skills/{skillId}", "GET"),
            new Definition("PlayerSkill", "/negocio/player-skills/{playerId}/{skillId}", "DELETE"),
            new Definition("PlayerTeam", "/negocio/player-teams", "POST"),
            new Definition("PlayerTeam", "/negocio/player-teams/teams/{teamId}", "GET"),
            new Definition("PlayerTeam", "/negocio/player-teams/players/{playerId}", "GET"),
            new Definition("PlayerTeam", "/negocio/player-teams/{id}/finish", "PATCH"),
            new Definition("Tournament", "/negocio/tournaments", "POST"),
            new Definition("Tournament", "/negocio/tournaments", "GET"),
            new Definition("Tournament", "/negocio/tournaments/{id}", "GET"),
            new Definition("Tournament", "/negocio/tournaments/{id}", "PATCH"),
            new Definition("Tournament", "/negocio/tournaments/{id}", "DELETE"),
            new Definition("TournamentOverview", "/negocio/tournaments/{tournamentId}/overview", "GET"),
            new Definition("MatchResult", "/negocio/tournaments/{tournamentId}/matches/{matchId}/result", "POST"),
            new Definition("MatchResult", "/negocio/tournaments/{tournamentId}/matches/{matchId}/result", "GET"),
            new Definition("MatchResult", "/negocio/tournaments/{tournamentId}/matches/{matchId}/result", "PATCH"),
            new Definition("MatchAnnotation", "/negocio/tournaments/{tournamentId}/matches/{matchId}/annotations", "POST"),
            new Definition("MatchAnnotation", "/negocio/tournaments/{tournamentId}/matches/{matchId}/annotations", "GET"),
            new Definition("MatchAnnotation", "/negocio/tournaments/{tournamentId}/matches/{matchId}/annotations/{id}", "GET"),
            new Definition("MatchAnnotation", "/negocio/tournaments/{tournamentId}/matches/{matchId}/annotations/{id}", "PATCH"),
            new Definition("MatchAnnotation", "/negocio/tournaments/{tournamentId}/matches/{matchId}/annotations/{id}", "DELETE"),
            new Definition("MatchManagement", "/negocio/tournaments/{tournamentId}/phases/{phaseId}/matches", "POST"),
            new Definition("MatchManagement", "/negocio/tournaments/{tournamentId}/phases/{phaseId}/matches", "GET"),
            new Definition("MatchManagement", "/negocio/tournaments/{tournamentId}/matches", "GET"),
            new Definition("MatchManagement", "/negocio/tournaments/{tournamentId}/matches/{id}", "GET"),
            new Definition("MatchManagement", "/negocio/tournaments/{tournamentId}/matches/{id}", "PATCH"),
            new Definition("MatchManagement", "/negocio/tournaments/{tournamentId}/matches/{id}", "DELETE"),
            new Definition("MatchManagement", "/negocio/tournaments/{tournamentId}/matches/{id}/status", "PATCH"),
            new Definition("MatchAttendance", "/negocio/matches/{matchId}/attendances", "POST"),
            new Definition("MatchAttendance", "/negocio/matches/{matchId}/attendances", "GET"),
            new Definition("MatchAttendance", "/negocio/matches/{matchId}/attendances/{fanId}", "DELETE"),
            new Definition("MatchAudience", "/negocio/matches/{matchId}/audiences/tickets", "POST"),
            new Definition("MatchAudience", "/negocio/matches/{matchId}/audiences/tickets", "GET"),
            new Definition("MatchAudience", "/negocio/matches/{matchId}/audiences/tickets/{fanId}", "DELETE"),
            new Definition("MatchAudience", "/negocio/matches/{matchId}/audiences/bets", "POST"),
            new Definition("MatchAudience", "/negocio/matches/{matchId}/audiences/bets", "GET"),
            new Definition("MatchAudience", "/negocio/matches/{matchId}/audiences/bets/{fanId}", "DELETE"),
            new Definition("Venue", "/negocio/venues", "POST"),
            new Definition("Venue", "/negocio/venues", "GET"),
            new Definition("Venue", "/negocio/venues/{id}", "GET"),
            new Definition("Venue", "/negocio/venues/{id}", "PATCH"),
            new Definition("Venue", "/negocio/venues/{id}", "DELETE"),
            new Definition("FinalPhase", "/negocio/tournaments/{tournamentId}/final-phases", "POST"),
            new Definition("FinalPhase", "/negocio/tournaments/{tournamentId}/final-phases", "GET"),
            new Definition("FinalPhase", "/negocio/tournaments/{tournamentId}/final-phases/{id}", "GET"),
            new Definition("FinalPhase", "/negocio/tournaments/{tournamentId}/final-phases/{id}/matches", "GET"),
            new Definition("FinalPhase", "/negocio/tournaments/{tournamentId}/final-phases/{id}", "PATCH"),
            new Definition("FinalPhase", "/negocio/tournaments/{tournamentId}/final-phases/{id}", "DELETE"),
            new Definition("Match", "/negocio/phases/{phaseId}/matches", "POST"),
            new Definition("Match", "/negocio/phases/{phaseId}/matches", "GET"),
            new Definition("Match", "/negocio/matches/{id}", "GET"),
            new Definition("Match", "/negocio/matches/{id}", "DELETE"),
            new Definition("CompetitionGroup", "/negocio/tournaments/{tournamentId}/phases/{phaseId}/groups", "POST"),
            new Definition("CompetitionGroup", "/negocio/tournaments/{tournamentId}/phases/{phaseId}/groups", "GET"),
            new Definition("CompetitionGroup", "/negocio/groups/{id}", "GET"),
            new Definition("CompetitionGroup", "/negocio/groups/{id}", "PATCH"),
            new Definition("CompetitionGroup", "/negocio/groups/{id}", "DELETE"),
            new Definition("TournamentPhase", "/negocio/tournaments/{tournamentId}/phases", "POST"),
            new Definition("TournamentPhase", "/negocio/tournaments/{tournamentId}/phases", "GET"),
            new Definition("TournamentPhase", "/negocio/phases/{id}", "GET"),
            new Definition("TournamentPhase", "/negocio/phases/{id}", "PATCH"),
            new Definition("TournamentPhase", "/negocio/phases/{id}", "DELETE"),
            new Definition("GroupTeam", "/negocio/groups/{groupId}/teams", "POST"),
            new Definition("GroupTeam", "/negocio/groups/{groupId}/teams", "GET"),
            new Definition("GroupTeam", "/negocio/groups/{groupId}/teams/{teamId}", "DELETE")
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
