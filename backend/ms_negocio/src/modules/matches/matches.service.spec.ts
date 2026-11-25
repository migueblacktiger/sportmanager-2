import { PhaseType } from '../tournament-phases/dto/phase-type';
import { Match } from './entities/match.entity';
import {
  MatchInputInvalidError,
  MatchNotFoundError,
  MatchPhaseNotFoundError,
} from './match.errors';
import { MatchMapper } from './mappers/match.mapper';
import { MatchesRepository } from './repositories/matches.repository';
import { MatchesService } from './matches.service';
import { MatchManagementService } from '../match-management/match-management.service';

const match = (type: PhaseType = PhaseType.Final, id = 1): Match => Object.assign(new Match(), {
  id,
  phaseId: 7,
  homeTeamId: 10,
  awayTeamId: 11,
  scheduledAt: new Date('2027-01-10T15:00:00.000Z'),
  phase: { id: 7, tournamentId: 4, name: 'Final', type },
  homeTeam: { id: 10, name: 'Equipo 10' },
  awayTeam: { id: 11, name: 'Equipo 11' },
});

describe('MatchesService', () => {
  const repository = {
    findPhase: jest.fn(),
    findById: jest.fn(),
    findByPhase: jest.fn(),
    remove: jest.fn(),
  };
  const managedMatch = {
    id: 1,
    tournamentId: 4,
    phaseId: 7,
    phaseName: 'Final',
    phaseType: PhaseType.Final,
    isFinalPhase: true,
    homeTeamId: 10,
    homeTeamName: 'Equipo 10',
    awayTeamId: 11,
    awayTeamName: 'Equipo 11',
    scheduledAt: '2027-01-10T15:00:00.000Z',
    status: 'scheduled',
    venue: null,
    attendanceCount: 0,
    notification: { recipients: 2, sent: 2, failed: 0, skipped: false },
  };
  const matchManagement = { create: jest.fn(), remove: jest.fn() };
  const dto = { homeTeamId: 11, awayTeamId: 10, scheduledAt: '2027-01-10T15:00:00.000Z' };
  let service: MatchesService;

  beforeEach(() => {
    jest.resetAllMocks();
    repository.findPhase.mockResolvedValue({ id: 7, tournamentId: 4 });
    matchManagement.create.mockResolvedValue(managedMatch);
    service = new MatchesService(
      repository as unknown as MatchesRepository,
      new MatchMapper(),
      matchManagement as unknown as MatchManagementService,
    );
  });

  describe('create', () => {
    it('uses the managed creation flow and preserves the legacy response shape', async () => {
      const result = await service.create(7, { ...dto, venueId: 3 }, 'Bearer abc');
      expect(result).toEqual({
        id: 1,
        phaseId: 7,
        phaseName: 'Final',
        phaseType: 'final',
        tournamentId: 4,
        isFinalPhase: true,
        homeTeamId: 10,
        homeTeamName: 'Equipo 10',
        awayTeamId: 11,
        awayTeamName: 'Equipo 11',
        scheduledAt: '2027-01-10T15:00:00.000Z',
        notification: { recipients: 2, sent: 2, failed: 0, skipped: false },
      });
      expect(matchManagement.create).toHaveBeenCalledWith(
        4, 7, { ...dto, venueId: 3 }, 'Bearer abc',
      );
    });

    it('rejects an unknown phase before attempting managed creation', async () => {
      repository.findPhase.mockResolvedValueOnce(null);
      await expect(service.create(7, dto)).rejects.toBeInstanceOf(MatchPhaseNotFoundError);
      expect(matchManagement.create).not.toHaveBeenCalled();
    });

    it('rejects invalid phase identifiers', async () => {
      for (const id of [0, -1, 1.5, 2147483648, Number.NaN]) {
        await expect(service.create(id, dto)).rejects.toBeInstanceOf(MatchInputInvalidError);
      }
    });
  });

  describe('queries and removal', () => {
    it('lists the matches of an existing phase and rejects an unknown phase', async () => {
      repository.findByPhase.mockResolvedValue([match(PhaseType.Final, 1), match(PhaseType.Final, 2)]);
      const result = await service.findByPhase(7);
      expect(result.map(item => item.id)).toEqual([1, 2]);
      expect(result.every(item => item.isFinalPhase)).toBe(true);
      repository.findPhase.mockResolvedValueOnce(null);
      await expect(service.findByPhase(7)).rejects.toBeInstanceOf(MatchPhaseNotFoundError);
    });

    it('returns one match or reports it as missing', async () => {
      repository.findById.mockResolvedValueOnce(match());
      await expect(service.findOne(1)).resolves.toMatchObject({ id: 1, phaseId: 7 });
      repository.findById.mockResolvedValueOnce(null);
      await expect(service.findOne(1)).rejects.toBeInstanceOf(MatchNotFoundError);
    });

    it('delegates removal to the lifecycle-validated match service', async () => {
      repository.findById.mockResolvedValue(match());
      matchManagement.remove.mockResolvedValue({ message: 'Eliminado' });
      await expect(service.remove(1)).resolves.toEqual({ message: 'Eliminado' });
      expect(matchManagement.remove).toHaveBeenCalledWith(4, 1);
      repository.findById.mockResolvedValueOnce(null);
      await expect(service.remove(1)).rejects.toBeInstanceOf(MatchNotFoundError);
      expect(matchManagement.remove).toHaveBeenCalledTimes(1);
    });
  });
});
