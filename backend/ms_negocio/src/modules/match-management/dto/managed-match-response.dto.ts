import { PhaseType } from '../../tournament-phases/dto/phase-type';
import { MatchStatus } from './match-status';

export class VenueSummaryDto {
  id!: number;
  name!: string;
  address!: string | null;
  active!: boolean;
}

export class NotificationSummaryDto {
  /** Aficionados con correo a los que se intento notificar. */
  recipients!: number;
  sent!: number;
  failed!: number;
  /** true cuando el envio no se intento (adaptadores sin configurar). */
  skipped!: boolean;
  reason?: string;
}

export class ManagedMatchResponseDto {
  id!: number;
  tournamentId!: number;
  phaseId!: number;
  phaseName!: string;
  phaseType!: PhaseType;
  isFinalPhase!: boolean;
  homeTeamId!: number;
  homeTeamName!: string;
  awayTeamId!: number;
  awayTeamName!: string;
  scheduledAt!: string;
  status!: MatchStatus;
  venue!: VenueSummaryDto | null;
  attendanceCount!: number;
  notification?: NotificationSummaryDto;
}

export class CreatedManagedMatchResponseDto extends ManagedMatchResponseDto {
  declare notification: NotificationSummaryDto;
}
