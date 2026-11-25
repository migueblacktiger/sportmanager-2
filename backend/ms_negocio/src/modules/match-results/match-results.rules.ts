import { MatchStatus } from '../match-management/dto/match-status';
import { PlayerTeam } from '../player-teams/entities/player-team.entity';
import { bogotaMidnight } from '../player-teams/player-team-dates';
import { MatchResultsInputInvalidError } from './match-results.errors';

const MAX_DATABASE_ID = 2147483647;

/** Estados en los que se registran o modifican resultado y anotaciones. */
export const SCORING_STATUSES: readonly MatchStatus[] = [MatchStatus.InProgress, MatchStatus.Finished];

export function validateId(id: number): void {
  if (!Number.isSafeInteger(id) || id < 1 || id > MAX_DATABASE_ID) {
    throw new MatchResultsInputInvalidError('El identificador debe ser un entero positivo de hasta 2147483647');
  }
}

/**
 * El contrato rige en `instant` (ms) si cae en su intervalo efectivo: desde la medianoche de Bogota del
 * dia de inicio hasta la medianoche posterior al ultimo dia, recortado por la retirada anticipada.
 */
export function isContractEffectiveAt(contract: PlayerTeam, instant: number): boolean {
  const start = bogotaMidnight(contract.startDate);
  const end = Math.min(bogotaMidnight(contract.endDate, true), contract.finishedAt?.getTime() ?? Infinity);
  return start <= instant && instant < end;
}
