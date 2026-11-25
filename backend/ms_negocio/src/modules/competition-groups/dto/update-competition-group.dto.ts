import { PartialType } from '@nestjs/mapped-types';
import { CompetitionGroupInputDto } from './competition-group-input.dto';

// La fase de un grupo no se puede cambiar: phaseId no forma parte del contrato.
export class UpdateCompetitionGroupDto extends PartialType(CompetitionGroupInputDto, {
  skipNullProperties: false,
}) {}
