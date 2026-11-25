import type { SourceTeam } from '../overview-source';
import type { StandingRowDto } from '../dto/tournament-overview-response.dto';

export const POINTS_WIN = 3;
export const POINTS_DRAW = 1;
export const POINTS_LOSS = 0;

export interface StandingMatch {
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number;
  awayScore: number;
}

/**
 * Tabla de posiciones: 3 puntos por victoria, 1 por empate, 0 por derrota. Orden: puntos, diferencia,
 * goles a favor, nombre e id (determinista). La posicion es el lugar en la lista (sin empates de lugar).
 * Los partidos de equipos que no estan en `teams` se ignoran.
 */
export function computeStandings(teams: SourceTeam[], matches: StandingMatch[]): StandingRowDto[] {
  const rows = new Map<number, StandingRowDto>();
  for (const team of teams) {
    if (rows.has(team.id)) continue;
    rows.set(team.id, {
      position: 0, teamId: team.id, teamName: team.name, played: 0, won: 0, drawn: 0, lost: 0,
      goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0,
    });
  }

  for (const match of matches) {
    const home = rows.get(match.homeTeamId);
    const away = rows.get(match.awayTeamId);
    if (!home || !away || home === away) continue;
    apply(home, match.homeScore, match.awayScore);
    apply(away, match.awayScore, match.homeScore);
  }

  const sorted = [...rows.values()].sort((a, b) =>
    b.points - a.points
    || b.goalDifference - a.goalDifference
    || b.goalsFor - a.goalsFor
    || a.teamName.localeCompare(b.teamName, 'es')
    || a.teamId - b.teamId);
  sorted.forEach((row, index) => { row.position = index + 1; });
  return sorted;
}

function apply(row: StandingRowDto, scored: number, conceded: number): void {
  row.played += 1;
  row.goalsFor += scored;
  row.goalsAgainst += conceded;
  row.goalDifference = row.goalsFor - row.goalsAgainst;
  if (scored > conceded) {
    row.won += 1;
    row.points += POINTS_WIN;
  } else if (scored === conceded) {
    row.drawn += 1;
    row.points += POINTS_DRAW;
  } else {
    row.lost += 1;
    row.points += POINTS_LOSS;
  }
}
