export class TeamSportHasTournamentRegistrationsError extends Error {
  constructor() {
    super('No se puede retirar la asociacion porque el equipo esta inscrito en torneos de ese deporte');
    this.name = 'TeamSportHasTournamentRegistrationsError';
  }
}
