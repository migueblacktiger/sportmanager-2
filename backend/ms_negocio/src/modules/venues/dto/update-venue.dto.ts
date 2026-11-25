import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, ValidateIf } from 'class-validator';
import { CreateVenueDto } from './create-venue.dto';

// Los campos omitidos conservan su valor; address y description aceptan null explicito.
export class UpdateVenueDto extends PartialType(CreateVenueDto, { skipNullProperties: false }) {
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsBoolean()
  active?: boolean;
}
