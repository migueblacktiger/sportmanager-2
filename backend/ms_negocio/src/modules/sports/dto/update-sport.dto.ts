import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, ValidateIf } from 'class-validator';
import { CreateSportDto } from './create-sport.dto';

// Missing fields preserve their values; null is valid only for nullable fields.
export class UpdateSportDto extends PartialType(CreateSportDto, {
  skipNullProperties: false,
}) {
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsBoolean()
  active?: boolean;
}
