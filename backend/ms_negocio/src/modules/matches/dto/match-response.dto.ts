import { PhaseType } from '../../tournament-phases/dto/phase-type';
import type { NotificationSummaryDto } from '../../match-management/dto/managed-match-response.dto';

export class MatchResponseDto {
  id!: number;
  phaseId!: number;
  phaseName!: string;
  phaseType!: PhaseType;
  tournamentId!: number;
  /** true cuando el partido pertenece a una fase de tipo final. */
  isFinalPhase!: boolean;
  homeTeamId!: number;
  homeTeamName!: string;
  awayTeamId!: number;
  awayTeamName!: string;
  scheduledAt!: string;
  notification?: NotificationSummaryDto;
}
