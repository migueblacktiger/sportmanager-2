import { HttpStatus } from '@nestjs/common';
import { MatchStatus } from '../match-management/dto/match-status';

/** Base de los errores del modulo; `status` es el codigo HTTP que usa el filtro. */
export abstract class MatchResultsError extends Error {
  abstract readonly status: HttpStatus;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class MatchResultsInputInvalidError extends MatchResultsError {
  readonly status = HttpStatus.BAD_REQUEST;
  constructor(message = 'La solicitud no es valida') { super(message); }
}

export class MatchResultsTeamNotParticipantError extends MatchResultsError {
  readonly status = HttpStatus.BAD_REQUEST;
  constructor(teamId: number, matchId: number) {
    super(`El equipo ${teamId} no participa en el partido ${matchId}`);
  }
}

export class MatchResultsTournamentNotFoundError extends MatchResultsError {
  readonly status = HttpStatus.NOT_FOUND;
  constructor(id: number) { super(`Torneo con id ${id} no encontrado`); }
}

export class MatchResultsMatchNotFoundError extends MatchResultsError {
  readonly status = HttpStatus.NOT_FOUND;
  constructor(id: number, tournamentId: number) {
    super(`Partido con id ${id} no encontrado en el torneo ${tournamentId}`);
  }
}

export class MatchResultsResultNotFoundError extends MatchResultsError {
  readonly status = HttpStatus.NOT_FOUND;
  constructor(matchId: number) { super(`El partido ${matchId} no tiene resultado registrado`); }
}

export class MatchResultsPlayerNotFoundError extends MatchResultsError {
  readonly status = HttpStatus.NOT_FOUND;
  constructor(id: number) { super(`Jugador con id ${id} no encontrado`); }
}

export class MatchResultsAnnotationNotFoundError extends MatchResultsError {
  readonly status = HttpStatus.NOT_FOUND;
  constructor(id: number, matchId: number) {
    super(`Anotacion con id ${id} no encontrada en el partido ${matchId}`);
  }
}

export class MatchResultsResultAlreadyExistsError extends MatchResultsError {
  readonly status = HttpStatus.CONFLICT;
  constructor(matchId: number) {
    super(`El partido ${matchId} ya tiene un resultado registrado; use la actualizacion`);
  }
}

export class MatchResultsNotAllowedError extends MatchResultsError {
  readonly status = HttpStatus.CONFLICT;
  constructor(matchId: number, status: MatchStatus, subject: 'result' | 'annotations') {
    super(`El partido ${matchId} esta en estado '${status}'; ${subject === 'result'
      ? 'el resultado solo se registra o modifica'
      : 'las anotaciones solo se registran o modifican'} en partidos en juego o finalizados`);
  }
}

export class MatchResultsInvalidTransitionError extends MatchResultsError {
  readonly status = HttpStatus.CONFLICT;
  constructor(matchId: number, from: MatchStatus) {
    super(`El partido ${matchId} esta en estado '${from}' y no puede finalizarse`);
  }
}

export class MatchResultsPlayerNotInMatchError extends MatchResultsError {
  readonly status = HttpStatus.CONFLICT;
  constructor(playerId: number, matchId: number, teamId?: number) {
    super(teamId === undefined
      ? `El jugador ${playerId} no pertenece a ninguno de los equipos del partido ${matchId} en su fecha`
      : `El jugador ${playerId} no pertenece al equipo ${teamId} en la fecha del partido ${matchId}`);
  }
}

export class MatchResultsPlayerTeamAmbiguousError extends MatchResultsError {
  readonly status = HttpStatus.CONFLICT;
  constructor(playerId: number, matchId: number) {
    super(`El jugador ${playerId} pertenece a los dos equipos del partido ${matchId}; indique teamId`);
  }
}

export class MatchResultsReferenceConflictError extends MatchResultsError {
  readonly status = HttpStatus.CONFLICT;
  constructor() {
    super('El partido, un equipo o un jugador cambio durante la operacion; actualice los datos e intentelo nuevamente');
  }
}
