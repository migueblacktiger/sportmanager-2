import { IsDateString, IsInt, Matches, Max, Min } from 'class-validator';

export class CreatePlayerTeamDto {
  @IsInt()
  @Min(1)
  @Max(2147483647)
  playerId!: number;

  @IsInt()
  @Min(1)
  @Max(2147483647)
  teamId!: number;

  @Matches(/^[1-9][0-9]{3}-[0-9]{2}-[0-9]{2}$/, { message: 'startDate debe tener formato YYYY-MM-DD' })
  @IsDateString({ strict: true })
  startDate!: string;

  @Matches(/^[1-9][0-9]{3}-[0-9]{2}-[0-9]{2}$/, { message: 'endDate debe tener formato YYYY-MM-DD' })
  @IsDateString({ strict: true })
  endDate!: string;
}
