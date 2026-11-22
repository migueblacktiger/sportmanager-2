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
