import {
  ATTENDANCE_STATUSES, canTransition, DELETABLE_STATUSES, EDITABLE_STATUSES, MatchStatus,
} from './match-status';

describe('match status rules', () => {
  it('allows the expected transitions', () => {
    expect(canTransition(MatchStatus.Scheduled, MatchStatus.InProgress)).toBe(true);
    expect(canTransition(MatchStatus.Scheduled, MatchStatus.Postponed)).toBe(true);
    expect(canTransition(MatchStatus.Postponed, MatchStatus.Scheduled)).toBe(true);
    expect(canTransition(MatchStatus.InProgress, MatchStatus.Finished)).toBe(true);
  });

  it('rejects skipping states, repeating a state and leaving a terminal state', () => {
    expect(canTransition(MatchStatus.Scheduled, MatchStatus.Finished)).toBe(false);
    expect(canTransition(MatchStatus.Scheduled, MatchStatus.Scheduled)).toBe(false);
    expect(canTransition(MatchStatus.Finished, MatchStatus.Scheduled)).toBe(false);
    expect(canTransition(MatchStatus.Cancelled, MatchStatus.Scheduled)).toBe(false);
  });

  it('only edits scheduled or postponed matches and never deletes played ones', () => {
    expect([...EDITABLE_STATUSES].sort()).toEqual(['postponed', 'scheduled']);
    expect(DELETABLE_STATUSES).not.toContain(MatchStatus.InProgress);
    expect(DELETABLE_STATUSES).not.toContain(MatchStatus.Finished);
    expect([...ATTENDANCE_STATUSES].sort()).toEqual(['finished', 'in_progress']);
  });
});
