import { MatchStatus } from '../match-management/dto/match-status';
import { MatchAnnotationsService } from './match-annotations.service';
import { MatchResultsMapper } from './mappers/match-results.mapper';
import {
  MatchResultsAnnotationNotFoundError,
  MatchResultsInputInvalidError,
  MatchResultsMatchNotFoundError,
  MatchResultsNotAllowedError,
  MatchResultsPlayerNotFoundError,
  MatchResultsPlayerNotInMatchError,
  MatchResultsPlayerTeamAmbiguousError,
  MatchResultsTeamNotParticipantError,
} from './match-results.errors';
import { MatchResultsNotificationService } from './notifications/match-results-notification.service';
import { MatchResultsRepository } from './repositories/match-results.repository';

const match = {
  id: 5, phaseId: 2, homeTeamId: 10, awayTeamId: 11, scheduledAt: new Date('2027-01-10T20:00:00.000Z'),
  phase: { tournamentId: 1, name: 'Grupos' }, homeTeam: { name: 'Rojos' }, awayTeam: { name: 'Azules' },
};
const contract = (teamId: number, overrides: Record<string, unknown> = {}) => ({
  teamId, startDate: '2026-01-01', endDate: '2027-12-31', finishedAt: null, ...overrides,
});
const summary = { recipients: 1, sent: 1, failed: 0, skipped: false };

