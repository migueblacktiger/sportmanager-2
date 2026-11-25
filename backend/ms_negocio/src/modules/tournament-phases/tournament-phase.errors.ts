export class TournamentPhaseInputInvalidError extends Error {
  constructor(message = 'La solicitud de fases no es valida') {
    super(message);
    this.name = 'TournamentPhaseInputInvalidError';
  }
}

export class TournamentPhaseTournamentNotFoundError extends Error {
  constructor(id: number) {
    super(`Torneo con id ${id} no encontrado`);
    this.name = 'TournamentPhaseTournamentNotFoundError';
  }
}

export class TournamentPhaseNotFoundError extends Error {
  constructor(id: number) {
    super(`Fase con id ${id} no encontrada`);
    this.name = 'TournamentPhaseNotFoundError';
  }
}

export class TournamentPhaseOrderTakenError extends Error {
  constructor(order?: number) {
    super(order === undefined
      ? 'Ya existe una fase con ese orden en el torneo'
      : `Ya existe una fase con el orden ${order} en el torneo`);
    this.name = 'TournamentPhaseOrderTakenError';
  }
}

export class TournamentPhaseOrderLockedError extends Error {
  constructor(id: number) {
    super(`No se puede cambiar el orden de la fase ${id} porque ya tiene partidos`);
    this.name = 'TournamentPhaseOrderLockedError';
  }
}

export class TournamentPhaseTypeLockedError extends Error {
  constructor(id: number) {
    super(`No se puede cambiar el tipo de la fase ${id} porque ya tiene grupos o partidos`);
    this.name = 'TournamentPhaseTypeLockedError';
  }
}

export class TournamentPhaseFinalTypeLockedError extends Error {
  constructor(id: number) {
    super(`No se puede cambiar el tipo de la fase final ${id}`);
    this.name = 'TournamentPhaseFinalTypeLockedError';
  }
}

export class TournamentPhaseHasDependenciesError extends Error {
  constructor(id: number) {
    super(`No se puede eliminar la fase ${id} porque tiene informacion asociada (grupos)`);
    this.name = 'TournamentPhaseHasDependenciesError';
  }
}

export class TournamentPhaseReferenceConflictError extends Error {
  constructor() {
    super('El torneo o la fase cambio durante la operacion; actualice los datos e intentelo nuevamente');
    this.name = 'TournamentPhaseReferenceConflictError';
  }
}
