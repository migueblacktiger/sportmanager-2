export class FinalPhaseInputInvalidError extends Error {
  constructor(message = 'La solicitud de fase final no es valida') {
    super(message);
    this.name = 'FinalPhaseInputInvalidError';
  }
}

export class FinalPhaseTournamentNotFoundError extends Error {
  constructor(id: number) {
    super(`Torneo con id ${id} no encontrado`);
    this.name = 'FinalPhaseTournamentNotFoundError';
  }
}

export class FinalPhaseNotFoundError extends Error {
  constructor(id: number, tournamentId: number) {
    super(`Fase final con id ${id} no encontrada en el torneo ${tournamentId}`);
    this.name = 'FinalPhaseNotFoundError';
  }
}

export class FinalPhaseOrderTakenError extends Error {
  constructor(order?: number) {
    super(order === undefined
      ? 'Ya existe una fase con ese orden en el torneo'
      : `Ya existe una fase con el orden ${order} en el torneo`);
    this.name = 'FinalPhaseOrderTakenError';
  }
}

export class FinalPhaseOrderLockedError extends Error {
  constructor(id: number) {
    super(`No se puede cambiar el orden de la fase final ${id} porque ya tiene partidos`);
    this.name = 'FinalPhaseOrderLockedError';
  }
}

export class FinalPhaseHasMatchesError extends Error {
  constructor(id: number) {
    super(`No se puede eliminar la fase final ${id} porque tiene partidos`);
    this.name = 'FinalPhaseHasMatchesError';
  }
}

export class FinalPhaseHasDependenciesError extends Error {
  constructor(id?: number) {
    super(id === undefined
      ? 'No se puede eliminar la fase final porque tiene informacion asociada'
      : `No se puede eliminar la fase final ${id} porque tiene informacion asociada (grupos)`);
    this.name = 'FinalPhaseHasDependenciesError';
  }
}

export class FinalPhaseReferenceConflictError extends Error {
  constructor() {
    super('El torneo o la fase cambio durante la operacion; actualice los datos e intentelo nuevamente');
    this.name = 'FinalPhaseReferenceConflictError';
  }
}
