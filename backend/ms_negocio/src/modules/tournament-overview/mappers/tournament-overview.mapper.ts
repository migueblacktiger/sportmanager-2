import { Injectable } from '@nestjs/common';
import { DEFAULT_MATCH_STATUS } from '../../match-management/dto/match-status';
import type { TournamentOverviewResponseDto } from '../dto/tournament-overview-response.dto';
import type { OverviewSource } from '../overview-source';
import type { TournamentOverviewData } from '../repositories/tournament-overview.repository';
import { buildTournamentOverview } from './tournament-overview.builder';

@Injectable()
export class TournamentOverviewMapper {
  toSource(data: TournamentOverviewData): OverviewSource {
    const detailByMatch = new Map(data.details.map((detail) => [detail.matchId, detail]));
    return {
      tournament: {
        id: data.tournament.id,
        name: data.tournament.name,
        sportId: data.tournament.sportId,
        sportName: data.sport?.name ?? null,
        registrationStartsAt: data.tournament.registrationStartsAt,
        registrationEndsAt: data.tournament.registrationEndsAt,
        startsAt: data.tournament.startsAt,
      },
      phases: data.phases.map((phase) => ({
        id: phase.id, name: phase.name, type: phase.type, phaseOrder: phase.phaseOrder,
      })),
      groups: data.groups.map((group) => ({ id: group.id, phaseId: group.phaseId, name: group.name })),
      groupTeams: data.groupTeams.map((item) => ({
        groupId: item.groupId,
        phaseId: item.phaseId,
        team: { id: item.team.id, name: item.team.name },
      })),
      matches: data.matches.map((match) => {
        const detail = detailByMatch.get(match.id);
        return {
          id: match.id,
          phaseId: match.phaseId,
          home: { id: match.homeTeam.id, name: match.homeTeam.name },
          away: { id: match.awayTeam.id, name: match.awayTeam.name },
          scheduledAt: match.scheduledAt,
          // Un partido sin fila en match_details se considera programado (igual que match-management).
          status: detail?.status ?? DEFAULT_MATCH_STATUS,
          venue: detail?.venue ? { id: detail.venue.id, name: detail.venue.name } : null,
        };
      }),
      results: data.results.map((result) => ({
        matchId: result.matchId,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        updatedAt: result.updatedAt,
      })),
      annotations: data.annotations === null ? null : data.annotations.map((annotation) => ({
        id: annotation.id,
        matchId: annotation.matchId,
        playerId: annotation.playerId,
        playerName: annotation.player.name,
        team: { id: annotation.team.id, name: annotation.team.name },
        minute: annotation.minute,
        points: annotation.points,
        description: annotation.description,
        createdAt: annotation.createdAt,
      })),
    };
  }

  toOverviewDto(data: TournamentOverviewData, includeAnnotations: boolean): TournamentOverviewResponseDto {
    return buildTournamentOverview(this.toSource(data), includeAnnotations);
  }
}
