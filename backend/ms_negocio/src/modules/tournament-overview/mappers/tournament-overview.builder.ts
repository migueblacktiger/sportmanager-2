import { MatchStatus } from '../../match-management/dto/match-status';
import { PhaseType } from '../../tournament-phases/dto/phase-type';
import type {
  AnnotationOverviewDto, BracketDto, GroupOverviewDto, MatchOverviewDto, MatchResultStatus,
  PhaseOverviewDto, ResultOverviewDto, StandingRowDto, TeamRefDto, TournamentOverviewResponseDto,
} from '../dto/tournament-overview-response.dto';
import type {
  OverviewSource, SourceAnnotation, SourceMatch, SourceResult, SourceTeam,
} from '../overview-source';
import { computeStandings } from '../rules/standings';

const BRACKET_TYPES: readonly PhaseType[] = [PhaseType.Knockout, PhaseType.Final];

/**
 * Arma la vista del torneo solo con lo que pertenece a el: ignora cualquier fila cuya fase, grupo o
 * partido no cuelgue de las fases recibidas. Funcion pura, sin acceso a la base de datos.
 */
export function buildTournamentOverview(
  source: OverviewSource,
  includeAnnotations: boolean,
): TournamentOverviewResponseDto {
  const phases = [...source.phases].sort((a, b) => a.phaseOrder - b.phaseOrder || a.id - b.id);
  const phaseIds = new Set(phases.map((phase) => phase.id));

  const matches = source.matches
    .filter((match) => phaseIds.has(match.phaseId))
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime() || a.id - b.id);
  const matchIds = new Set(matches.map((match) => match.id));

  const resultsByMatch = new Map<number, SourceResult>();
  for (const result of source.results) {
    if (matchIds.has(result.matchId)) resultsByMatch.set(result.matchId, result);
  }

  const annotationsByMatch = new Map<number, SourceAnnotation[]>();
  if (includeAnnotations) {
    for (const annotation of source.annotations ?? []) {
      if (!matchIds.has(annotation.matchId)) continue;
      const list = annotationsByMatch.get(annotation.matchId) ?? [];
      list.push(annotation);
      annotationsByMatch.set(annotation.matchId, list);
    }
  }

  const groups = source.groups.filter((group) => phaseIds.has(group.phaseId));
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const groupTeams = source.groupTeams
    .filter((item) => groupById.get(item.groupId)?.phaseId === item.phaseId);

  // Por fase: equipo -> grupo (un equipo esta en un solo grupo por fase).
  const teamGroupByPhase = new Map<number, Map<number, number>>();
  for (const item of groupTeams) {
    const byTeam = teamGroupByPhase.get(item.phaseId) ?? new Map<number, number>();
    byTeam.set(item.team.id, item.groupId);
    teamGroupByPhase.set(item.phaseId, byTeam);
  }

  const toMatchDto = (match: SourceMatch): MatchOverviewDto => {
    const byTeam = teamGroupByPhase.get(match.phaseId);
    const homeGroup = byTeam?.get(match.home.id);
    const awayGroup = byTeam?.get(match.away.id);
    const result = resultsByMatch.get(match.id) ?? null;
    return {
      id: match.id,
      phaseId: match.phaseId,
      groupId: homeGroup !== undefined && homeGroup === awayGroup ? homeGroup : null,
      homeTeam: teamRef(match.home),
      awayTeam: teamRef(match.away),
      scheduledAt: match.scheduledAt.toISOString(),
      status: match.status,
      venue: match.venue ? { id: match.venue.id, name: match.venue.name } : null,
      resultStatus: resultStatusOf(result),
      result: result ? resultDto(match, result) : null,
      annotations: includeAnnotations ? annotationDtos(annotationsByMatch.get(match.id) ?? []) : null,
    };
  };

  /** Solo cuentan para posiciones los partidos finalizados con resultado registrado. */
  const standingMatches = (list: SourceMatch[]) => list.flatMap((match) => {
    const result = resultsByMatch.get(match.id);
    if (!result || match.status !== MatchStatus.Finished) return [];
    return [{
      homeTeamId: match.home.id, awayTeamId: match.away.id,
      homeScore: result.homeScore, awayScore: result.awayScore,
    }];
  });

  const phaseDtos: PhaseOverviewDto[] = phases.map((phase) => {
    const phaseMatches = matches.filter((match) => match.phaseId === phase.id);
    const matchDtos = phaseMatches.map(toMatchDto);
    const byTeam = teamGroupByPhase.get(phase.id);

    const groupDtos: GroupOverviewDto[] = groups
      .filter((group) => group.phaseId === phase.id)
      .sort((a, b) => a.name.localeCompare(b.name, 'es') || a.id - b.id)
      .map((group) => {
        const teams = groupTeams
          .filter((item) => item.groupId === group.id)
          .map((item) => item.team)
          .sort((a, b) => a.name.localeCompare(b.name, 'es') || a.id - b.id);
        const own = phaseMatches.filter((match) =>
          byTeam?.get(match.home.id) === group.id && byTeam?.get(match.away.id) === group.id);
        return {
          id: group.id,
          name: group.name,
          teams: teams.map(teamRef),
          standings: computeStandings(teams, standingMatches(own)),
        };
      });

    let standings: StandingRowDto[] | null = null;
    if (phase.type === PhaseType.League) {
      const teams = new Map<number, SourceTeam>();
      for (const match of phaseMatches) {
        teams.set(match.home.id, match.home);
        teams.set(match.away.id, match.away);
      }
      standings = computeStandings([...teams.values()], standingMatches(phaseMatches));
    }

    const withResult = matchDtos.filter((match) => match.resultStatus === 'registered').length;
    return {
      id: phase.id,
      name: phase.name,
      type: phase.type,
      order: phase.phaseOrder,
      isFinalPhase: phase.type === PhaseType.Final,
      groups: groupDtos,
      standings,
      bracket: BRACKET_TYPES.includes(phase.type) ? bracketOf(phase.phaseOrder, matchDtos) : null,
      matchSummary: { total: matchDtos.length, withResult, pending: matchDtos.length - withResult },
      matches: matchDtos,
    };
  });

  const totalMatches = phaseDtos.reduce((sum, phase) => sum + phase.matchSummary.total, 0);
  const totalWithResult = phaseDtos.reduce((sum, phase) => sum + phase.matchSummary.withResult, 0);
  const { tournament } = source;
  return {
    tournament: {
      id: tournament.id,
      name: tournament.name,
      sportId: tournament.sportId,
      sportName: tournament.sportName,
      registrationStartsAt: tournament.registrationStartsAt.toISOString(),
      registrationEndsAt: tournament.registrationEndsAt.toISOString(),
      startsAt: tournament.startsAt.toISOString(),
    },
    summary: {
      phases: phaseDtos.length,
      groups: phaseDtos.reduce((sum, phase) => sum + phase.groups.length, 0),
      matches: totalMatches,
      matchesWithResult: totalWithResult,
      matchesPending: totalMatches - totalWithResult,
    },
    phases: phaseDtos,
  };
}

