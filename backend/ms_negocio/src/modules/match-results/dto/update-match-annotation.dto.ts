import { PartialType } from '@nestjs/mapped-types';
import { CreateMatchAnnotationDto } from './create-match-annotation.dto';

// Los campos omitidos conservan su valor; null solo limpia minute y description.
export class UpdateMatchAnnotationDto extends PartialType(CreateMatchAnnotationDto, {
  skipNullProperties: false,
}) {}
