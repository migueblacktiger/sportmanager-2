import { NotificationSummaryDto } from '../../match-management/dto/managed-match-response.dto';

export class MatchAnnotationResponseDto {
  id!: number;
  matchId!: number;
  tournamentId!: number;
  playerId!: number;
  playerName!: string;
  teamId!: number;
  teamName!: string;
  minute!: number | null;
  points!: number;
  description!: string | null;
  createdAt!: string;
}

export class CreatedMatchAnnotationResponseDto extends MatchAnnotationResponseDto {
  notification!: NotificationSummaryDto;
}
