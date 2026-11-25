import { computeStandings } from './standings';

const teams = [
  { id: 1, name: 'Alfa' },
  { id: 2, name: 'Beta' },
  { id: 3, name: 'Gama' },
];

describe('computeStandings', () => {
  it('lists every team with zeros when nothing was played', () => {
    const rows = computeStandings(teams, []);
    expect(rows.map((row) => [row.position, row.teamId, row.points, row.played])).toEqual([
      [1, 1, 0, 0], [2, 2, 0, 0], [3, 3, 0, 0],
    ]);
  });

  it('awards 3 points per win, 1 per draw and 0 per loss', () => {
    const rows = computeStandings(teams, [
      { homeTeamId: 1, awayTeamId: 2, homeScore: 2, awayScore: 0 },
      { homeTeamId: 2, awayTeamId: 3, homeScore: 1, awayScore: 1 },
    ]);
    const byId = new Map(rows.map((row) => [row.teamId, row]));
    expect(byId.get(1)).toEqual({
      position: 1, teamId: 1, teamName: 'Alfa', played: 1, won: 1, drawn: 0, lost: 0,
      goalsFor: 2, goalsAgainst: 0, goalDifference: 2, points: 3,
    });
    expect(byId.get(2)?.points).toBe(1);
    expect(byId.get(3)?.points).toBe(1);
    // Beta y Gama suman 1 punto; Gama gana el desempate por diferencia de gol (0 contra -2).
    expect(rows.map((row) => row.teamId)).toEqual([1, 3, 2]);
  });

  it('breaks ties by goal difference, goals for and then name', () => {
    const rows = computeStandings(teams, [
      { homeTeamId: 1, awayTeamId: 3, homeScore: 1, awayScore: 0 },
      { homeTeamId: 2, awayTeamId: 3, homeScore: 3, awayScore: 1 },
    ]);
    // Alfa y Beta: 3 puntos; Beta tiene mejor diferencia (+2 contra +1).
    expect(rows.map((row) => row.teamId)).toEqual([2, 1, 3]);
  });

  it('ignores matches of teams outside the list and duplicated teams', () => {
    const rows = computeStandings([...teams, teams[0]], [
      { homeTeamId: 1, awayTeamId: 99, homeScore: 5, awayScore: 0 },
    ]);
    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.played === 0)).toBe(true);
  });
});
