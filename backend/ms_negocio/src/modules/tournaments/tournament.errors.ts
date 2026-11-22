export class TournamentNotFoundError extends Error {
  constructor(id: number) {
    super(`Torneo con id ${id} no encontrado`);
    this.name = TournamentNotFoundError.name;
  }
}

export class TournamentSportNotFoundError extends Error {
  constructor(id: number) {
    super(`Deporte con id ${id} no encontrado`);
    this.name = TournamentSportNotFoundError.name;
  }
}

export class TournamentDatesInvalidError extends Error {
  constructor() {
    super('Las fechas deben cumplir: inicio de inscripciones < cierre de inscripciones <= inicio del torneo');
    this.name = TournamentDatesInvalidError.name;
  }
}

export class TournamentHasDependenciesError extends Error {
  constructor(id: number) {
    super(`No se puede eliminar el torneo ${id} porque tiene informacion asociada`);
    this.name = TournamentHasDependenciesError.name;
  }
}

export class TournamentHasRegistrationsError extends Error {
  constructor(id: number) {
    super(`No se puede cambiar el deporte del torneo ${id} mientras tenga equipos inscritos`);
    this.name = TournamentHasRegistrationsError.name;
  }
}
