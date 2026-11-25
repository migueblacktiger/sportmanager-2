import { PartialType } from '@nestjs/mapped-types';
import { CreateFinalPhaseDto } from './create-final-phase.dto';

// Ni el tipo ni el torneo de una fase final se pueden cambiar: no forman parte del contrato.
export class UpdateFinalPhaseDto extends PartialType(CreateFinalPhaseDto, {
  skipNullProperties: false,
}) {}
