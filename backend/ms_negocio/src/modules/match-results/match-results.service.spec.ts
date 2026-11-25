import { MatchStatus } from '../match-management/dto/match-status';
import { MatchResultsMapper } from './mappers/match-results.mapper';
import {
  MatchResultsInputInvalidError,
  MatchResultsMatchNotFoundError,
  MatchResultsNotAllowedError,
  MatchResultsResultAlreadyExistsError,
  MatchResultsResultNotFoundError,
  MatchResultsTeamNotParticipantError,
  MatchResultsTournamentNotFoundError,
} from './match-results.errors';
import { MatchResultsService } from './match-results.service';
import { MatchResultsNotificationService } from './notifications/match-results-notification.service';
import { MatchResultsRepository } from './repositories/match-results.repository';

const match = {
  id: 5, phaseId: 2, homeTeamId: 10, awayTeamId: 11, scheduledAt: new Date('2027-01-10T20:00:00.000Z'),
  phase: { tournamentId: 1, name: 'Grupos' }, homeTeam: { name: 'Rojos' }, awayTeam: { name: 'Azules' },
};
const summary = { recipients: 2, sent: 2, failed: 0, skipped: false };

describe('MatchResultsService', () => {
  const unitOfWork = { lockMatch: jest.fn(), findResultForUpdate: jest.fn(), saveResult: jest.fn(), saveDetail: jest.fn() };
  const repository = {
    transaction: jest.fn(), findTournament: jest.fn(), findMatch: jest.fn(), findDetail: jest.fn(),
    findResult: jest.fn(), findAnnotations: jest.fn(),
  };
  const notifications = { notifyMatchSummary: jest.fn() };
  let detail: { matchId: number; status: MatchStatus } | null;
  let stored: Record<string, unknown> | null;
  let service: MatchResultsService;

  beforeEach(() => {
    jest.resetAllMocks();
    detail = { matchId: 5, status: MatchStatus.InProgress };
    stored = null;
    repository.transaction.mockImplementation((work: (tx: typeof unitOfWork) => Promise<unknown>) => work(unitOfWork));
    repository.findTournament.mockResolvedValue({ id: 1, name: 'Copa' });
    repository.findMatch.mockResolvedValue(match);
    repository.findDetail.mockImplementation(() => Promise.resolve(detail));
    repository.findResult.mockImplementation(() => Promise.resolve(stored));
    repository.findAnnotations.mockResolvedValue([
      { player: { name: 'Ana' }, team: { name: 'Rojos' }, minute: 12, points: 1, description: null },
    ]);
    unitOfWork.lockMatch.mockImplementation(() => Promise.resolve({ match, detail }));
    unitOfWork.findResultForUpdate.mockImplementation(() => Promise.resolve(stored));
    unitOfWork.saveResult.mockImplementation((entity: Record<string, unknown>) => {
      stored = { id: 7, ...entity };
      return Promise.resolve(stored);
    });
    unitOfWork.saveDetail.mockImplementation((entity: { status: MatchStatus }) => {
      detail = { matchId: 5, status: entity.status };
      return Promise.resolve(entity);
    });
    notifications.notifyMatchSummary.mockResolvedValue(summary);
    service = new MatchResultsService(
      repository as unknown as MatchResultsRepository,
      new MatchResultsMapper(),
      notifications as unknown as MatchResultsNotificationService,
    );
  });

  describe('create', () => {
    it('stores each score under the right side whatever the order of the request', async () => {
      const response = await service.create(1, 5, {
        scores: [{ teamId: 11, score: 1 }, { teamId: 10, score: 3 }],
      });
      expect(unitOfWork.saveResult).toHaveBeenCalledWith(expect.objectContaining({
        matchId: 5, homeScore: 3, awayScore: 1,
      }));
      expect(response).toMatchObject({
        matchId: 5, homeScore: 3, awayScore: 1, winnerTeamId: 10, matchStatus: MatchStatus.InProgress,
        homeTeamName: 'Rojos', awayTeamName: 'Azules', notification: null,
      });
      expect(notifications.notifyMatchSummary).not.toHaveBeenCalled();
      expect(unitOfWork.saveDetail).not.toHaveBeenCalled();
    });

    it('reports a draw without winner', async () => {
      await expect(service.create(1, 5, { scores: [{ teamId: 10, score: 2 }, { teamId: 11, score: 2 }] }))
        .resolves.toMatchObject({ winnerTeamId: null });
    });

    it('rejects a team that does not take part in the match', async () => {
      await expect(service.create(1, 5, { scores: [{ teamId: 10, score: 1 }, { teamId: 99, score: 0 }] }))
        .rejects.toBeInstanceOf(MatchResultsTeamNotParticipantError);
      expect(unitOfWork.saveResult).not.toHaveBeenCalled();
    });

    it('rejects a repeated team and a missing team', async () => {
      await expect(service.create(1, 5, { scores: [{ teamId: 10, score: 1 }, { teamId: 10, score: 0 }] }))
        .rejects.toBeInstanceOf(MatchResultsInputInvalidError);
      await expect(service.create(1, 5, { scores: [{ teamId: 10, score: 1 }] }))
        .rejects.toBeInstanceOf(MatchResultsInputInvalidError);
    });

    it.each([MatchStatus.Scheduled, MatchStatus.Postponed, MatchStatus.Cancelled])(
      'does not register results while the match is %s', async (status) => {
        detail = { matchId: 5, status };
        await expect(service.create(1, 5, { scores: [{ teamId: 10, score: 1 }, { teamId: 11, score: 0 }] }))
          .rejects.toBeInstanceOf(MatchResultsNotAllowedError);
      },
    );

    it('treats a match without detail row as scheduled', async () => {
      detail = null;
      await expect(service.create(1, 5, { scores: [{ teamId: 10, score: 1 }, { teamId: 11, score: 0 }] }))
        .rejects.toBeInstanceOf(MatchResultsNotAllowedError);
    });

    it('rejects a second result for the same match', async () => {
      stored = { id: 7, matchId: 5, homeScore: 0, awayScore: 0, updatedAt: new Date() };
      await expect(service.create(1, 5, { scores: [{ teamId: 10, score: 1 }, { teamId: 11, score: 0 }] }))
        .rejects.toBeInstanceOf(MatchResultsResultAlreadyExistsError);
    });

    it('finalizes the match and sends the summary, with the annotations and the token', async () => {
      const response = await service.create(
        1, 5, { scores: [{ teamId: 10, score: 2 }, { teamId: 11, score: 0 }], finalize: true }, 'Bearer t',
      );
      expect(unitOfWork.saveDetail).toHaveBeenCalledWith(expect.objectContaining({ status: MatchStatus.Finished }));
      expect(response).toMatchObject({ matchStatus: MatchStatus.Finished, notification: summary });
      expect(notifications.notifyMatchSummary).toHaveBeenCalledWith({
        matchId: 5, tournamentName: 'Copa', phaseName: 'Grupos',
        homeTeamName: 'Rojos', homeScore: 2, awayTeamName: 'Azules', awayScore: 0,
        annotations: [{ playerName: 'Ana', teamName: 'Rojos', minute: 12, points: 1, description: null }],
      }, 'Bearer t');
    });

    it('sends the summary when the result is registered for an already finished match', async () => {
      detail = { matchId: 5, status: MatchStatus.Finished };
      const response = await service.create(1, 5, { scores: [{ teamId: 10, score: 1 }, { teamId: 11, score: 1 }] });
      expect(unitOfWork.saveDetail).not.toHaveBeenCalled();
      expect(response.notification).toEqual(summary);
    });

    it('returns 404 for a missing tournament', async () => {
      repository.findTournament.mockResolvedValue(null);
      await expect(service.create(1, 5, { scores: [] })).rejects.toBeInstanceOf(MatchResultsTournamentNotFoundError);
    });

    it('rejects invalid identifiers before touching the database', async () => {
      await expect(service.create(0, 5, { scores: [] })).rejects.toBeInstanceOf(MatchResultsInputInvalidError);
      await expect(service.create(1, 2147483648, { scores: [] })).rejects.toBeInstanceOf(MatchResultsInputInvalidError);
      expect(repository.findTournament).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns the result associated with the match', async () => {
      stored = { id: 7, matchId: 5, homeScore: 1, awayScore: 2, updatedAt: new Date('2027-01-10T21:00:00.000Z') };
      await expect(service.findOne(1, 5)).resolves.toMatchObject({
        id: 7, matchId: 5, tournamentId: 1, homeScore: 1, awayScore: 2, winnerTeamId: 11,
        updatedAt: '2027-01-10T21:00:00.000Z',
      });
    });

    describe('notifyFinalizedMatch', () => {
      it('notifies the result summary with the caller token for the owning tournament', async () => {
        stored = { id: 7, matchId: 5, homeScore: 2, awayScore: 1, updatedAt: new Date() };

        await expect(service.notifyFinalizedMatch(1, 5, 'Bearer t')).resolves.toEqual(summary);

        expect(notifications.notifyMatchSummary).toHaveBeenCalledWith(expect.objectContaining({
          matchId: 5, tournamentName: 'Copa', homeScore: 2, awayScore: 1,
        }), 'Bearer t');
      });

      it('rejects a match from another tournament or without a result', async () => {
        await expect(service.notifyFinalizedMatch(9, 5)).rejects.toBeInstanceOf(MatchResultsMatchNotFoundError);
        await expect(service.notifyFinalizedMatch(1, 5)).rejects.toBeInstanceOf(MatchResultsResultNotFoundError);
      });
    });

    it('returns 404 when the match belongs to another tournament or has no result', async () => {
      await expect(service.findOne(9, 5)).rejects.toBeInstanceOf(MatchResultsMatchNotFoundError);
      await expect(service.findOne(1, 5)).rejects.toBeInstanceOf(MatchResultsResultNotFoundError);
    });
  });

  describe('update', () => {
    beforeEach(() => {
      stored = { id: 7, matchId: 5, homeScore: 0, awayScore: 0, updatedAt: new Date('2027-01-10T20:30:00.000Z') };
    });

    it('requires scores or finalize=true', async () => {
      await expect(service.update(1, 5, {})).rejects.toBeInstanceOf(MatchResultsInputInvalidError);
      await expect(service.update(1, 5, { finalize: false })).rejects.toBeInstanceOf(MatchResultsInputInvalidError);
    });

    it('corrects the scores without notifying while the match is in play', async () => {
      const response = await service.update(1, 5, { scores: [{ teamId: 11, score: 4 }, { teamId: 10, score: 3 }] });
      expect(response).toMatchObject({ homeScore: 3, awayScore: 4, notification: null });
      expect(notifications.notifyMatchSummary).not.toHaveBeenCalled();
    });

    it('finalizes with the stored result and notifies once', async () => {
      const response = await service.update(1, 5, { finalize: true }, 'Bearer t');
      expect(unitOfWork.saveResult).not.toHaveBeenCalled();
      expect(response).toMatchObject({ matchStatus: MatchStatus.Finished, notification: summary });
    });

    it('allows correcting a finished match without sending the summary again', async () => {
      detail = { matchId: 5, status: MatchStatus.Finished };
      const response = await service.update(1, 5, {
        scores: [{ teamId: 10, score: 5 }, { teamId: 11, score: 0 }], finalize: true,
      });
      expect(response).toMatchObject({ homeScore: 5, notification: null });
      expect(notifications.notifyMatchSummary).not.toHaveBeenCalled();
    });

    it('returns 404 without a result and 409 for matches that are not in play or finished', async () => {
      stored = null;
      await expect(service.update(1, 5, { finalize: true })).rejects.toBeInstanceOf(MatchResultsResultNotFoundError);
      detail = { matchId: 5, status: MatchStatus.Cancelled };
      await expect(service.update(1, 5, { finalize: true })).rejects.toBeInstanceOf(MatchResultsNotAllowedError);
    });
  });
});
