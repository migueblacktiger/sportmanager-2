export class CompetitionGroupInputInvalidError extends Error {
  constructor(message = 'La solicitud de grupos no es valida') {
    super(message);
    this.name = 'CompetitionGroupInputInvalidError';
  }
}

export class CompetitionGroupTournamentNotFoundError extends Error {
  constructor(id: number) {
    super(`Torneo con id ${id} no encontrado`);
    this.name = 'CompetitionGroupTournamentNotFoundError';
  }
}

export class CompetitionGroupPhaseNotFoundError extends Error {
  constructor(phaseId: number, tournamentId: number) {
    super(`Fase con id ${phaseId} no encontrada en el torneo ${tournamentId}`);
    this.name = 'CompetitionGroupPhaseNotFoundError';
  }
}

export class CompetitionGroupPhaseTypeError extends Error {
  constructor(phaseId: number) {
    super(`No se pueden crear grupos porque la fase ${phaseId} no es de tipo groups`);
    this.name = 'CompetitionGroupPhaseTypeError';
  }
}

export class CompetitionGroupNotFoundError extends Error {
  constructor(id: number) {
    super(`Grupo con id ${id} no encontrado`);
    this.name = 'CompetitionGroupNotFoundError';
  }
}

export class CompetitionGroupNameTakenError extends Error {
  constructor(name?: string) {
    super(name === undefined
      ? 'Ya existe un grupo con ese nombre en la fase'
      : `Ya existe un grupo llamado "${name}" en la fase`);
    this.name = 'CompetitionGroupNameTakenError';
  }
}

export class CompetitionGroupHasTeamsError extends Error {
  constructor(id: number) {
    super(`No se puede eliminar el grupo ${id} porque tiene equipos asignados; retirelos primero`);
    this.name = 'CompetitionGroupHasTeamsError';
  }
}

export class CompetitionGroupReferenceConflictError extends Error {
  constructor() {
    super('La fase o el grupo cambio durante la operacion; actualice los datos e intentelo nuevamente');
    this.name = 'CompetitionGroupReferenceConflictError';
  }
}
