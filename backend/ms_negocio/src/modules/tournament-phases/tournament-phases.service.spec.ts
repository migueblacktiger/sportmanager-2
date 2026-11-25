import { PhaseType } from './dto/phase-type';
import { TournamentPhase } from './entities/tournament-phase.entity';
import { TournamentPhaseMapper } from './mappers/tournament-phase.mapper';
import { TournamentPhasesRepository } from './repositories/tournament-phases.repository';
import {
  TournamentPhaseHasDependenciesError,
  TournamentPhaseInputInvalidError,
  TournamentPhaseNotFoundError,
  TournamentPhaseOrderLockedError,
  TournamentPhaseOrderTakenError,
  TournamentPhaseTournamentNotFoundError,
  TournamentPhaseFinalTypeLockedError,
  TournamentPhaseTypeLockedError,
} from './tournament-phase.errors';
import { TournamentPhasesService } from './tournament-phases.service';

const phase = (id: number, order: number, type = PhaseType.Groups): TournamentPhase => Object.assign(
  new TournamentPhase(),
  { id, tournamentId: 4, name: `Fase ${id}`, type, phaseOrder: order },
);

describe('TournamentPhasesService', () => {
  const unitOfWork = {
    findTournamentForUpdate: jest.fn(),
    findPhaseForUpdate: jest.fn(),
    countGroups: jest.fn(),
    countMatches: jest.fn(),
    findTakenOrders: jest.fn(),
    insertMany: jest.fn(),
    save: jest.fn(),
  };
  const repository = {
    transaction: jest.fn(),
    findTournament: jest.fn(),
    findById: jest.fn(),
    findByTournament: jest.fn(),
    remove: jest.fn(),
  };
  let service: TournamentPhasesService;

  beforeEach(() => {
    jest.resetAllMocks();
    repository.transaction.mockImplementation(
      (work: (tx: typeof unitOfWork) => Promise<unknown>) => work(unitOfWork),
    );
    service = new TournamentPhasesService(
      repository as unknown as TournamentPhasesRepository,
      new TournamentPhaseMapper(),
    );
  });

  describe('create', () => {
    const dto = {
      phases: [
        { name: ' Grupos ', type: PhaseType.Groups, order: 1 },
        { name: 'Final', type: PhaseType.Final, order: 2 },
      ],
    };

    it('registers several phases for an existing tournament in one transaction', async () => {
      unitOfWork.findTournamentForUpdate.mockResolvedValue({ id: 4 });
      unitOfWork.findTakenOrders.mockResolvedValue([]);
      unitOfWork.insertMany.mockImplementation(async (phases: TournamentPhase[]) => phases.map(
        (item, index) => Object.assign(item, { id: index + 1 }),
      ));

      const result = await service.create(4, dto);

      expect(result).toEqual([
        { id: 1, tournamentId: 4, name: 'Grupos', type: 'groups', order: 1 },
        { id: 2, tournamentId: 4, name: 'Final', type: 'final', order: 2 },
      ]);
      expect(unitOfWork.findTakenOrders).toHaveBeenCalledWith(4, [1, 2]);
    });

    it('rejects an unknown tournament', async () => {
      unitOfWork.findTournamentForUpdate.mockResolvedValue(null);
      await expect(service.create(4, dto)).rejects.toBeInstanceOf(TournamentPhaseTournamentNotFoundError);
      expect(unitOfWork.insertMany).not.toHaveBeenCalled();
    });

    it('rejects an order already used in the tournament', async () => {
      unitOfWork.findTournamentForUpdate.mockResolvedValue({ id: 4 });
      unitOfWork.findTakenOrders.mockResolvedValue([2]);
      await expect(service.create(4, dto)).rejects.toBeInstanceOf(TournamentPhaseOrderTakenError);
      expect(unitOfWork.insertMany).not.toHaveBeenCalled();
    });

    it('rejects repeated orders inside the same request before touching the database', async () => {
      await expect(service.create(4, {
        phases: [
          { name: 'A', type: PhaseType.Groups, order: 1 },
          { name: 'B', type: PhaseType.Final, order: 1 },
        ],
      })).rejects.toBeInstanceOf(TournamentPhaseInputInvalidError);
      expect(repository.transaction).not.toHaveBeenCalled();
    });

    it('rejects invalid tournament identifiers', async () => {
      await expect(service.create(0, dto)).rejects.toBeInstanceOf(TournamentPhaseInputInvalidError);
    });
  });

  describe('queries', () => {
    it('lists the phases of an existing tournament in their order', async () => {
      repository.findTournament.mockResolvedValue({ id: 4 });
      repository.findByTournament.mockResolvedValue([phase(1, 1), phase(2, 2, PhaseType.Final)]);
      await expect(service.findByTournament(4)).resolves.toHaveLength(2);
    });

    it('rejects phases of an unknown tournament', async () => {
      repository.findTournament.mockResolvedValue(null);
      await expect(service.findByTournament(4)).rejects.toBeInstanceOf(TournamentPhaseTournamentNotFoundError);
    });

    it('finds one phase or reports it as missing', async () => {
      repository.findById.mockResolvedValueOnce(phase(3, 1)).mockResolvedValueOnce(null);
      await expect(service.findOne(3)).resolves.toMatchObject({ id: 3, order: 1 });
      await expect(service.findOne(9)).rejects.toBeInstanceOf(TournamentPhaseNotFoundError);
    });
  });

  describe('update', () => {
    beforeEach(() => {
      repository.findById.mockResolvedValue(phase(3, 1));
      unitOfWork.findTournamentForUpdate.mockResolvedValue({ id: 4 });
      unitOfWork.findPhaseForUpdate.mockResolvedValue(phase(3, 1));
      unitOfWork.countGroups.mockResolvedValue(0);
      unitOfWork.countMatches.mockResolvedValue(0);
      unitOfWork.save.mockImplementation(async (item: TournamentPhase) => item);
    });

    it('updates name, type and order, never the tournament', async () => {
      unitOfWork.findTakenOrders.mockResolvedValue([]);
      const result = await service.update(3, { name: ' Semifinal ', type: PhaseType.Knockout, order: 5 });
      expect(result).toEqual({ id: 3, tournamentId: 4, name: 'Semifinal', type: 'knockout', order: 5 });
      expect(unitOfWork.findTakenOrders).toHaveBeenCalledWith(4, [5], 3);
    });

    it('does not check the order when it is unchanged', async () => {
      await service.update(3, { name: 'Nuevo nombre', order: 1 });
      expect(unitOfWork.findTakenOrders).not.toHaveBeenCalled();
    });

    it('rejects an order used by another phase', async () => {
      unitOfWork.findTakenOrders.mockResolvedValue([5]);
      await expect(service.update(3, { order: 5 })).rejects.toBeInstanceOf(TournamentPhaseOrderTakenError);
      expect(unitOfWork.save).not.toHaveBeenCalled();
    });

    it('prevents changing phase type after groups or matches exist', async () => {
      unitOfWork.countGroups.mockResolvedValue(1);
      await expect(service.update(3, { type: PhaseType.Knockout }))
        .rejects.toBeInstanceOf(TournamentPhaseTypeLockedError);
      unitOfWork.countGroups.mockResolvedValue(0);
      unitOfWork.countMatches.mockResolvedValue(1);
      await expect(service.update(3, { type: PhaseType.Knockout }))
        .rejects.toBeInstanceOf(TournamentPhaseTypeLockedError);
      expect(unitOfWork.save).not.toHaveBeenCalled();
    });

    it('prevents changing a final phase type through the generic phase route', async () => {
      unitOfWork.findPhaseForUpdate.mockResolvedValue(phase(3, 1, PhaseType.Final));
      await expect(service.update(3, { type: PhaseType.Groups }))
        .rejects.toBeInstanceOf(TournamentPhaseFinalTypeLockedError);
      expect(unitOfWork.save).not.toHaveBeenCalled();
      expect(unitOfWork.countGroups).not.toHaveBeenCalled();
      expect(unitOfWork.countMatches).not.toHaveBeenCalled();
    });

    it('prevents reordering a phase after matches exist', async () => {
      unitOfWork.countMatches.mockResolvedValue(1);
      await expect(service.update(3, { order: 2 })).rejects.toBeInstanceOf(TournamentPhaseOrderLockedError);
      expect(unitOfWork.findTakenOrders).not.toHaveBeenCalled();
      expect(unitOfWork.save).not.toHaveBeenCalled();
    });

    it('reports a missing phase', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.update(3, {})).rejects.toBeInstanceOf(TournamentPhaseNotFoundError);
    });
  });

  describe('remove', () => {
    it('deletes only the phase and keeps the tournament', async () => {
      repository.findById.mockResolvedValue(phase(3, 1));
      repository.remove.mockResolvedValue(true);
      await expect(service.remove(3)).resolves.toEqual({
        message: 'Fase #3 eliminada correctamente; el torneo se conservo',
      });
    });

    it('reports a missing phase, including one deleted concurrently', async () => {
      repository.findById.mockResolvedValueOnce(null).mockResolvedValueOnce(phase(3, 1));
      repository.remove.mockResolvedValue(false);
      await expect(service.remove(3)).rejects.toBeInstanceOf(TournamentPhaseNotFoundError);
      await expect(service.remove(3)).rejects.toBeInstanceOf(TournamentPhaseNotFoundError);
    });

    it('propagates the conflict when the phase has groups', async () => {
      repository.findById.mockResolvedValue(phase(3, 1));
      repository.remove.mockRejectedValue(new TournamentPhaseHasDependenciesError(3));
      await expect(service.remove(3)).rejects.toBeInstanceOf(TournamentPhaseHasDependenciesError);
    });
  });
});
