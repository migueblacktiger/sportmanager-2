import { PartialType } from '@nestjs/mapped-types';
import { TournamentPhaseInputDto } from './tournament-phase-input.dto';

// El torneo de una fase no se puede cambiar: tournamentId no forma parte del contrato.
export class UpdateTournamentPhaseDto extends PartialType(TournamentPhaseInputDto, {
  skipNullProperties: false,
}) {}
