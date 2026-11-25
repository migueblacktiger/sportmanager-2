import { Injectable } from '@nestjs/common';
import { PhaseType } from '../tournament-phases/dto/phase-type';
import { CreateGroupTeamsDto } from './dto/create-group-teams.dto';
import { GroupTeamResponseDto } from './dto/group-team-response.dto';
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
import { GroupTeamMapper } from './mappers/group-team.mapper';
import { GroupTeamsRepository } from './repositories/group-teams.repository';

const MAX_DATABASE_ID = 2147483647;

@Injectable()
export class GroupTeamsService {
  constructor(
    private readonly repository: GroupTeamsRepository,
    private readonly mapper: GroupTeamMapper,
  ) {}

  async assign(groupId: number, dto: CreateGroupTeamsDto): Promise<GroupTeamResponseDto[]> {
    this.validateId(groupId);
    this.validateTeamIds(dto.teamIds);
    return this.repository.transaction(async unitOfWork => {
      const group = await unitOfWork.findGroupForShare(groupId);
      if (!group) throw new GroupTeamGroupNotFoundError(groupId);
      const phase = await unitOfWork.findPhase(group.phaseId);
      if (!phase) throw new GroupTeamGroupNotFoundError(groupId);
      if (phase.type !== PhaseType.Groups) throw new GroupTeamPhaseTypeError(phase.id);

      const teams = await unitOfWork.findTeamsForShare(dto.teamIds);
      const existingTeamIds = new Set(teams.map(team => team.id));
      const missingTeamId = dto.teamIds.find(id => !existingTeamIds.has(id));
      if (missingTeamId !== undefined) throw new GroupTeamTeamNotFoundError(missingTeamId);
      const inactiveTeam = teams.find(team => !team.active);
      if (inactiveTeam) throw new GroupTeamTeamInactiveError(inactiveTeam.id);

      // Solo compiten en la fase los equipos inscritos en el torneo de esa fase.
      const registered = new Set(await unitOfWork.findRegisteredTeamIds(phase.tournamentId, dto.teamIds));
      const notRegisteredId = dto.teamIds.find(id => !registered.has(id));
      if (notRegisteredId !== undefined) {
        throw new GroupTeamTeamNotRegisteredError(notRegisteredId, phase.tournamentId);
      }

      const assignments = await unitOfWork.findPhaseAssignmentsForUpdate(phase.id, dto.teamIds);
      for (const assignment of assignments) {
        if (assignment.groupId === groupId) {
          throw new GroupTeamDuplicateError(assignment.teamId, groupId);
        }
      }
      if (assignments.length > 0) {
        throw new GroupTeamTeamInPhaseError(assignments[0].teamId, assignments[0].groupId);
      }

      return this.mapper.toResponseDtoList(await unitOfWork.insertMany(groupId, phase.id, dto.teamIds));
    });
  }

  async findByGroup(groupId: number): Promise<GroupTeamResponseDto[]> {
    this.validateId(groupId);
    if (!await this.repository.findGroup(groupId)) throw new GroupTeamGroupNotFoundError(groupId);
    return this.mapper.toResponseDtoList(await this.repository.findByGroup(groupId));
  }

  async remove(groupId: number, teamId: number): Promise<{ message: string }> {
    this.validateId(groupId);
    this.validateId(teamId);
    return this.repository.transaction(async unitOfWork => {
      if (!await unitOfWork.findGroupForShare(groupId)) throw new GroupTeamGroupNotFoundError(groupId);
      const assignment = await unitOfWork.findAssignmentForUpdate(groupId, teamId);
      if (!assignment) throw new GroupTeamNotFoundError(groupId, teamId);
      if (!await unitOfWork.deleteAssignment(assignment.id)) {
        throw new GroupTeamNotFoundError(groupId, teamId);
      }
      return { message: 'Equipo retirado del grupo correctamente; el equipo y el grupo se conservaron' };
    });
  }

  private validateTeamIds(teamIds: number[]): void {
    if (!Array.isArray(teamIds) || teamIds.length === 0) {
      throw new GroupTeamInputInvalidError('Debe seleccionar al menos un equipo');
    }
    if (teamIds.some(id => !Number.isSafeInteger(id) || id < 1 || id > MAX_DATABASE_ID)) {
      throw new GroupTeamInputInvalidError(
        'Los identificadores deben ser enteros positivos de hasta 2147483647',
      );
    }
    if (new Set(teamIds).size !== teamIds.length) {
      throw new GroupTeamInputInvalidError('La lista contiene equipos repetidos');
    }
  }

  private validateId(id: number): void {
    if (!Number.isSafeInteger(id) || id < 1 || id > MAX_DATABASE_ID) {
      throw new GroupTeamInputInvalidError(
        'El identificador debe ser un entero positivo de hasta 2147483647',
      );
    }
  }
}
