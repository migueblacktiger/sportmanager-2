import { IsEnum } from 'class-validator';
import { MatchStatus } from './match-status';

export class UpdateMatchStatusDto {
  @IsEnum(MatchStatus)
  status!: MatchStatus;
}
