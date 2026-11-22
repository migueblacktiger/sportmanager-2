import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, ValidateIf } from 'class-validator';
import { CreatePlayerDto } from './create-player.dto';

// Omitted fields preserve their values; only description accepts explicit null.
export class UpdatePlayerDto extends PartialType(CreatePlayerDto, {
  skipNullProperties: false,
}) {
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsBoolean()
  active?: boolean;
}
