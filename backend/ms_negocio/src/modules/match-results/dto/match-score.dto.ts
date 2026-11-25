import { IsInt, Max, Min } from 'class-validator';

export const MAX_SCORE = 1000;

export class MatchScoreDto {
  /** Equipo participante en el partido (local o visitante). */
  @IsInt()
  @Min(1)
  @Max(2147483647)
  teamId!: number;

  @IsInt()
  @Min(0)
  @Max(MAX_SCORE)
  score!: number;
}
