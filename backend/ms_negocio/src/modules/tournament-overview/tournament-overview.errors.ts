export class TournamentOverviewNotFoundError extends Error {
  constructor(id: number) {
    super(`Torneo con id ${id} no encontrado`);
    this.name = TournamentOverviewNotFoundError.name;
  }
}
