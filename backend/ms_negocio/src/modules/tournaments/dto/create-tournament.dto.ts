import {
  IsDateString,
  IsInt,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const TIMEZONE_SUFFIX = /(?:Z|[+-]\d{2}:\d{2})$/i;

export class CreateTournamentDto {
  @IsString()
  @MaxLength(180)
  @Matches(/\S/u, { message: 'El nombre no puede estar vacio ni contener solo espacios' })
  name!: string;

  @IsInt()
  @Min(1)
  @Max(2147483647)
  sportId!: number;

  @IsDateString({ strict: true })
  @Matches(TIMEZONE_SUFFIX, { message: 'La fecha debe incluir zona horaria, por ejemplo Z' })
  registrationStartsAt!: string;

  @IsDateString({ strict: true })
  @Matches(TIMEZONE_SUFFIX, { message: 'La fecha debe incluir zona horaria, por ejemplo Z' })
  registrationEndsAt!: string;

  @IsDateString({ strict: true })
  @Matches(TIMEZONE_SUFFIX, { message: 'La fecha debe incluir zona horaria, por ejemplo Z' })
  startsAt!: string;
}
