import { Match } from '../matches/entities/match.entity';
import { MatchStatus } from './dto/match-status';
import {
  MatchManagementInputInvalidError,
  MatchManagementInvalidTransitionError,
  MatchManagementMatchNotFoundError,
  MatchManagementNotDeletableError,
  MatchManagementNotEditableError,
  MatchManagementPhaseNotFoundError,
  MatchManagementResultPresentError,
  MatchManagementTeamNotEnabledError,
  MatchManagementTournamentNotFoundError,
  MatchManagementVenueInactiveError,
} from './match-management.errors';
import { MatchManagementMapper } from './mappers/match-management.mapper';
import { MatchManagementService } from './match-management.service';
import { MatchNotificationService } from './notifications/match-notification.service';
import { MatchManagementRepository } from './repositories/match-management.repository';
import { MatchResultsService } from '../match-results/match-results.service';

const match = (): Match => Object.assign(new Match(), {
  id: 1,
  phaseId: 7,
  homeTeamId: 10,
  awayTeamId: 11,
  scheduledAt: new Date('2027-01-10T15:00:00.000Z'),
  phase: { id: 7, tournamentId: 4, name: 'Grupos', type: 'groups' },
  homeTeam: { id: 10, name: 'Equipo 10' },
  awayTeam: { id: 11, name: 'Equipo 11' },
});
const detail = (status: MatchStatus, venueId: number | null = null) => (
  { id: 5, matchId: 1, status, venueId, venue: null }
);

