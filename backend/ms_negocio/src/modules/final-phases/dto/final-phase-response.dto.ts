import { PhaseType } from '../../tournament-phases/dto/phase-type';

export class FinalPhaseResponseDto {
  id!: number;
  tournamentId!: number;
  name!: string;
  type!: PhaseType.Final;
  order!: number;
  /** Partidos que pertenecen a esta fase final. */
  matchCount!: number;
}
