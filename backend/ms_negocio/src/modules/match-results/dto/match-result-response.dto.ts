import { MatchStatus } from '../../match-management/dto/match-status';
import { NotificationSummaryDto } from '../../match-management/dto/managed-match-response.dto';

export class MatchResultResponseDto {
  id!: number;
  matchId!: number;
  tournamentId!: number;
  matchStatus!: MatchStatus;
  homeTeamId!: number;
  homeTeamName!: string;
  homeScore!: number;
  awayTeamId!: number;
  awayTeamName!: string;
  awayScore!: number;
  /** null en caso de empate. */
  winnerTeamId!: number | null;
  updatedAt!: string;
}

export class MatchResultWithNotificationResponseDto extends MatchResultResponseDto {
  /** Resumen del envio del resultado final; null si en esta operacion no correspondia notificar. */
  notification!: NotificationSummaryDto | null;
}
