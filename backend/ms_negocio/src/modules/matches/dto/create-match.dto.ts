import {
  IsDateString, IsInt, IsOptional, Matches, Max, Min,
} from 'class-validator';

const TIMEZONE_SUFFIX = /(?:Z|[+-]\d{2}:\d{2})$/i;

export class CreateMatchDto {
  @IsInt()
  @Min(1)
  @Max(2147483647)
  homeTeamId!: number;

  @IsInt()
  @Min(1)
  @Max(2147483647)
  awayTeamId!: number;

  @IsDateString({ strict: true })
  @Matches(TIMEZONE_SUFFIX, { message: 'La fecha debe incluir zona horaria, por ejemplo Z' })
  scheduledAt!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2147483647)
  venueId?: number | null;
}
