import {
  CompetitionGroupHasTeamsError,
  CompetitionGroupInputInvalidError,
  CompetitionGroupNameTakenError,
  CompetitionGroupNotFoundError,
  CompetitionGroupPhaseNotFoundError,
  CompetitionGroupPhaseTypeError,
  CompetitionGroupTournamentNotFoundError,
} from './competition-group.errors';
import { CompetitionGroupsService } from './competition-groups.service';
import { CompetitionGroup } from './entities/competition-group.entity';
import { CompetitionGroupMapper } from './mappers/competition-group.mapper';
import { CompetitionGroupsRepository } from './repositories/competition-groups.repository';
import { PhaseType } from '../tournament-phases/dto/phase-type';

const group = (id: number, name: string, phaseId = 6): CompetitionGroup => Object.assign(new CompetitionGroup(), {
  id, name, phaseId, phase: { id: phaseId, tournamentId: 4 },
});

describe('CompetitionGroupsService', () => {
  const unitOfWork = {
    findPhaseForUpdate: jest.fn(),
    findGroupForUpdate: jest.fn(),
    findByPhase: jest.fn(),
    insertMany: jest.fn(),
    save: jest.fn(),
  };
  const repository = {
    transaction: jest.fn(),
    findTournament: jest.fn(),
    findPhase: jest.fn(),
    findById: jest.fn(),
    findByPhase: jest.fn(),
    remove: jest.fn(),
  };
  let service: CompetitionGroupsService;

  beforeEach(() => {
    jest.resetAllMocks();
    repository.transaction.mockImplementation(
      (work: (tx: typeof unitOfWork) => Promise<unknown>) => work(unitOfWork),
    );
    service = new CompetitionGroupsService(
      repository as unknown as CompetitionGroupsRepository,
      new CompetitionGroupMapper(),
    );
  });

  describe('create', () => {
    const dto = { groups: [{ name: ' Grupo A ' }, { name: 'Grupo B' }] };

    beforeEach(() => {
      repository.findTournament.mockResolvedValue({ id: 4 });
      unitOfWork.findPhaseForUpdate.mockResolvedValue({ id: 6, tournamentId: 4, type: PhaseType.Groups });
      unitOfWork.findByPhase.mockResolvedValue([]);
      unitOfWork.insertMany.mockImplementation(async (groups: CompetitionGroup[]) => groups.map(
        (item, index) => Object.assign(item, { id: index + 1, phase: { id: 6, tournamentId: 4 } }),
      ));
    });

    it('registers the groups of an existing phase of an existing tournament', async () => {
      await expect(service.create(4, 6, dto)).resolves.toEqual([
        { id: 1, phaseId: 6, tournamentId: 4, name: 'Grupo A' },
        { id: 2, phaseId: 6, tournamentId: 4, name: 'Grupo B' },
      ]);
    });

    it('requires the tournament to exist', async () => {
      repository.findTournament.mockResolvedValue(null);
      await expect(service.create(4, 6, dto)).rejects.toBeInstanceOf(CompetitionGroupTournamentNotFoundError);
    });

    it('requires the phase to exist and to belong to that tournament', async () => {
      unitOfWork.findPhaseForUpdate.mockResolvedValueOnce(null);
      await expect(service.create(4, 6, dto)).rejects.toBeInstanceOf(CompetitionGroupPhaseNotFoundError);
      unitOfWork.findPhaseForUpdate.mockResolvedValueOnce({ id: 6, tournamentId: 99 });
      await expect(service.create(4, 6, dto)).rejects.toBeInstanceOf(CompetitionGroupPhaseNotFoundError);
      expect(unitOfWork.insertMany).not.toHaveBeenCalled();
    });

    it('rejects creating groups in a phase of another type', async () => {
      unitOfWork.findPhaseForUpdate.mockResolvedValue({ id: 6, tournamentId: 4, type: PhaseType.League });
      await expect(service.create(4, 6, dto)).rejects.toBeInstanceOf(CompetitionGroupPhaseTypeError);
      expect(unitOfWork.insertMany).not.toHaveBeenCalled();
    });

    it('rejects a name already used in the phase, ignoring case and outer spaces', async () => {
      unitOfWork.findByPhase.mockResolvedValue([group(9, 'grupo a')]);
      await expect(service.create(4, 6, dto)).rejects.toBeInstanceOf(CompetitionGroupNameTakenError);
      expect(unitOfWork.insertMany).not.toHaveBeenCalled();
    });

    it('rejects repeated names inside the same request', async () => {
      await expect(service.create(4, 6, { groups: [{ name: 'A' }, { name: ' a ' }] }))
        .rejects.toBeInstanceOf(CompetitionGroupInputInvalidError);
      expect(repository.transaction).not.toHaveBeenCalled();
    });
  });

  describe('queries', () => {
    it('lists the groups of a phase that belongs to the tournament', async () => {
      repository.findTournament.mockResolvedValue({ id: 4 });
      repository.findPhase.mockResolvedValue({ id: 6, tournamentId: 4 });
      repository.findByPhase.mockResolvedValue([group(1, 'A')]);
      await expect(service.findByPhase(4, 6)).resolves.toEqual([
        { id: 1, phaseId: 6, tournamentId: 4, name: 'A' },
      ]);
    });

    it('rejects listing groups of a phase from another tournament', async () => {
      repository.findTournament.mockResolvedValue({ id: 4 });
      repository.findPhase.mockResolvedValue({ id: 6, tournamentId: 5 });
      await expect(service.findByPhase(4, 6)).rejects.toBeInstanceOf(CompetitionGroupPhaseNotFoundError);
    });

    it('finds one group or reports it as missing', async () => {
      repository.findById.mockResolvedValueOnce(group(2, 'B')).mockResolvedValueOnce(null);
      await expect(service.findOne(2)).resolves.toMatchObject({ id: 2, name: 'B' });
      await expect(service.findOne(8)).rejects.toBeInstanceOf(CompetitionGroupNotFoundError);
    });
  });

  describe('update', () => {
    beforeEach(() => {
      repository.findById.mockResolvedValue(group(2, 'B'));
      unitOfWork.findPhaseForUpdate.mockResolvedValue({ id: 6, tournamentId: 4 });
      unitOfWork.findGroupForUpdate.mockResolvedValue(group(2, 'B'));
      unitOfWork.findByPhase.mockResolvedValue([group(1, 'A'), group(2, 'B')]);
      unitOfWork.save.mockImplementation(async (item: CompetitionGroup) => item);
    });

    it('renames a group', async () => {
      await expect(service.update(2, { name: ' Grupo Z ' })).resolves.toMatchObject({ id: 2, name: 'Grupo Z' });
    });

    it('allows keeping the same name with different case', async () => {
      await expect(service.update(2, { name: 'b' })).resolves.toMatchObject({ name: 'b' });
    });

    it('rejects the name of another group of the phase', async () => {
      await expect(service.update(2, { name: ' A ' })).rejects.toBeInstanceOf(CompetitionGroupNameTakenError);
      expect(unitOfWork.save).not.toHaveBeenCalled();
    });

    it('reports a missing group', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.update(2, {})).rejects.toBeInstanceOf(CompetitionGroupNotFoundError);
    });
  });

  describe('remove', () => {
    it('deletes only the group and keeps its teams registered', async () => {
      repository.findById.mockResolvedValue(group(2, 'B'));
      repository.remove.mockResolvedValue(true);
      await expect(service.remove(2)).resolves.toEqual({
        message: 'Grupo #2 eliminado correctamente; los equipos se conservaron',
      });
    });

    it('does not delete a group that still has teams assigned', async () => {
      repository.findById.mockResolvedValue(group(2, 'B'));
      repository.remove.mockRejectedValue(new CompetitionGroupHasTeamsError(2));
      await expect(service.remove(2)).rejects.toBeInstanceOf(CompetitionGroupHasTeamsError);
    });

    it('reports a missing group', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.remove(2)).rejects.toBeInstanceOf(CompetitionGroupNotFoundError);
    });
  });
});
