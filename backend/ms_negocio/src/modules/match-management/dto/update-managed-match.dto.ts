import { IsDateString, IsInt, IsOptional, Matches, Max, Min, ValidateIf } from 'class-validator';

const TIMEZONE_SUFFIX = /(?:Z|[+-]\d{2}:\d{2})$/i;
const defined = (_object: unknown, value: unknown): boolean => value !== undefined;

// Los campos omitidos conservan su valor; solo venueId acepta null (quita el escenario).
export class UpdateManagedMatchDto {
  @ValidateIf(defined)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  homeTeamId?: number;

  @ValidateIf(defined)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  awayTeamId?: number;

  @ValidateIf(defined)
  @IsDateString({ strict: true })
  @Matches(TIMEZONE_SUFFIX, { message: 'La fecha debe incluir zona horaria, por ejemplo Z' })
  scheduledAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2147483647)
  venueId?: number | null;
}