describe('MatchAnnotationsService', () => {
  const unitOfWork = {
    lockMatch: jest.fn(), findPlayerForShare: jest.fn(), findContracts: jest.fn(),
    saveAnnotation: jest.fn(), findAnnotationForUpdate: jest.fn(), deleteAnnotation: jest.fn(),
  };
  const repository = {
    transaction: jest.fn(), findTournament: jest.fn(), findMatch: jest.fn(),
    findAnnotations: jest.fn(), findAnnotation: jest.fn(),
  };
  const notifications = { notifyAnnotation: jest.fn() };
  let status: MatchStatus;
  let stored: Record<string, unknown>;
  let service: MatchAnnotationsService;

  const annotationRow = (overrides: Record<string, unknown> = {}) => ({
    id: 3, matchId: 5, playerId: 20, teamId: 10, minute: 12, points: 1, description: null,
    createdAt: new Date('2027-01-10T20:15:00.000Z'), ...overrides,
  });

  beforeEach(() => {
    jest.resetAllMocks();
    status = MatchStatus.InProgress;
    stored = annotationRow();
    repository.transaction.mockImplementation((work: (tx: typeof unitOfWork) => Promise<unknown>) => work(unitOfWork));
    repository.findTournament.mockResolvedValue({ id: 1, name: 'Copa' });
    repository.findMatch.mockResolvedValue(match);
    repository.findAnnotation.mockImplementation(() => Promise.resolve({
      ...stored, player: { name: 'Ana' }, team: { name: stored.teamId === 10 ? 'Rojos' : 'Azules' },
    }));
    unitOfWork.lockMatch.mockImplementation(() => Promise.resolve({ match, detail: { matchId: 5, status } }));
    unitOfWork.findPlayerForShare.mockResolvedValue({ id: 20, name: 'Ana' });
    unitOfWork.findContracts.mockResolvedValue([contract(10)]);
    unitOfWork.saveAnnotation.mockImplementation((entity: Record<string, unknown>) => {
      stored = { ...entity, id: 3 };
      return Promise.resolve(stored);
    });
    unitOfWork.findAnnotationForUpdate.mockImplementation(() => Promise.resolve({ ...stored }));
    unitOfWork.deleteAnnotation.mockResolvedValue(true);
    notifications.notifyAnnotation.mockResolvedValue(summary);
    service = new MatchAnnotationsService(
      repository as unknown as MatchResultsRepository,
      new MatchResultsMapper(),
      notifications as unknown as MatchResultsNotificationService,
    );
  });

  describe('create', () => {
    it('derives the team from the contract in force on the match date and notifies the fans', async () => {
      const response = await service.create(1, 5, { playerId: 20, minute: 12, description: 'Penal' }, 'Bearer t');
      expect(unitOfWork.saveAnnotation).toHaveBeenCalledWith(expect.objectContaining({
        matchId: 5, playerId: 20, teamId: 10, minute: 12, points: 1, description: 'Penal',
      }));
      expect(response).toMatchObject({
        id: 3, matchId: 5, tournamentId: 1, playerId: 20, playerName: 'Ana', teamId: 10, teamName: 'Rojos',
        notification: summary,
      });
      expect(notifications.notifyAnnotation).toHaveBeenCalledWith(expect.objectContaining({
        matchId: 5, tournamentName: 'Copa', homeTeamName: 'Rojos', awayTeamName: 'Azules', playerName: 'Ana',
      }), 'Bearer t');
    });

    it('accepts annotations for matches already finished', async () => {
      status = MatchStatus.Finished;
      await expect(service.create(1, 5, { playerId: 20 })).resolves.toMatchObject({ id: 3 });
    });

    it.each([MatchStatus.Scheduled, MatchStatus.Postponed, MatchStatus.Cancelled])(
      'does not register annotations while the match is %s', async (value) => {
        status = value;
        await expect(service.create(1, 5, { playerId: 20 })).rejects.toBeInstanceOf(MatchResultsNotAllowedError);
        expect(unitOfWork.saveAnnotation).not.toHaveBeenCalled();
      },
    );

    it('returns 404 for a missing player', async () => {
      unitOfWork.findPlayerForShare.mockResolvedValue(null);
      await expect(service.create(1, 5, { playerId: 20 })).rejects.toBeInstanceOf(MatchResultsPlayerNotFoundError);
    });

    it('rejects a player of neither participating team', async () => {
      unitOfWork.findContracts.mockResolvedValue([]);
      await expect(service.create(1, 5, { playerId: 20 })).rejects.toBeInstanceOf(MatchResultsPlayerNotInMatchError);
    });

    it.each([
      ['has not started', contract(10, { startDate: '2027-01-11' })],
      ['has expired', contract(10, { endDate: '2027-01-09' })],
      ['was finished before the match', contract(10, { finishedAt: new Date('2027-01-05T00:00:00.000Z') })],
    ])('ignores a contract that %s on the match date', async (_label, row) => {
      unitOfWork.findContracts.mockResolvedValue([row]);
      await expect(service.create(1, 5, { playerId: 20 })).rejects.toBeInstanceOf(MatchResultsPlayerNotInMatchError);
    });

    it('uses a contract that ends on the match day (inclusive)', async () => {
      unitOfWork.findContracts.mockResolvedValue([contract(11, { endDate: '2027-01-10' })]);
      await expect(service.create(1, 5, { playerId: 20 })).resolves.toMatchObject({ teamId: 11 });
    });

    it('asks for teamId when the player belongs to both teams, and honours it', async () => {
      unitOfWork.findContracts.mockResolvedValue([contract(10), contract(11)]);
      await expect(service.create(1, 5, { playerId: 20 })).rejects.toBeInstanceOf(MatchResultsPlayerTeamAmbiguousError);
      await expect(service.create(1, 5, { playerId: 20, teamId: 11 })).resolves.toMatchObject({ teamId: 11 });
    });

    it('rejects an explicit team that is not a participant or the player does not belong to', async () => {
      await expect(service.create(1, 5, { playerId: 20, teamId: 99 }))
        .rejects.toBeInstanceOf(MatchResultsTeamNotParticipantError);
      await expect(service.create(1, 5, { playerId: 20, teamId: 11 }))
        .rejects.toBeInstanceOf(MatchResultsPlayerNotInMatchError);
    });
  });

  describe('queries', () => {
    it('lists the annotations ordered by the repository and checks the tournament', async () => {
      repository.findAnnotations.mockResolvedValue([
        { ...annotationRow(), player: { name: 'Ana' }, team: { name: 'Rojos' } },
      ]);
      await expect(service.findAll(1, 5)).resolves.toHaveLength(1);
      await expect(service.findAll(9, 5)).rejects.toBeInstanceOf(MatchResultsMatchNotFoundError);
    });

    it('returns 404 for an annotation of another match', async () => {
      stored = annotationRow({ matchId: 6 });
      await expect(service.findOne(1, 5, 3)).rejects.toBeInstanceOf(MatchResultsAnnotationNotFoundError);
      repository.findAnnotation.mockResolvedValue(null);
      await expect(service.findOne(1, 5, 3)).rejects.toBeInstanceOf(MatchResultsAnnotationNotFoundError);
    });
  });

  describe('update', () => {
    it('requires at least one field', async () => {
      await expect(service.update(1, 5, 3, {})).rejects.toBeInstanceOf(MatchResultsInputInvalidError);
    });

    it('edits minute, points and description without revalidating the player', async () => {
      const response = await service.update(1, 5, 3, { minute: 30, points: 2, description: 'Tiro libre' });
      expect(unitOfWork.findContracts).not.toHaveBeenCalled();
      expect(unitOfWork.findPlayerForShare).not.toHaveBeenCalled();
      expect(response).toMatchObject({ minute: 30, points: 2, description: 'Tiro libre', playerId: 20, teamId: 10 });
    });

    it('clears minute and description with null', async () => {
      stored = annotationRow({ description: 'x' });
      await expect(service.update(1, 5, 3, { minute: null, description: null }))
        .resolves.toMatchObject({ minute: null, description: null });
    });

    it('revalidates and re-derives the team when the player changes', async () => {
      unitOfWork.findContracts.mockResolvedValue([contract(11)]);
      const response = await service.update(1, 5, 3, { playerId: 21 });
      expect(unitOfWork.findPlayerForShare).toHaveBeenCalledWith(21);
      expect(response).toMatchObject({ playerId: 21, teamId: 11 });
    });

    it('rejects a new player that does not belong to the match or does not exist', async () => {
      unitOfWork.findContracts.mockResolvedValue([]);
      await expect(service.update(1, 5, 3, { playerId: 21 })).rejects.toBeInstanceOf(MatchResultsPlayerNotInMatchError);
      unitOfWork.findPlayerForShare.mockResolvedValue(null);
      await expect(service.update(1, 5, 3, { playerId: 21 })).rejects.toBeInstanceOf(MatchResultsPlayerNotFoundError);
    });

    it('returns 404 for an annotation of another match and 409 when the match is not in play', async () => {
      stored = annotationRow({ matchId: 6 });
      await expect(service.update(1, 5, 3, { minute: 1 })).rejects.toBeInstanceOf(MatchResultsAnnotationNotFoundError);
      stored = annotationRow();
      status = MatchStatus.Cancelled;
      await expect(service.update(1, 5, 3, { minute: 1 })).rejects.toBeInstanceOf(MatchResultsNotAllowedError);
    });
  });

  describe('remove', () => {
    it('deletes only the annotation, whatever the state of the match', async () => {
      status = MatchStatus.Cancelled;
      await expect(service.remove(1, 5, 3)).resolves.toEqual({
        message: expect.stringContaining('el jugador y el partido se conservaron'),
      });
      expect(unitOfWork.deleteAnnotation).toHaveBeenCalledWith(3);
    });

    it('returns 404 for a missing annotation or one of another match', async () => {
      stored = annotationRow({ matchId: 6 });
      await expect(service.remove(1, 5, 3)).rejects.toBeInstanceOf(MatchResultsAnnotationNotFoundError);
      expect(unitOfWork.deleteAnnotation).not.toHaveBeenCalled();
    });
  });
});