describe('MatchManagementService', () => {
  const unitOfWork = {
    findTournamentForShare: jest.fn(),
    findPhaseForShare: jest.fn(),
    findTeamsForShare: jest.fn(),
    findRegisteredTeamIds: jest.fn(),
    findVenueForShare: jest.fn(),
    findMatchForUpdate: jest.fn(),
    findDetailForUpdate: jest.fn(),
    insertMatch: jest.fn(),
    saveMatch: jest.fn(),
    saveDetail: jest.fn(),
    countAttendances: jest.fn(),
    hasResult: jest.fn(),
    deleteMatch: jest.fn(),
  };
  const repository = {
    transaction: jest.fn(),
    findTournament: jest.fn(),
    findPhase: jest.fn(),
    findMatch: jest.fn(),
    findMatches: jest.fn(),
    findDetails: jest.fn(),
    countAttendances: jest.fn(),
  };
  const notifications = { notifyMatchCreated: jest.fn() };
  const results = { notifyFinalizedMatch: jest.fn() };
  const summary = { recipients: 2, sent: 2, failed: 0, skipped: false };
  const dto = { homeTeamId: 10, awayTeamId: 11, scheduledAt: '2027-01-10T15:00:00.000Z' };
  let service: MatchManagementService;

  beforeEach(() => {
    jest.resetAllMocks();
    repository.transaction.mockImplementation(
      (work: (tx: typeof unitOfWork) => Promise<unknown>) => work(unitOfWork),
    );
    repository.findTournament.mockResolvedValue({ id: 4, name: 'Copa' });
    repository.findPhase.mockResolvedValue({ id: 7, tournamentId: 4 });
    repository.findMatch.mockResolvedValue(match());
    repository.findDetails.mockResolvedValue(new Map());
    repository.countAttendances.mockResolvedValue(new Map());
    unitOfWork.findTournamentForShare.mockResolvedValue({ id: 4 });
    unitOfWork.findPhaseForShare.mockResolvedValue({ id: 7, tournamentId: 4 });
    unitOfWork.findTeamsForShare.mockResolvedValue([{ id: 10, active: true }, { id: 11, active: true }]);
    unitOfWork.findRegisteredTeamIds.mockResolvedValue([10, 11]);
    unitOfWork.findVenueForShare.mockResolvedValue({ id: 3, active: true });
    unitOfWork.findMatchForUpdate.mockResolvedValue(match());
    unitOfWork.findDetailForUpdate.mockResolvedValue(detail(MatchStatus.Scheduled));
    unitOfWork.insertMatch.mockResolvedValue(match());
    unitOfWork.saveMatch.mockImplementation(async (value: Match) => value);
    unitOfWork.saveDetail.mockImplementation(async (value: unknown) => value);
    unitOfWork.countAttendances.mockResolvedValue(0);
    unitOfWork.hasResult.mockResolvedValue(false);
    unitOfWork.deleteMatch.mockResolvedValue(true);
    notifications.notifyMatchCreated.mockResolvedValue(summary);
    results.notifyFinalizedMatch.mockResolvedValue(summary);
    service = new MatchManagementService(
      repository as unknown as MatchManagementRepository,
      new MatchManagementMapper(),
      notifications as unknown as MatchNotificationService,
      results as unknown as MatchResultsService,
    );
  });

  describe('create', () => {
    it('creates a scheduled match with its venue and notifies fans with the caller token', async () => {
      unitOfWork.findDetailForUpdate.mockResolvedValue(null);
      repository.findDetails.mockResolvedValue(new Map([[1, { ...detail(MatchStatus.Scheduled, 3), venue: { id: 3, name: 'Estadio', address: null, active: true } }]]));
      const result = await service.create(4, 7, { ...dto, venueId: 3 }, 'Bearer abc');
      expect(unitOfWork.saveDetail).toHaveBeenCalledWith(expect.objectContaining({
        matchId: 1, status: MatchStatus.Scheduled, venueId: 3,
      }));
      expect(result).toMatchObject({
        id: 1, tournamentId: 4, status: 'scheduled', venue: { id: 3, name: 'Estadio' }, notification: summary,
      });
      expect(notifications.notifyMatchCreated).toHaveBeenCalledWith(
        expect.objectContaining({ matchId: 1, tournamentName: 'Copa', venueName: 'Estadio' }), 'Bearer abc',
      );
    });

    it('rejects a team against itself before touching the database', async () => {
      await expect(service.create(4, 7, { ...dto, awayTeamId: 10 })).rejects.toBeInstanceOf(MatchManagementInputInvalidError);
      expect(repository.transaction).not.toHaveBeenCalled();
    });

    it('requires an existing tournament and a phase that belongs to it', async () => {
      repository.findTournament.mockResolvedValue(null);
      await expect(service.create(4, 7, dto)).rejects.toBeInstanceOf(MatchManagementTournamentNotFoundError);
      repository.findTournament.mockResolvedValue({ id: 4, name: 'Copa' });
      repository.findPhase.mockResolvedValue({ id: 7, tournamentId: 99 });
      await expect(service.create(4, 7, dto)).rejects.toBeInstanceOf(MatchManagementPhaseNotFoundError);
    });

    it('rejects inactive or unregistered teams and inactive venues', async () => {
      unitOfWork.findTeamsForShare.mockResolvedValue([{ id: 10, active: true }, { id: 11, active: false }]);
      await expect(service.create(4, 7, dto)).rejects.toBeInstanceOf(MatchManagementTeamNotEnabledError);
      unitOfWork.findTeamsForShare.mockResolvedValue([{ id: 10, active: true }, { id: 11, active: true }]);
      unitOfWork.findRegisteredTeamIds.mockResolvedValue([10]);
      await expect(service.create(4, 7, dto)).rejects.toBeInstanceOf(MatchManagementTeamNotEnabledError);
      unitOfWork.findRegisteredTeamIds.mockResolvedValue([10, 11]);
      unitOfWork.findVenueForShare.mockResolvedValue({ id: 3, active: false });
      await expect(service.create(4, 7, { ...dto, venueId: 3 })).rejects.toBeInstanceOf(MatchManagementVenueInactiveError);
      expect(unitOfWork.insertMatch).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates date and venue of a scheduled match without revalidating unchanged teams', async () => {
      const result = await service.update(4, 1, { scheduledAt: '2027-02-01T10:00:00.000Z', venueId: 3 });
      expect(unitOfWork.findTeamsForShare).not.toHaveBeenCalled();
      expect(unitOfWork.saveMatch).toHaveBeenCalledWith(expect.objectContaining({
        scheduledAt: new Date('2027-02-01T10:00:00.000Z'),
      }));
      expect(unitOfWork.saveDetail).toHaveBeenCalledWith(expect.objectContaining({ venueId: 3 }));
      expect(result.id).toBe(1);
    });

    it('creates the detail row when a legacy match gets a venue', async () => {
      unitOfWork.findDetailForUpdate.mockResolvedValue(null);
      await service.update(4, 1, { venueId: 3 });
      expect(unitOfWork.saveDetail).toHaveBeenCalledWith(expect.objectContaining({
        matchId: 1, status: MatchStatus.Scheduled, venueId: 3,
      }));
    });

    it('validates only the team that changes', async () => {
      unitOfWork.findTeamsForShare.mockResolvedValue([{ id: 12, active: true }]);
      unitOfWork.findRegisteredTeamIds.mockResolvedValue([12]);
      await service.update(4, 1, { awayTeamId: 12 });
      expect(unitOfWork.findTeamsForShare).toHaveBeenCalledWith([12]);
    });

    it.each([MatchStatus.InProgress, MatchStatus.Finished, MatchStatus.Cancelled])(
      'refuses to update a %s match', async status => {
        unitOfWork.findDetailForUpdate.mockResolvedValue(detail(status));
        await expect(service.update(4, 1, { venueId: 3 })).rejects.toBeInstanceOf(MatchManagementNotEditableError);
        expect(unitOfWork.saveMatch).not.toHaveBeenCalled();
      },
    );

    it('rejects an empty body and a team against itself', async () => {
      await expect(service.update(4, 1, {})).rejects.toBeInstanceOf(MatchManagementInputInvalidError);
      await expect(service.update(4, 1, { homeTeamId: 11 })).rejects.toBeInstanceOf(MatchManagementInputInvalidError);
    });

    it('treats a match of another tournament as not found', async () => {
      unitOfWork.findPhaseForShare.mockResolvedValue({ id: 7, tournamentId: 99 });
      await expect(service.update(4, 1, { venueId: 3 })).rejects.toBeInstanceOf(MatchManagementMatchNotFoundError);
    });
  });

  describe('updateStatus', () => {
    it('moves a match through a valid transition', async () => {
      const result = await service.updateStatus(4, 1, { status: MatchStatus.InProgress });
      expect(unitOfWork.saveDetail).toHaveBeenCalledWith(expect.objectContaining({ status: MatchStatus.InProgress }));
      expect(result.id).toBe(1);
    });

    it('rejects an invalid transition', async () => {
      await expect(service.updateStatus(4, 1, { status: MatchStatus.Finished }))
        .rejects.toBeInstanceOf(MatchManagementInvalidTransitionError);
    });

    it('sends the final summary when finishing a match with an existing result', async () => {
      unitOfWork.findDetailForUpdate.mockResolvedValue(detail(MatchStatus.InProgress));
      unitOfWork.hasResult.mockResolvedValue(true);
      repository.findDetails.mockResolvedValue(new Map([[1, detail(MatchStatus.Finished)]]));

      const response = await service.updateStatus(4, 1, { status: MatchStatus.Finished }, 'Bearer abc');

      expect(unitOfWork.saveDetail).toHaveBeenCalledWith(expect.objectContaining({ status: MatchStatus.Finished }));
      expect(results.notifyFinalizedMatch).toHaveBeenCalledWith(4, 1, 'Bearer abc');
      expect(response).toMatchObject({ status: MatchStatus.Finished, notification: summary });
    });

    it('does not send a final summary when the match has no result yet', async () => {
      unitOfWork.findDetailForUpdate.mockResolvedValue(detail(MatchStatus.InProgress));
      unitOfWork.hasResult.mockResolvedValue(false);

      await service.updateStatus(4, 1, { status: MatchStatus.Finished });

      expect(results.notifyFinalizedMatch).not.toHaveBeenCalled();
    });

    it('does not cancel a match that already has a result', async () => {
      unitOfWork.findDetailForUpdate.mockResolvedValue(detail(MatchStatus.InProgress));
      unitOfWork.hasResult.mockResolvedValue(true);
      await expect(service.updateStatus(4, 1, { status: MatchStatus.Cancelled }))
        .rejects.toBeInstanceOf(MatchManagementResultPresentError);
      expect(unitOfWork.saveDetail).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes a scheduled match without attendances', async () => {
      await expect(service.remove(4, 1)).resolves.toEqual({ message: expect.stringContaining('#1') });
      expect(unitOfWork.deleteMatch).toHaveBeenCalledWith(1);
    });

    it('refuses to delete a match in play or with attendances', async () => {
      unitOfWork.findDetailForUpdate.mockResolvedValue(detail(MatchStatus.InProgress));
      await expect(service.remove(4, 1)).rejects.toBeInstanceOf(MatchManagementNotDeletableError);
      unitOfWork.findDetailForUpdate.mockResolvedValue(detail(MatchStatus.Cancelled));
      unitOfWork.countAttendances.mockResolvedValue(2);
      await expect(service.remove(4, 1)).rejects.toBeInstanceOf(MatchManagementNotDeletableError);
      unitOfWork.countAttendances.mockResolvedValue(0);
      unitOfWork.hasResult.mockResolvedValue(true);
      await expect(service.remove(4, 1)).rejects.toBeInstanceOf(MatchManagementNotDeletableError);
      expect(unitOfWork.deleteMatch).not.toHaveBeenCalled();
    });
  });

  describe('queries', () => {
    it('lists matches of a tournament with status and venue defaults', async () => {
      repository.findMatches.mockResolvedValue([match()]);
      const result = await service.findAll(4, { status: MatchStatus.Scheduled });
      expect(repository.findMatches).toHaveBeenCalledWith(4, { status: MatchStatus.Scheduled });
      expect(result).toEqual([expect.objectContaining({ id: 1, status: 'scheduled', venue: null, attendanceCount: 0 })]);
    });

    it('returns 404 for a match of another tournament', async () => {
      repository.findMatch.mockResolvedValue({ ...match(), phase: { ...match().phase, tournamentId: 99 } });
      await expect(service.findOne(4, 1)).rejects.toBeInstanceOf(MatchManagementMatchNotFoundError);
    });

    it('requires the phase to belong to the tournament when listing by phase', async () => {
      repository.findPhase.mockResolvedValue({ id: 7, tournamentId: 99 });
      await expect(service.findByPhase(4, 7)).rejects.toBeInstanceOf(MatchManagementPhaseNotFoundError);
    });
  });
});
