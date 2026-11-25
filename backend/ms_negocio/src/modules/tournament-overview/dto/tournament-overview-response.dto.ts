import { MatchStatus } from '../../match-management/dto/match-status';
import { PhaseType } from '../../tournament-phases/dto/phase-type';

export type MatchResultStatus = 'registered' | 'pending';

export class TeamRefDto {
  id!: number;
  name!: string;
}

export class TournamentInfoDto {
  id!: number;
  name!: string;
  sportId!: number;
  sportName!: string | null;
  registrationStartsAt!: string;
  registrationEndsAt!: string;
  startsAt!: string;
}

export class OverviewSummaryDto {
  phases!: number;
  groups!: number;
  matches!: number;
  matchesWithResult!: number;
  matchesPending!: number;
}

export class StandingRowDto {
  position!: number;
  teamId!: number;
  teamName!: string;
  played!: number;
  won!: number;
  drawn!: number;
  lost!: number;
  goalsFor!: number;
  goalsAgainst!: number;
  goalDifference!: number;
  points!: number;
}

export class AnnotationOverviewDto {
  id!: number;
  playerId!: number;
  playerName!: string;
  teamId!: number;
  teamName!: string;
  minute!: number | null;
  points!: number;
  description!: string | null;
  createdAt!: string;
}

export class ResultOverviewDto {
  homeScore!: number;
  awayScore!: number;
  /** Solo con el partido finalizado y marcador distinto; null en cualquier otro caso. */
  winnerTeamId!: number | null;
  updatedAt!: string;
}

export class VenueRefDto {
  id!: number;
  name!: string;
}

export class MatchOverviewDto {
  id!: number;
  phaseId!: number;
  /** Grupo al que pertenecen ambos equipos en la fase; null si no aplica. */
  groupId!: number | null;
  homeTeam!: TeamRefDto;
  awayTeam!: TeamRefDto;
  scheduledAt!: string;
  status!: MatchStatus;
  venue!: VenueRefDto | null;
  resultStatus!: MatchResultStatus;
  result!: ResultOverviewDto | null;
  /** null cuando no se solicitaron (includeAnnotations distinto de true). */
  annotations!: AnnotationOverviewDto[] | null;
}

export class GroupOverviewDto {
  id!: number;
  name!: string;
  teams!: TeamRefDto[];
  standings!: StandingRowDto[];
}

export class BracketSideDto {
  teamId!: number;
  teamName!: string;
  score!: number | null;
}

export class BracketTieDto {
  matchId!: number;
  homeTeam!: BracketSideDto;
  awayTeam!: BracketSideDto;
  scheduledAt!: string;
  status!: MatchStatus;
  resultStatus!: MatchResultStatus;
  winnerTeamId!: number | null;
}

export class BracketDto {
  /** Orden de la fase dentro del torneo (ronda de la llave). */
  round!: number;
  ties!: BracketTieDto[];
}

export class MatchSummaryDto {
  total!: number;
  withResult!: number;
  pending!: number;
}

export class PhaseOverviewDto {
  id!: number;
  name!: string;
  type!: PhaseType;
  order!: number;
  isFinalPhase!: boolean;
  groups!: GroupOverviewDto[];
  /** Tabla de posiciones de una fase tipo liga; null en las demas. */
  standings!: StandingRowDto[] | null;
  /** Llaves de una fase eliminatoria o final; null en las demas. */
  bracket!: BracketDto | null;
  matchSummary!: MatchSummaryDto;
  matches!: MatchOverviewDto[];
}

export class TournamentOverviewResponseDto {
  tournament!: TournamentInfoDto;
  summary!: OverviewSummaryDto;
  phases!: PhaseOverviewDto[];
}
