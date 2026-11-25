export enum MatchStatus {
  Scheduled = 'scheduled',
  InProgress = 'in_progress',
  Finished = 'finished',
  Cancelled = 'cancelled',
  Postponed = 'postponed',
}

/** Un partido sin fila en match_details (creado por el modulo base matches) se considera programado. */
export const DEFAULT_MATCH_STATUS = MatchStatus.Scheduled;

/** Estados en los que se puede actualizar la informacion del partido (equipos, fecha, escenario). */
export const EDITABLE_STATUSES: readonly MatchStatus[] = [MatchStatus.Scheduled, MatchStatus.Postponed];

/** Estados en los que se puede eliminar: no se borra un partido en juego ni uno ya disputado. */
export const DELETABLE_STATUSES: readonly MatchStatus[] = [
  MatchStatus.Scheduled, MatchStatus.Postponed, MatchStatus.Cancelled,
];

/** Estados en los que un aficionado puede registrar su participacion. */
export const ATTENDANCE_STATUSES: readonly MatchStatus[] = [MatchStatus.InProgress, MatchStatus.Finished];

export const STATUS_TRANSITIONS: Readonly<Record<MatchStatus, readonly MatchStatus[]>> = {
  [MatchStatus.Scheduled]: [MatchStatus.InProgress, MatchStatus.Postponed, MatchStatus.Cancelled],
  [MatchStatus.Postponed]: [MatchStatus.Scheduled, MatchStatus.Cancelled],
  [MatchStatus.InProgress]: [MatchStatus.Finished, MatchStatus.Cancelled],
  [MatchStatus.Finished]: [],
  [MatchStatus.Cancelled]: [],
};

export function canTransition(from: MatchStatus, to: MatchStatus): boolean {
  return STATUS_TRANSITIONS[from].includes(to);
}
