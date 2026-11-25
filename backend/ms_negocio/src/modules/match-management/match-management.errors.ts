import { HttpStatus } from '@nestjs/common';
import { MatchStatus } from './dto/match-status';

/** Base de los errores del modulo; `status` es el codigo HTTP que usa el filtro. */
export abstract class MatchManagementError extends Error {
  abstract readonly status: HttpStatus;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class MatchManagementInputInvalidError extends MatchManagementError {
  readonly status = HttpStatus.BAD_REQUEST;
  constructor(message = 'La solicitud no es valida') { super(message); }
}

export class MatchManagementTournamentNotFoundError extends MatchManagementError {
  readonly status = HttpStatus.NOT_FOUND;
  constructor(id: number) { super(`Torneo con id ${id} no encontrado`); }
}

export class MatchManagementPhaseNotFoundError extends MatchManagementError {
  readonly status = HttpStatus.NOT_FOUND;
  constructor(id: number, tournamentId: number) {
    super(`Fase con id ${id} no encontrada en el torneo ${tournamentId}`);
  }
}

export class MatchManagementMatchNotFoundError extends MatchManagementError {
  readonly status = HttpStatus.NOT_FOUND;
  constructor(id: number, tournamentId?: number) {
    super(tournamentId === undefined
      ? `Partido con id ${id} no encontrado`
      : `Partido con id ${id} no encontrado en el torneo ${tournamentId}`);
  }
}

export class MatchManagementTeamNotFoundError extends MatchManagementError {
  readonly status = HttpStatus.NOT_FOUND;
  constructor(id: number) { super(`Equipo con id ${id} no encontrado`); }
}

export class MatchManagementVenueNotFoundError extends MatchManagementError {
  readonly status = HttpStatus.NOT_FOUND;
  constructor(id: number) { super(`Escenario con id ${id} no encontrado`); }
}

export class MatchManagementTeamNotEnabledError extends MatchManagementError {
  readonly status = HttpStatus.CONFLICT;
  constructor(teamId: number, reason: 'inactive' | 'not-registered', tournamentId: number) {
    super(reason === 'inactive'
      ? `El equipo ${teamId} esta inactivo y no puede participar en la competencia`
      : `El equipo ${teamId} no esta inscrito en el torneo ${tournamentId}`);
  }
}

export class MatchManagementVenueInactiveError extends MatchManagementError {
  readonly status = HttpStatus.CONFLICT;
  constructor(id: number) { super(`El escenario ${id} esta inactivo y no puede asignarse a un partido`); }
}

export class MatchManagementNotEditableError extends MatchManagementError {
  readonly status = HttpStatus.CONFLICT;
  constructor(id: number, status: MatchStatus) {
    super(`El partido ${id} esta en estado '${status}' y su informacion ya no se puede actualizar`);
  }
}

export class MatchManagementInvalidTransitionError extends MatchManagementError {
  readonly status = HttpStatus.CONFLICT;
  constructor(id: number, from: MatchStatus, to: MatchStatus) {
    super(`El partido ${id} no puede pasar del estado '${from}' a '${to}'`);
  }
}

export class MatchManagementResultPresentError extends MatchManagementError {
  readonly status = HttpStatus.CONFLICT;
  constructor(id: number) {
    super(`No se puede cancelar el partido ${id} porque ya tiene un resultado registrado`);
  }
}

export class MatchManagementNotDeletableError extends MatchManagementError {
  readonly status = HttpStatus.CONFLICT;
  constructor(id: number, reason: 'status' | 'attendances' | 'references' | 'result', status?: MatchStatus) {
    super(reason === 'status'
      ? `El partido ${id} esta en estado '${status}' y no se puede eliminar`
      : reason === 'attendances'
        ? `El partido ${id} tiene participaciones de aficionados asociadas y no se puede eliminar`
        : reason === 'result'
          ? `El partido ${id} tiene un resultado registrado y no se puede eliminar`
          : `El partido ${id} tiene informacion asociada y no se puede eliminar`);
  }
}

export class MatchManagementReferenceConflictError extends MatchManagementError {
  readonly status = HttpStatus.CONFLICT;
  constructor() {
    super('Un torneo, fase, equipo o escenario cambio durante la operacion; actualice los datos e intentelo nuevamente');
  }
}

export class MatchManagementAttendanceNotAllowedError extends MatchManagementError {
  readonly status = HttpStatus.CONFLICT;
  constructor(matchId: number, status: MatchStatus) {
    super(`El partido ${matchId} esta en estado '${status}'; solo se registra participacion en partidos en juego o finalizados`);
  }
}

export class MatchManagementAttendanceDuplicateError extends MatchManagementError {
  readonly status = HttpStatus.CONFLICT;
  constructor(matchId: number, fanId: number) {
    super(`El aficionado ${fanId} ya tiene registrada su participacion en el partido ${matchId}`);
  }
}

export class MatchManagementAttendanceNotFoundError extends MatchManagementError {
  readonly status = HttpStatus.NOT_FOUND;
  constructor(matchId: number, fanId: number) {
    super(`No existe la participacion del aficionado ${fanId} en el partido ${matchId}`);
  }
}
