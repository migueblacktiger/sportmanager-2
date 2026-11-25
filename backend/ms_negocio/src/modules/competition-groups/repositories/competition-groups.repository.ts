import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, QueryFailedError } from 'typeorm';
import { TournamentPhase } from '../../tournament-phases/entities/tournament-phase.entity';
import { Tournament } from '../../tournaments/entities/tournament.entity';
import {
  CompetitionGroupHasTeamsError,
  CompetitionGroupNameTakenError,
  CompetitionGroupReferenceConflictError,
} from '../competition-group.errors';
import { CompetitionGroup } from '../entities/competition-group.entity';

export class CompetitionGroupsUnitOfWork {
  constructor(private readonly manager: EntityManager) {}

  findPhaseForUpdate(id: number): Promise<TournamentPhase | null> {
    return this.manager.getRepository(TournamentPhase).findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
  }

  findGroupForUpdate(id: number): Promise<CompetitionGroup | null> {
    return this.manager.getRepository(CompetitionGroup).findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
  }

  findByPhase(phaseId: number): Promise<CompetitionGroup[]> {
    return this.manager.getRepository(CompetitionGroup).find({
      where: { phaseId },
      order: { name: 'ASC', id: 'ASC' },
    });
  }

  async insertMany(groups: CompetitionGroup[]): Promise<CompetitionGroup[]> {
    const repository = this.manager.getRepository(CompetitionGroup);
    const saved = await repository.save(groups);
    return repository.find({
      where: { id: In(saved.map(group => group.id)) },
      relations: { phase: true },
      order: { name: 'ASC', id: 'ASC' },
    });
  }

  async save(group: CompetitionGroup): Promise<CompetitionGroup> {
    const repository = this.manager.getRepository(CompetitionGroup);
    await repository.save(group);
    return repository.findOneOrFail({ where: { id: group.id }, relations: { phase: true } });
  }
}

@Injectable()
export class CompetitionGroupsRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async transaction<T>(work: (unitOfWork: CompetitionGroupsUnitOfWork) => Promise<T>): Promise<T> {
    try {
      return await this.dataSource.transaction(manager => work(new CompetitionGroupsUnitOfWork(manager)));
    } catch (error: unknown) {
      if (this.hasDatabaseCode(error, 'ER_DUP_ENTRY')) throw new CompetitionGroupNameTakenError();
      if (this.hasDatabaseCode(error, 'ER_NO_REFERENCED_ROW_2', 'ER_NO_REFERENCED_ROW')) {
        throw new CompetitionGroupReferenceConflictError();
      }
      throw error;
    }
  }

  findTournament(id: number): Promise<Tournament | null> {
    return this.dataSource.getRepository(Tournament).findOneBy({ id });
  }

  findPhase(id: number): Promise<TournamentPhase | null> {
    return this.dataSource.getRepository(TournamentPhase).findOneBy({ id });
  }

  findById(id: number): Promise<CompetitionGroup | null> {
    return this.dataSource.getRepository(CompetitionGroup).findOne({
      where: { id },
      relations: { phase: true },
    });
  }

  findByPhase(phaseId: number): Promise<CompetitionGroup[]> {
    return this.dataSource.getRepository(CompetitionGroup).find({
      where: { phaseId },
      relations: { phase: true },
      order: { name: 'ASC', id: 'ASC' },
    });
  }

  async remove(id: number): Promise<boolean> {
    try {
      const result = await this.dataSource.getRepository(CompetitionGroup).delete(id);
      return (result.affected ?? 0) > 0;
    } catch (error: unknown) {
      if (this.hasDatabaseCode(error, 'ER_ROW_IS_REFERENCED_2', 'ER_ROW_IS_REFERENCED')) {
        throw new CompetitionGroupHasTeamsError(id);
      }
      throw error;
    }
  }

  private hasDatabaseCode(error: unknown, ...codes: string[]): boolean {
    if (!(error instanceof QueryFailedError)) return false;
    const driverError: unknown = error.driverError;
    return typeof driverError === 'object' && driverError !== null
      && 'code' in driverError && typeof driverError.code === 'string'
      && codes.includes(driverError.code);
  }
}
