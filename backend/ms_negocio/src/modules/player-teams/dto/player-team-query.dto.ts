import { IsEnum, ValidateIf } from 'class-validator';
import { PlayerTeamStatus } from './player-team-status';

export class PlayerTeamQueryDto {
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsEnum(PlayerTeamStatus)
  status?: PlayerTeamStatus;
}
