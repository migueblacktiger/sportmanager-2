import { MatchStatus } from '../../match-management/dto/match-status';
import { PhaseType } from '../../tournament-phases/dto/phase-type';
import type { OverviewSource, SourceMatch } from '../overview-source';
import { buildTournamentOverview } from './tournament-overview.builder';

const A = { id: 1, name: 'Alfa' };
const B = { id: 2, name: 'Beta' };
const C = { id: 3, name: 'Gama' };
const D = { id: 4, name: 'Delta' };
const date = (day: number) => new Date(Date.UTC(2027, 0, day));

function match(id: number, phaseId: number, home: typeof A, away: typeof A, status: MatchStatus, day = id): SourceMatch {
  return { id, phaseId, home, away, scheduledAt: date(day), status, venue: null };
}

function source(): OverviewSource {
  return {
    tournament: {
      id: 7, name: 'Copa', sportId: 3, sportName: 'Futbol',
      registrationStartsAt: date(1), registrationEndsAt: date(5), startsAt: date(10),
    },
    phases: [
      { id: 12, name: 'Final', type: PhaseType.Final, phaseOrder: 2 },
      { id: 11, name: 'Grupos', type: PhaseType.Groups, phaseOrder: 1 },
    ],
    groups: [
      { id: 21, phaseId: 11, name: 'Grupo A' },
      { id: 22, phaseId: 11, name: 'Grupo B' },
      { id: 99, phaseId: 500, name: 'De otro torneo' },
    ],
    groupTeams: [
      { groupId: 21, phaseId: 11, team: A },
      { groupId: 21, phaseId: 11, team: B },
      { groupId: 22, phaseId: 11, team: C },
      { groupId: 22, phaseId: 11, team: D },
      { groupId: 99, phaseId: 500, team: A },
    ],
    matches: [
      match(101, 11, A, B, MatchStatus.Finished),
      match(102, 11, C, D, MatchStatus.Scheduled),
      match(103, 11, A, C, MatchStatus.Finished),
      match(104, 12, A, C, MatchStatus.Finished, 20),
      match(900, 500, A, B, MatchStatus.Finished),
    ],
    results: [
      { matchId: 101, homeScore: 2, awayScore: 1, updatedAt: date(11) },
      { matchId: 103, homeScore: 0, awayScore: 0, updatedAt: date(12) },
      { matchId: 104, homeScore: 1, awayScore: 3, updatedAt: date(21) },
      { matchId: 900, homeScore: 9, awayScore: 9, updatedAt: date(11) },
    ],
    annotations: [
      { id: 2, matchId: 101, playerId: 5, playerName: 'Ana', team: A, minute: 40, points: 1, description: null, createdAt: date(11) },
      { id: 1, matchId: 101, playerId: 6, playerName: 'Bea', team: B, minute: 10, points: 1, description: 'x', createdAt: date(11) },
      { id: 3, matchId: 900, playerId: 7, playerName: 'Otra', team: A, minute: 1, points: 1, description: null, createdAt: date(11) },
    ],
  };
}

