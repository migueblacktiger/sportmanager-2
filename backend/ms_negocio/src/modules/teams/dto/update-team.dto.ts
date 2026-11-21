import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, ValidateIf } from 'class-validator';
import { CreateTeamDto } from './create-team.dto';

// Omitted fields preserve their values; only description accepts explicit null.
export class UpdateTeamDto extends PartialType(CreateTeamDto, {
  skipNullProperties: false,
}) {
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsBoolean()
  active?: boolean;
}
