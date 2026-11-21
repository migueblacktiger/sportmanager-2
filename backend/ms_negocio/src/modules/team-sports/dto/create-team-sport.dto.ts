import { IsInt, Max, Min } from 'class-validator';

export class CreateTeamSportDto {
  @IsInt()
  @Min(1)
  @Max(2147483647)
  teamId!: number;

  @IsInt()
  @Min(1)
  @Max(2147483647)
  sportId!: number;
}
