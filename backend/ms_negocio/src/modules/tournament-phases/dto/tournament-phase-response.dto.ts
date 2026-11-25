import { PhaseType } from './phase-type';

export class TournamentPhaseResponseDto {
  id!: number;
  tournamentId!: number;
  name!: string;
  type!: PhaseType;
  order!: number;
}
