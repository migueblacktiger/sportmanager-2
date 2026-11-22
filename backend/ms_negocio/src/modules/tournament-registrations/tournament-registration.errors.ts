export class TournamentRegistrationInputInvalidError extends Error {
  constructor(message = 'La solicitud de inscripcion no es valida') {
    super(message);
    this.name = 'TournamentRegistrationInputInvalidError';
  }
}

export class TournamentRegistrationTournamentNotFoundError extends Error {
  constructor(id: number) {
    super(`Torneo con id ${id} no encontrado`);
    this.name = 'TournamentRegistrationTournamentNotFoundError';
  }
}

export class TournamentRegistrationTeamNotFoundError extends Error {
  constructor(id: number) {
    super(`Equipo con id ${id} no encontrado`);
    this.name = 'TournamentRegistrationTeamNotFoundError';
  }
}

export class TournamentRegistrationSportMismatchError extends Error {
  constructor(teamId: number, sportId: number) {
    super(`El equipo ${teamId} no esta asociado al deporte ${sportId} del torneo`);
    this.name = 'TournamentRegistrationSportMismatchError';
  }
}

export class TournamentRegistrationDuplicateError extends Error {
  constructor(teamId?: number, tournamentId?: number) {
    super(teamId && tournamentId
      ? `El equipo ${teamId} ya esta inscrito en el torneo ${tournamentId}`
      : 'Uno o mas equipos ya estan inscritos en el torneo');
    this.name = 'TournamentRegistrationDuplicateError';
  }
}

export class TournamentRegistrationReferenceConflictError extends Error {
  constructor() {
    super('Un torneo, equipo o asociacion cambio durante la inscripcion; actualice los datos e intentelo nuevamente');
    this.name = 'TournamentRegistrationReferenceConflictError';
  }
}

export class TournamentRegistrationWindowClosedError extends Error {
  constructor() {
    super('Las inscripciones no estan abiertas para este torneo');
    this.name = 'TournamentRegistrationWindowClosedError';
  }
}

export class TournamentRegistrationTournamentStartedError extends Error {
  constructor() {
    super('El torneo ya comenzo; no se puede modificar sus inscripciones');
    this.name = 'TournamentRegistrationTournamentStartedError';
  }
}

export class TournamentRegistrationNotFoundError extends Error {
  constructor(tournamentId: number, teamId: number) {
    super(`No existe la inscripcion del equipo ${teamId} en el torneo ${tournamentId}`);
    this.name = 'TournamentRegistrationNotFoundError';
  }
}
