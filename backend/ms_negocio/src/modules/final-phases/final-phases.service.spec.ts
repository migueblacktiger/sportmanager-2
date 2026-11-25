import { Match } from '../matches/entities/match.entity';
import { MatchMapper } from '../matches/mappers/match.mapper';
import { PhaseType } from '../tournament-phases/dto/phase-type';
import { TournamentPhase } from '../tournament-phases/entities/tournament-phase.entity';
import {
  FinalPhaseHasMatchesError,
  FinalPhaseInputInvalidError,
  FinalPhaseNotFoundError,
  FinalPhaseOrderLockedError,
  FinalPhaseOrderTakenError,
  FinalPhaseTournamentNotFoundError,
} from './final-phase.errors';
import { FinalPhasesService } from './final-phases.service';
import { FinalPhaseMapper } from './mappers/final-phase.mapper';
import { FinalPhasesRepository } from './repositories/final-phases.repository';

const phase = (overrides: Partial<TournamentPhase> = {}): TournamentPhase => Object.assign(
  new TournamentPhase(),
  { id: 5, tournamentId: 4, name: 'Final', type: PhaseType.Final, phaseOrder: 3, ...overrides },
);

const match = (id: number): Match => Object.assign(new Match(), {
  id,
  phaseId: 5,
  homeTeamId: 10,
  awayTeamId: 11,
  scheduledAt: new Date('2027-01-10T15:00:00.000Z'),
  phase: phase(),
  homeTeam: { id: 10, name: 'Equipo 10' },
  awayTeam: { id: 11, name: 'Equipo 11' },
});

