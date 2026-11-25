import { MatchStatus } from '../match-management/dto/match-status';
import { PhaseType } from '../tournament-phases/dto/phase-type';

/** Filas planas ya leidas de la base; el armado de la vista no depende de TypeORM. */
export interface SourceTeam { id: number; name: string }

export interface SourceTournament {
  id: number;
  name: string;
  sportId: number;
  sportName: string | null;
  registrationStartsAt: Date;
  registrationEndsAt: Date;
  startsAt: Date;
}

export interface SourcePhase { id: number; name: string; type: PhaseType; phaseOrder: number }
export interface SourceGroup { id: number; phaseId: number; name: string }
export interface SourceGroupTeam { groupId: number; phaseId: number; team: SourceTeam }

export interface SourceMatch {
  id: number;
  phaseId: number;
  home: SourceTeam;
  away: SourceTeam;
  scheduledAt: Date;
  status: MatchStatus;
  venue: { id: number; name: string } | null;
}

export interface SourceResult { matchId: number; homeScore: number; awayScore: number; updatedAt: Date }

export interface SourceAnnotation {
  id: number;
  matchId: number;
  playerId: number;
  playerName: string;
  team: SourceTeam;
  minute: number | null;
  points: number;
  description: string | null;
  createdAt: Date;
}

export interface OverviewSource {
  tournament: SourceTournament;
  phases: SourcePhase[];
  groups: SourceGroup[];
  groupTeams: SourceGroupTeam[];
  matches: SourceMatch[];
  results: SourceResult[];
  /** null cuando no se solicitaron. */
  annotations: SourceAnnotation[] | null;
}
