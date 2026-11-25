import { GroupTeam } from './entities/group-team.entity';
import {
  GroupTeamDuplicateError,
  GroupTeamGroupNotFoundError,
  GroupTeamInputInvalidError,
  GroupTeamNotFoundError,
  GroupTeamPhaseTypeError,
  GroupTeamTeamInactiveError,
  GroupTeamTeamInPhaseError,
  GroupTeamTeamNotFoundError,
  GroupTeamTeamNotRegisteredError,
} from './group-team.errors';
import { GroupTeamsService } from './group-teams.service';
import { GroupTeamMapper } from './mappers/group-team.mapper';
import { GroupTeamsRepository } from './repositories/group-teams.repository';
import { PhaseType } from '../tournament-phases/dto/phase-type';

const assignment = (teamId: number, groupId = 2): GroupTeam => Object.assign(new GroupTeam(), {
  id: teamId + 100,
  groupId,
  phaseId: 6,
  teamId,
  group: { id: groupId, name: 'Grupo A' },
  phase: { id: 6, tournamentId: 4 },
  team: { id: teamId, name: `Equipo ${teamId}`, active: true },
});

describe('GroupTeamsService', () => {
  const unitOfWork = {
    findGroupForShare: jest.fn(),
    findPhase: jest.fn(),
    findTeamsForShare: jest.fn(),
    findRegisteredTeamIds: jest.fn(),
    findPhaseAssignmentsForUpdate: jest.fn(),
    insertMany: jest.fn(),
    findAssignmentForUpdate: jest.fn(),
    deleteAssignment: jest.fn(),
  };
  const repository = { transaction: jest.fn(), findGroup: jest.fn(), findByGroup: jest.fn() };
  let service: GroupTeamsService;

  beforeEach(() => {
    jest.resetAllMocks();
    repository.transaction.mockImplementation(
      (work: (tx: typeof unitOfWork) => Promise<unknown>) => work(unitOfWork),
    );
    service = new GroupTeamsService(repository as unknown as GroupTeamsRepository, new GroupTeamMapper());
  });

  describe('assign', () => {
    beforeEach(() => {
      unitOfWork.findGroupForShare.mockResolvedValue({ id: 2, phaseId: 6 });
      unitOfWork.findPhase.mockResolvedValue({ id: 6, tournamentId: 4, type: PhaseType.Groups });
      unitOfWork.findTeamsForShare.mockResolvedValue([
        { id: 10, active: true }, { id: 11, active: true },
      ]);
      unitOfWork.findRegisteredTeamIds.mockResolvedValue([10, 11]);
      unitOfWork.findPhaseAssignmentsForUpdate.mockResolvedValue([]);
      unitOfWork.insertMany.mockResolvedValue([assignment(10), assignment(11)]);
    });

    it('assigns several teams to a group using the phase of that group', async () => {
      const result = await service.assign(2, { teamIds: [10, 11] });
      expect(result.map(item => item.teamId)).toEqual([10, 11]);
      expect(result[0]).toMatchObject({ groupId: 2, groupName: 'Grupo A', phaseId: 6, tournamentId: 4 });
      expect(unitOfWork.insertMany).toHaveBeenCalledWith(2, 6, [10, 11]);
    });

    it('rejects an unknown group, unknown team and teams not registered in the tournament', async () => {
      unitOfWork.findGroupForShare.mockResolvedValueOnce(null);
      await expect(service.assign(2, { teamIds: [10] })).rejects.toBeInstanceOf(GroupTeamGroupNotFoundError);
      unitOfWork.findTeamsForShare.mockResolvedValueOnce([{ id: 10 }]);
      await expect(service.assign(2, { teamIds: [10, 11] })).rejects.toBeInstanceOf(GroupTeamTeamNotFoundError);
      unitOfWork.findRegisteredTeamIds.mockResolvedValueOnce([10]);
      await expect(service.assign(2, { teamIds: [10, 11] }))
        .rejects.toBeInstanceOf(GroupTeamTeamNotRegisteredError);
      expect(unitOfWork.insertMany).not.toHaveBeenCalled();
    });

    it('rejects assignment to a non-group phase or an inactive team', async () => {
      unitOfWork.findPhase.mockResolvedValue({ id: 6, tournamentId: 4, type: PhaseType.League });
      await expect(service.assign(2, { teamIds: [10] })).rejects.toBeInstanceOf(GroupTeamPhaseTypeError);
      unitOfWork.findPhase.mockResolvedValue({ id: 6, tournamentId: 4, type: PhaseType.Groups });
      unitOfWork.findTeamsForShare.mockResolvedValueOnce([{ id: 10, active: false }]);
      await expect(service.assign(2, { teamIds: [10] })).rejects.toBeInstanceOf(GroupTeamTeamInactiveError);
      expect(unitOfWork.insertMany).not.toHaveBeenCalled();
    });

    it('does not register the same team twice in the same group', async () => {
      unitOfWork.findPhaseAssignmentsForUpdate.mockResolvedValue([assignment(10, 2)]);
      await expect(service.assign(2, { teamIds: [10, 11] })).rejects.toBeInstanceOf(GroupTeamDuplicateError);
      expect(unitOfWork.insertMany).not.toHaveBeenCalled();
    });

    it('does not keep a team in two different groups of the same phase', async () => {
      unitOfWork.findPhaseAssignmentsForUpdate.mockResolvedValue([assignment(11, 3)]);
      const attempt = service.assign(2, { teamIds: [10, 11] });
      await expect(attempt).rejects.toBeInstanceOf(GroupTeamTeamInPhaseError);
      await expect(attempt).rejects.toThrow('El equipo 11 ya esta asignado al grupo 3 de la misma fase');
      expect(unitOfWork.insertMany).not.toHaveBeenCalled();
    });

    it('rejects invalid input before opening a transaction', async () => {
      await expect(service.assign(0, { teamIds: [10] })).rejects.toBeInstanceOf(GroupTeamInputInvalidError);
      await expect(service.assign(2, { teamIds: [] })).rejects.toBeInstanceOf(GroupTeamInputInvalidError);
      await expect(service.assign(2, { teamIds: [10, 10] })).rejects.toBeInstanceOf(GroupTeamInputInvalidError);
      expect(repository.transaction).not.toHaveBeenCalled();
    });
  });

  describe('findByGroup', () => {
    it('lists the teams of a group', async () => {
      repository.findGroup.mockResolvedValue({ id: 2 });
      repository.findByGroup.mockResolvedValue([assignment(10)]);
      await expect(service.findByGroup(2)).resolves.toHaveLength(1);
    });

    it('rejects an unknown group', async () => {
      repository.findGroup.mockResolvedValue(null);
      await expect(service.findByGroup(2)).rejects.toBeInstanceOf(GroupTeamGroupNotFoundError);
    });
  });

  describe('remove', () => {
    it('removes the assignment only, never the team nor the group', async () => {
      unitOfWork.findGroupForShare.mockResolvedValue({ id: 2 });
      unitOfWork.findAssignmentForUpdate.mockResolvedValue(assignment(10));
      unitOfWork.deleteAssignment.mockResolvedValue(true);
      await expect(service.remove(2, 10)).resolves.toEqual({
        message: 'Equipo retirado del grupo correctamente; el equipo y el grupo se conservaron',
      });
      expect(unitOfWork.deleteAssignment).toHaveBeenCalledWith(110);
    });

    it('reports a missing group or a team that is not assigned', async () => {
      unitOfWork.findGroupForShare.mockResolvedValueOnce(null);
      await expect(service.remove(2, 10)).rejects.toBeInstanceOf(GroupTeamGroupNotFoundError);
      unitOfWork.findGroupForShare.mockResolvedValue({ id: 2 });
      unitOfWork.findAssignmentForUpdate.mockResolvedValue(null);
      await expect(service.remove(2, 10)).rejects.toBeInstanceOf(GroupTeamNotFoundError);
    });
  });
});