describe('buildTournamentOverview', () => {
  it('returns general information and orders phases by their order', () => {
    const view = buildTournamentOverview(source(), false);
    expect(view.tournament.name).toBe('Copa');
    expect(view.tournament.sportName).toBe('Futbol');
    expect(view.tournament.startsAt).toBe(date(10).toISOString());
    expect(view.phases.map((phase) => phase.id)).toEqual([11, 12]);
  });

  it('only includes data that belongs to the tournament phases', () => {
    const view = buildTournamentOverview(source(), true);
    const matchIds = view.phases.flatMap((phase) => phase.matches.map((item) => item.id));
    expect(matchIds).toEqual([101, 102, 103, 104]);
    expect(view.summary).toEqual({ phases: 2, groups: 2, matches: 4, matchesWithResult: 3, matchesPending: 1 });
    expect(view.phases[0].groups.map((group) => group.id)).toEqual([21, 22]);
    expect(JSON.stringify(view)).not.toContain('De otro torneo');
    expect(JSON.stringify(view)).not.toContain('Otra');
  });

  it('shows groups with their teams and standings from finished matches with a result', () => {
    const [groups] = [buildTournamentOverview(source(), false).phases[0].groups];
    expect(groups[0].teams.map((team) => team.id)).toEqual([1, 2]);
    expect(groups[0].standings.map((row) => [row.teamId, row.points, row.position])).toEqual([[1, 3, 1], [2, 0, 2]]);
    // C-D no se ha jugado: ambos en cero. A-C (103) cruza grupos y no cuenta en ninguno.
    expect(groups[1].standings.map((row) => [row.teamId, row.points, row.played])).toEqual([[4, 0, 0], [3, 0, 0]]);
    expect(buildTournamentOverview(source(), false).phases[0].standings).toBeNull();
  });

  it('marks matches as registered or pending and links a match to its group', () => {
    const matches = buildTournamentOverview(source(), false).phases[0].matches;
    expect(matches.map((item) => [item.id, item.resultStatus, item.groupId])).toEqual([
      [101, 'registered', 21], [102, 'pending', 22], [103, 'registered', null],
    ]);
    expect(matches[1].result).toBeNull();
    expect(matches[0].result?.winnerTeamId).toBe(1);
    expect(matches[2].result?.winnerTeamId).toBeNull();
    expect(buildTournamentOverview(source(), false).phases[0].matchSummary).toEqual({ total: 3, withResult: 2, pending: 1 });
  });

  it('builds a bracket for the final phase and none for group phases', () => {
    const view = buildTournamentOverview(source(), false);
    expect(view.phases[0].bracket).toBeNull();
    expect(view.phases[1].isFinalPhase).toBe(true);
    expect(view.phases[1].bracket).toEqual({
      round: 2,
      ties: [{
        matchId: 104,
        homeTeam: { teamId: 1, teamName: 'Alfa', score: 1 },
        awayTeam: { teamId: 3, teamName: 'Gama', score: 3 },
        scheduledAt: date(20).toISOString(),
        status: MatchStatus.Finished,
        resultStatus: 'registered',
        winnerTeamId: 3,
      }],
    });
  });

  it('does not name a winner while the match is not finished', () => {
    const data = source();
    data.matches[3] = match(104, 12, A, C, MatchStatus.InProgress, 20);
    const tie = buildTournamentOverview(data, false).phases[1].bracket?.ties[0];
    expect(tie?.winnerTeamId).toBeNull();
    expect(tie?.homeTeam.score).toBe(1);
  });

  it('includes annotations ordered by minute only when requested', () => {
    expect(buildTournamentOverview(source(), false).phases[0].matches[0].annotations).toBeNull();
    const first = buildTournamentOverview(source(), true).phases[0].matches[0];
    expect(first.annotations?.map((item) => [item.id, item.minute, item.playerName, item.teamName])).toEqual([
      [1, 10, 'Bea', 'Beta'], [2, 40, 'Ana', 'Alfa'],
    ]);
    expect(buildTournamentOverview(source(), true).phases[0].matches[1].annotations).toEqual([]);
  });

  it('computes league standings from the teams in the phase matches', () => {
    const data = source();
    data.phases = [{ id: 11, name: 'Liga', type: PhaseType.League, phaseOrder: 1 }];
    data.groups = [];
    data.groupTeams = [];
    data.matches = [match(1, 11, A, B, MatchStatus.Finished), match(2, 11, B, C, MatchStatus.Scheduled)];
    data.results = [{ matchId: 1, homeScore: 0, awayScore: 1, updatedAt: date(11) }];
    const standings = buildTournamentOverview(data, false).phases[0].standings;
    expect(standings?.map((row) => [row.teamId, row.points])).toEqual([[2, 3], [3, 0], [1, 0]]);
  });

  it('handles a tournament without phases', () => {
    const data = source();
    data.phases = [];
    expect(buildTournamentOverview(data, false)).toEqual({
      tournament: expect.anything(),
      summary: { phases: 0, groups: 0, matches: 0, matchesWithResult: 0, matchesPending: 0 },
      phases: [],
    });
  });
});
