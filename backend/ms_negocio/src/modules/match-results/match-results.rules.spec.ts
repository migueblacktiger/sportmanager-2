import { PlayerTeam } from '../player-teams/entities/player-team.entity';
import { MatchResultsInputInvalidError } from './match-results.errors';
import { isContractEffectiveAt, validateId } from './match-results.rules';

const contract = (overrides: Partial<PlayerTeam>): PlayerTeam => Object.assign(new PlayerTeam(), {
  startDate: '2027-01-10', endDate: '2027-01-12', finishedAt: null, ...overrides,
});

describe('match results rules', () => {
  it('accepts positive integer ids up to the database limit only', () => {
    expect(() => validateId(1)).not.toThrow();
    expect(() => validateId(2147483647)).not.toThrow();
    for (const id of [0, -1, 1.5, Number.NaN, 2147483648]) {
      expect(() => validateId(id)).toThrow(MatchResultsInputInvalidError);
    }
  });

  it('treats both contract dates as inclusive in Bogota time', () => {
    const row = contract({});
    // 2027-01-10 00:00 Bogota = 05:00Z; 2027-01-13 00:00 Bogota = 05:00Z.
    expect(isContractEffectiveAt(row, Date.parse('2027-01-10T04:59:59.999Z'))).toBe(false);
    expect(isContractEffectiveAt(row, Date.parse('2027-01-10T05:00:00.000Z'))).toBe(true);
    expect(isContractEffectiveAt(row, Date.parse('2027-01-13T04:59:59.999Z'))).toBe(true);
    expect(isContractEffectiveAt(row, Date.parse('2027-01-13T05:00:00.000Z'))).toBe(false);
  });

  it('cuts the contract at its early withdrawal', () => {
    const row = contract({ finishedAt: new Date('2027-01-11T12:00:00.000Z') });
    expect(isContractEffectiveAt(row, Date.parse('2027-01-11T11:59:59.999Z'))).toBe(true);
    expect(isContractEffectiveAt(row, Date.parse('2027-01-11T12:00:00.000Z'))).toBe(false);
  });
});