describe('FinalPhasesService', () => {
  const unitOfWork = {
    findTournamentForUpdate: jest.fn(),
    findPhaseForUpdate: jest.fn(),
    findTakenOrders: jest.fn(),
    countMatches: jest.fn(),
    save: jest.fn(),
    deletePhase: jest.fn(),
  };
  const repository = {
    transaction: jest.fn(),
    findTournament: jest.fn(),
    findPhase: jest.fn(),
    findFinalByTournament: jest.fn(),
    countMatchesByPhase: jest.fn(),
    findMatchesByPhase: jest.fn(),
  };
  let service: FinalPhasesService;

  beforeEach(() => {
    jest.resetAllMocks();
    repository.transaction.mockImplementation(
      (work: (tx: typeof unitOfWork) => Promise<unknown>) => work(unitOfWork),
    );
    repository.findTournament.mockResolvedValue({ id: 4 });
    unitOfWork.findTournamentForUpdate.mockResolvedValue({ id: 4 });
    unitOfWork.findPhaseForUpdate.mockResolvedValue(phase());
    unitOfWork.findTakenOrders.mockResolvedValue([]);
    unitOfWork.countMatches.mockResolvedValue(0);
    unitOfWork.save.mockImplementation((entity: TournamentPhase) => Promise.resolve(entity));
    unitOfWork.deletePhase.mockResolvedValue(true);
    service = new FinalPhasesService(
      repository as unknown as FinalPhasesRepository,
      new FinalPhaseMapper(),
      new MatchMapper(),
    );
  });

  describe('create', () => {
    it('registers a phase of type final inside the tournament', async () => {
      unitOfWork.save.mockImplementation((entity: TournamentPhase) => Promise.resolve({ ...entity, id: 9 }));
      const result = await service.create(4, { name: '  Gran final  ', order: 3 });
      expect(result).toEqual({
        id: 9, tournamentId: 4, name: 'Gran final', type: 'final', order: 3, matchCount: 0,
      });
      expect(unitOfWork.save).toHaveBeenCalledWith(expect.objectContaining({
        tournamentId: 4, name: 'Gran final', type: PhaseType.Final, phaseOrder: 3,
      }));
    });

    it('requires an existing tournament and a free order', async () => {
      unitOfWork.findTournamentForUpdate.mockResolvedValueOnce(null);
      await expect(service.create(4, { name: 'Final', order: 3 }))
        .rejects.toBeInstanceOf(FinalPhaseTournamentNotFoundError);
      unitOfWork.findTakenOrders.mockResolvedValueOnce([3]);
      await expect(service.create(4, { name: 'Final', order: 3 }))
        .rejects.toBeInstanceOf(FinalPhaseOrderTakenError);
      expect(unitOfWork.save).not.toHaveBeenCalled();
    });

    it('rejects invalid tournament identifiers', async () => {
      for (const id of [0, -3, 1.5, 2147483648, Number.NaN]) {
        await expect(service.create(id, { name: 'Final', order: 1 }))
          .rejects.toBeInstanceOf(FinalPhaseInputInvalidError);
      }
    });
  });

  describe('queries', () => {
    it('lists only final phases with the number of matches of each one', async () => {
      repository.findFinalByTournament.mockResolvedValue([
        phase({ id: 5, phaseOrder: 3 }), phase({ id: 6, name: 'Tercer puesto', phaseOrder: 4 }),
      ]);
      repository.countMatchesByPhase.mockResolvedValue(new Map([[5, 2]]));
      const result = await service.findByTournament(4);
      expect(result.map(item => [item.id, item.matchCount])).toEqual([[5, 2], [6, 0]]);
      expect(result.every(item => item.type === 'final')).toBe(true);
      expect(repository.countMatchesByPhase).toHaveBeenCalledWith([5, 6]);
    });

    it('rejects an unknown tournament', async () => {
      repository.findTournament.mockResolvedValueOnce(null);
      await expect(service.findByTournament(4)).rejects.toBeInstanceOf(FinalPhaseTournamentNotFoundError);
    });

    it('returns one final phase with its match count', async () => {
      repository.findPhase.mockResolvedValue(phase());
      repository.countMatchesByPhase.mockResolvedValue(new Map([[5, 3]]));
      await expect(service.findOne(4, 5)).resolves.toMatchObject({ id: 5, tournamentId: 4, matchCount: 3 });
    });

    it('treats a missing phase, a phase of another type or of another tournament as not found', async () => {
      repository.findPhase.mockResolvedValueOnce(null);
      await expect(service.findOne(4, 5)).rejects.toBeInstanceOf(FinalPhaseNotFoundError);
      repository.findPhase.mockResolvedValueOnce(phase({ type: PhaseType.Groups }));
      await expect(service.findOne(4, 5)).rejects.toBeInstanceOf(FinalPhaseNotFoundError);
      repository.findPhase.mockResolvedValueOnce(phase({ tournamentId: 99 }));
      await expect(service.findOne(4, 5)).rejects.toBeInstanceOf(FinalPhaseNotFoundError);
    });

    it('identifies the matches of the stage as part of the final phase', async () => {
      repository.findPhase.mockResolvedValue(phase());
      repository.findMatchesByPhase.mockResolvedValue([match(1), match(2)]);
      const result = await service.findMatches(4, 5);
      expect(result.map(item => item.id)).toEqual([1, 2]);
      expect(result.every(item => item.phaseId === 5 && item.isFinalPhase && item.phaseType === 'final'))
        .toBe(true);
      expect(repository.findMatchesByPhase).toHaveBeenCalledWith(5);
    });

    it('does not list matches of a phase that is not a final phase of that tournament', async () => {
      repository.findPhase.mockResolvedValue(phase({ type: PhaseType.League }));
      await expect(service.findMatches(4, 5)).rejects.toBeInstanceOf(FinalPhaseNotFoundError);
      expect(repository.findMatchesByPhase).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('changes name and order only on the final phase, keeping its type and tournament', async () => {
      const result = await service.update(4, 5, { name: ' Final 2027 ', order: 6 });
      expect(result).toEqual({
        id: 5, tournamentId: 4, name: 'Final 2027', type: 'final', order: 6, matchCount: 0,
      });
      expect(unitOfWork.save).toHaveBeenCalledTimes(1);
      expect(unitOfWork.findTakenOrders).toHaveBeenCalledWith(4, [6], 5);
    });

    it('locks the tournament before the phase', async () => {
      await service.update(4, 5, { name: 'X' });
      expect(unitOfWork.findTournamentForUpdate.mock.invocationCallOrder[0])
        .toBeLessThan(unitOfWork.findPhaseForUpdate.mock.invocationCallOrder[0]);
    });

    it('rejects an order already used by another phase of the tournament', async () => {
      unitOfWork.findTakenOrders.mockResolvedValue([6]);
      await expect(service.update(4, 5, { order: 6 })).rejects.toBeInstanceOf(FinalPhaseOrderTakenError);
      expect(unitOfWork.save).not.toHaveBeenCalled();
    });

    it('keeps the order locked once the phase has matches, but still allows renaming', async () => {
      unitOfWork.countMatches.mockResolvedValue(2);
      await expect(service.update(4, 5, { order: 6 })).rejects.toBeInstanceOf(FinalPhaseOrderLockedError);
      expect(unitOfWork.save).not.toHaveBeenCalled();
      await expect(service.update(4, 5, { name: 'Nueva final', order: 3 }))
        .resolves.toMatchObject({ name: 'Nueva final', order: 3, matchCount: 2 });
    });

    it('does not touch phases that are not final phases of that tournament', async () => {
      unitOfWork.findPhaseForUpdate.mockResolvedValueOnce(null);
      await expect(service.update(4, 5, { name: 'X' })).rejects.toBeInstanceOf(FinalPhaseNotFoundError);
      unitOfWork.findPhaseForUpdate.mockResolvedValueOnce(phase({ type: PhaseType.Knockout }));
      await expect(service.update(4, 5, { name: 'X' })).rejects.toBeInstanceOf(FinalPhaseNotFoundError);
      unitOfWork.findPhaseForUpdate.mockResolvedValueOnce(phase({ tournamentId: 99 }));
      await expect(service.update(4, 5, { name: 'X' })).rejects.toBeInstanceOf(FinalPhaseNotFoundError);
      unitOfWork.findTournamentForUpdate.mockResolvedValueOnce(null);
      await expect(service.update(4, 5, { name: 'X' }))
        .rejects.toBeInstanceOf(FinalPhaseTournamentNotFoundError);
      expect(unitOfWork.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes only the final phase and reports that the rest of the tournament is kept', async () => {
      await expect(service.remove(4, 5)).resolves.toEqual({
        message: 'Fase final #5 eliminada correctamente; el torneo y las demas fases se conservaron',
      });
      expect(unitOfWork.deletePhase).toHaveBeenCalledTimes(1);
      expect(unitOfWork.deletePhase).toHaveBeenCalledWith(5);
    });

    it('refuses to delete a final phase that has matches', async () => {
      unitOfWork.countMatches.mockResolvedValue(1);
      await expect(service.remove(4, 5)).rejects.toBeInstanceOf(FinalPhaseHasMatchesError);
      expect(unitOfWork.deletePhase).not.toHaveBeenCalled();
    });

    it('reports a phase that is missing, not final, from another tournament or deleted concurrently', async () => {
      unitOfWork.findPhaseForUpdate.mockResolvedValueOnce(null);
      await expect(service.remove(4, 5)).rejects.toBeInstanceOf(FinalPhaseNotFoundError);
      unitOfWork.findPhaseForUpdate.mockResolvedValueOnce(phase({ type: PhaseType.Groups }));
      await expect(service.remove(4, 5)).rejects.toBeInstanceOf(FinalPhaseNotFoundError);
      unitOfWork.findPhaseForUpdate.mockResolvedValueOnce(phase({ tournamentId: 99 }));
      await expect(service.remove(4, 5)).rejects.toBeInstanceOf(FinalPhaseNotFoundError);
      unitOfWork.deletePhase.mockResolvedValueOnce(false);
      await expect(service.remove(4, 5)).rejects.toBeInstanceOf(FinalPhaseNotFoundError);
      unitOfWork.findTournamentForUpdate.mockResolvedValueOnce(null);
      await expect(service.remove(4, 5)).rejects.toBeInstanceOf(FinalPhaseTournamentNotFoundError);
    });
  });
});
