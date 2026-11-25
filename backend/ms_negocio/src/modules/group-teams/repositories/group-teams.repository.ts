import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, QueryFailedError } from 'typeorm';
import { CompetitionGroup } from '../../competition-groups/entities/competition-group.entity';
import { Team } from '../../teams/entities/team.entity';
import { TournamentPhase } from '../../tournament-phases/entities/tournament-phase.entity';
import { TournamentRegistration } from '../../tournament-registrations/entities/tournament-registration.entity';
import { GroupTeam } from '../entities/group-team.entity';
import {
  GroupTeamDuplicateError,
  GroupTeamReferenceConflictError,
  GroupTeamTeamInPhaseError,
} from '../group-team.errors';

const RELATIONS = { group: true, phase: true, team: true } as const;

export class GroupTeamsUnitOfWork {
  constructor(private readonly manager: EntityManager) {}

  // Bloqueo compartido: impide eliminar el grupo mientras se asignan equipos.
  findGroupForShare(id: number): Promise<CompetitionGroup | null> {
    return this.manager.getRepository(CompetitionGroup).findOne({
      where: { id },
      lock: { mode: 'pessimistic_read' },
    });
  }

  findPhase(id: number): Promise<TournamentPhase | null> {
    return this.manager.getRepository(TournamentPhase).findOneBy({ id });
  }

  findTeamsForShare(ids: number[]): Promise<Team[]> {
    return this.manager.getRepository(Team).createQueryBuilder('team')
      .where('team.id IN (:...ids)', { ids })
      .orderBy('team.id', 'ASC')
      .setLock('pessimistic_read')
      .getMany();
  }

  async findRegisteredTeamIds(tournamentId: number, teamIds: number[]): Promise<number[]> {
    const registrations = await this.manager.getRepository(TournamentRegistration).find({
      select: { teamId: true },
      where: { tournamentId, teamId: In(teamIds) },
    });
    return registrations.map(registration => registration.teamId);
  }

  // Lectura bloqueante actual de las asignaciones de la fase para esos equipos.
  async findPhaseAssignmentsForUpdate(phaseId: number, teamIds: number[]): Promise<GroupTeam[]> {
    return this.manager.getRepository(GroupTeam).createQueryBuilder('groupTeam')
      .where('groupTeam.phaseId = :phaseId', { phaseId })
      .andWhere('groupTeam.teamId IN (:...teamIds)', { teamIds })
      .orderBy('groupTeam.teamId', 'ASC')
      .setLock('pessimistic_write')
      .getMany();
  }

  async insertMany(groupId: number, phaseId: number, teamIds: number[]): Promise<GroupTeam[]> {
    const repository = this.manager.getRepository(GroupTeam);
    await repository.save(teamIds.map(teamId => repository.create({ groupId, phaseId, teamId })));
    return repository.find({
      where: { groupId, teamId: In(teamIds) },
      relations: RELATIONS,
      order: { teamId: 'ASC' },
    });
  }

  findAssignmentForUpdate(groupId: number, teamId: number): Promise<GroupTeam | null> {
    return this.manager.getRepository(GroupTeam).findOne({
      where: { groupId, teamId },
      lock: { mode: 'pessimistic_write' },
    });
  }

  async deleteAssignment(id: number): Promise<boolean> {
    const result = await this.manager.getRepository(GroupTeam).delete(id);
    return (result.affected ?? 0) > 0;
  }
}

@Injectable()
export class GroupTeamsRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async transaction<T>(work: (unitOfWork: GroupTeamsUnitOfWork) => Promise<T>): Promise<T> {
    try {
      return await this.dataSource.transaction(manager => work(new GroupTeamsUnitOfWork(manager)));
    } catch (error: unknown) {
      if (this.hasDatabaseCode(error, 'ER_DUP_ENTRY')) {
        // El indice unico violado se identifica por su nombre en el mensaje de MySQL.
        const message = error instanceof QueryFailedError
          ? String((error.driverError as { sqlMessage?: unknown } | undefined)?.sqlMessage ?? '')
          : '';
        if (message.includes('UQ_group_teams_phase_team')) throw new GroupTeamTeamInPhaseError();
        throw new GroupTeamDuplicateError();
      }
      if (this.hasDatabaseCode(error, 'ER_NO_REFERENCED_ROW_2', 'ER_NO_REFERENCED_ROW')) {
        throw new GroupTeamReferenceConflictError();
      }
      throw error;
    }
  }

  findGroup(id: number): Promise<CompetitionGroup | null> {
    return this.dataSource.getRepository(CompetitionGroup).findOneBy({ id });
  }

  findByGroup(groupId: number): Promise<GroupTeam[]> {
    return this.dataSource.getRepository(GroupTeam).find({
      where: { groupId },
      relations: RELATIONS,
      order: { teamId: 'ASC' },
    });
  }

  private hasDatabaseCode(error: unknown, ...codes: string[]): boolean {
    if (!(error instanceof QueryFailedError)) return false;
    const driverError: unknown = error.driverError;
    return typeof driverError === 'object' && driverError !== null
      && 'code' in driverError && typeof driverError.code === 'string'
      && codes.includes(driverError.code);
  }
}
