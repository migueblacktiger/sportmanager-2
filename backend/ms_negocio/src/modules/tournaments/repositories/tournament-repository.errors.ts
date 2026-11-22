export class TournamentSportReferenceError extends Error {
  constructor() {
    super('El deporte asociado al torneo ya no existe');
    this.name = TournamentSportReferenceError.name;
  }
}

export class TournamentDeleteRestrictedError extends Error {
  constructor() {
    super('La base de datos impidio eliminar un torneo referenciado');
    this.name = TournamentDeleteRestrictedError.name;
  }
}

export class TournamentSportChangeRestrictedError extends Error {
  constructor() {
    super('No se puede cambiar el deporte de un torneo que tiene equipos inscritos');
    this.name = TournamentSportChangeRestrictedError.name;
  }
}

export class TournamentRecordDisappearedError extends Error {
  constructor(id: number) {
    super(`Torneo con id ${id} ya no existe`);
    this.name = TournamentRecordDisappearedError.name;
  }
}