function teamRef(team: SourceTeam): TeamRefDto {
  return { id: team.id, name: team.name };
}

function resultStatusOf(result: SourceResult | null): MatchResultStatus {
  return result ? 'registered' : 'pending';
}

function resultDto(match: SourceMatch, result: SourceResult): ResultOverviewDto {
  return {
    homeScore: result.homeScore,
    awayScore: result.awayScore,
    winnerTeamId: winnerOf(match, result),
    updatedAt: result.updatedAt.toISOString(),
  };
}

/** Ganador solo con el partido finalizado y marcador distinto (los empates no tienen ganador). */
function winnerOf(match: SourceMatch, result: SourceResult): number | null {
  if (match.status !== MatchStatus.Finished || result.homeScore === result.awayScore) return null;
  return result.homeScore > result.awayScore ? match.home.id : match.away.id;
}

function annotationDtos(list: SourceAnnotation[]): AnnotationOverviewDto[] {
  return [...list]
    .sort((a, b) => (a.minute ?? Number.MAX_SAFE_INTEGER) - (b.minute ?? Number.MAX_SAFE_INTEGER) || a.id - b.id)
    .map((annotation) => ({
      id: annotation.id,
      playerId: annotation.playerId,
      playerName: annotation.playerName,
      teamId: annotation.team.id,
      teamName: annotation.team.name,
      minute: annotation.minute,
      points: annotation.points,
      description: annotation.description,
      createdAt: annotation.createdAt.toISOString(),
    }));
}

function bracketOf(round: number, matches: MatchOverviewDto[]): BracketDto {
  return {
    round,
    ties: matches.map((match) => ({
      matchId: match.id,
      homeTeam: { teamId: match.homeTeam.id, teamName: match.homeTeam.name, score: match.result?.homeScore ?? null },
      awayTeam: { teamId: match.awayTeam.id, teamName: match.awayTeam.name, score: match.result?.awayScore ?? null },
      scheduledAt: match.scheduledAt,
      status: match.status,
      resultStatus: match.resultStatus,
      winnerTeamId: match.result?.winnerTeamId ?? null,
    })),
  };
}
