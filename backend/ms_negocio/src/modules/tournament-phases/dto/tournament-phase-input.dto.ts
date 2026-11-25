import { IsEnum, IsInt, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { PhaseType } from './phase-type';

export class TournamentPhaseInputDto {
  @IsString()
  @MaxLength(180)
  @Matches(/\S/u, { message: 'El nombre no puede estar vacio ni contener solo espacios' })
  name!: string;

  @IsEnum(PhaseType)
  type!: PhaseType;

  @IsInt()
  @Min(1)
  @Max(2147483647)
  order!: number;
}
