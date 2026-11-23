import { PlayerResponseDto } from '../../players/dto/player-response.dto';
import { TeamResponseDto } from '../../teams/dto/team-response.dto';
import { PlayerTeamStatus } from './player-team-status';

export class PlayerTeamResponseDto {
  id!: number;
  playerId!: number;
  teamId!: number;
  startDate!: string;
  endDate!: string;
  finishedAt!: string | null;
  status!: PlayerTeamStatus;
  player!: PlayerResponseDto;
  team!: TeamResponseDto;
}
