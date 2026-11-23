import { bogotaMidnight, isContractDate } from './player-team-dates';

describe('Contract calendar boundaries', () => {
  it.each(['1000-01-01', '2024-02-29', '9999-12-31'])('accepts a real MySQL DATE %s', value => {
    expect(isContractDate(value)).toBe(true);
  });
  it.each(['2025-02-29', '2026-04-31', '2026-01-00', '2026-1-01', '2026-01-01 ', undefined, null])('rejects %s', value => {
    expect(isContractDate(value)).toBe(false);
  });
  it('converts Bogota midnight into UTC without relying on the process timezone', () => {
    expect(new Date(bogotaMidnight('2026-11-22')).toISOString()).toBe('2026-11-22T05:00:00.000Z');
  });
  it('handles leap days and calendar year changes', () => {
    expect(new Date(bogotaMidnight('2028-02-29', true)).toISOString()).toBe('2028-03-01T05:00:00.000Z');
    expect(new Date(bogotaMidnight('2026-12-31', true)).toISOString()).toBe('2027-01-01T05:00:00.000Z');
  });
});
