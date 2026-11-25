export class MatchInputInvalidError extends Error {
  constructor(message = 'La solicitud de partido no es valida') {
    super(message);
    this.name = 'MatchInputInvalidError';
  }
}

export class MatchNotFoundError extends Error {
  constructor(id: number) {
    super(`Partido con id ${id} no encontrado`);
    this.name = 'MatchNotFoundError';
  }
}

export class MatchPhaseNotFoundError extends Error {
  constructor(id: number) {
    super(`Fase con id ${id} no encontrada`);
    this.name = 'MatchPhaseNotFoundError';
  }
}

export class MatchTeamNotFoundError extends Error {
  constructor(id: number) {
    super(`Equipo con id ${id} no encontrado`);
    this.name = 'MatchTeamNotFoundError';
  }
}

export class MatchTeamNotRegisteredError extends Error {
  constructor(teamId: number, tournamentId: number) {
    super(`El equipo ${teamId} no esta inscrito en el torneo ${tournamentId}`);
    this.name = 'MatchTeamNotRegisteredError';
  }
}

export class MatchTeamInactiveError extends Error {
  constructor(id: number) {
    super(`El equipo ${id} esta inactivo y no puede participar en la competencia`);
    this.name = 'MatchTeamInactiveError';
  }
}

export class MatchReferenceConflictError extends Error {
  constructor() {
    super('La fase o un equipo cambio durante la operacion; actualice los datos e intentelo nuevamente');
    this.name = 'MatchReferenceConflictError';
  }
}
