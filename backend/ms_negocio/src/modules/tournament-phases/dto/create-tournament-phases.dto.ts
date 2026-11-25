import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { TournamentPhaseInputDto } from './tournament-phase-input.dto';

export class CreateTournamentPhasesDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => TournamentPhaseInputDto)
  phases!: TournamentPhaseInputDto[];
}
