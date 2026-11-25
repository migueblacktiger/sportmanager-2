import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Not, QueryFailedError } from 'typeorm';
import { CompetitionGroup } from '../../competition-groups/entities/competition-group.entity';
import { Match } from '../../matches/entities/match.entity';
import { Tournament } from '../../tournaments/entities/tournament.entity';
import { TournamentPhase } from '../entities/tournament-phase.entity';
import {
  TournamentPhaseHasDependenciesError,
  TournamentPhaseOrderTakenError,
  TournamentPhaseReferenceConflictError,
} from '../tournament-phase.errors';

export class TournamentPhasesUnitOfWork {
  constructor(private readonly manager: EntityManager) {}

  findTournamentForUpdate(id: number): Promise<Tournament | null> {
    return this.manager.getRepository(Tournament).findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
  }

  findPhaseForUpdate(id: number): Promise<TournamentPhase | null> {
    return this.manager.getRepository(TournamentPhase).findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
  }

  countGroups(phaseId: number): Promise<number> {
    return this.manager.getRepository(CompetitionGroup).count({ where: { phaseId } });
  }

  countMatches(phaseId: number): Promise<number> {
    return this.manager.getRepository(Match).count({ where: { phaseId } });
  }

  async findTakenOrders(tournamentId: number, orders: number[], excludeId?: number): Promise<number[]> {
    const phases = await this.manager.getRepository(TournamentPhase).find({
      select: { phaseOrder: true },
      where: {
        tournamentId,
        phaseOrder: In(orders),
        ...(excludeId === undefined ? {} : { id: Not(excludeId) }),
      },
      order: { phaseOrder: 'ASC' },
    });
    return phases.map(phase => phase.phaseOrder);
  }

  async insertMany(phases: TournamentPhase[]): Promise<TournamentPhase[]> {
    const saved = await this.manager.getRepository(TournamentPhase).save(phases);
    return saved.sort((a, b) => a.phaseOrder - b.phaseOrder);
  }

  save(phase: TournamentPhase): Promise<TournamentPhase> {
    return this.manager.getRepository(TournamentPhase).save(phase);
  }
}

@Injectable()
export class TournamentPhasesRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async transaction<T>(work: (unitOfWork: TournamentPhasesUnitOfWork) => Promise<T>): Promise<T> {
    try {
      return await this.dataSource.transaction(manager => work(new TournamentPhasesUnitOfWork(manager)));
    } catch (error: unknown) {
      if (this.hasDatabaseCode(error, 'ER_DUP_ENTRY')) throw new TournamentPhaseOrderTakenError();
      if (this.hasDatabaseCode(error, 'ER_NO_REFERENCED_ROW_2', 'ER_NO_REFERENCED_ROW')) {
        throw new TournamentPhaseReferenceConflictError();
      }
      throw error;
    }
  }

  findTournament(id: number): Promise<Tournament | null> {
    return this.dataSource.getRepository(Tournament).findOneBy({ id });
  }

  findById(id: number): Promise<TournamentPhase | null> {
    return this.dataSource.getRepository(TournamentPhase).findOneBy({ id });
  }

  findByTournament(tournamentId: number): Promise<TournamentPhase[]> {
    return this.dataSource.getRepository(TournamentPhase).find({
      where: { tournamentId },
      order: { phaseOrder: 'ASC', id: 'ASC' },
    });
  }

  async remove(id: number): Promise<boolean> {
    try {
      const result = await this.dataSource.getRepository(TournamentPhase).delete(id);
      return (result.affected ?? 0) > 0;
    } catch (error: unknown) {
      if (this.hasDatabaseCode(error, 'ER_ROW_IS_REFERENCED_2', 'ER_ROW_IS_REFERENCED')) {
        throw new TournamentPhaseHasDependenciesError(id);
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
