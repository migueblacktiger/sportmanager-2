import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Not, QueryFailedError } from 'typeorm';
import { Match } from '../../matches/entities/match.entity';
import { PhaseType } from '../../tournament-phases/dto/phase-type';
import { TournamentPhase } from '../../tournament-phases/entities/tournament-phase.entity';
import { Tournament } from '../../tournaments/entities/tournament.entity';
import {
  FinalPhaseHasDependenciesError,
  FinalPhaseOrderTakenError,
  FinalPhaseReferenceConflictError,
} from '../final-phase.errors';

const MATCH_RELATIONS = { phase: true, homeTeam: true, awayTeam: true } as const;

export class FinalPhasesUnitOfWork {
  constructor(private readonly manager: EntityManager) {}

  // Orden de bloqueo: torneo (padre) y despues fase, igual que tournament-phases y matches.
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

  // El orden es unico entre todas las fases del torneo, no solo entre las finales.
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

  // Se invoca con la fase bloqueada: toda creacion de partidos espera ese bloqueo.
  countMatches(phaseId: number): Promise<number> {
    return this.manager.getRepository(Match).count({ where: { phaseId } });
  }

  save(phase: TournamentPhase): Promise<TournamentPhase> {
    return this.manager.getRepository(TournamentPhase).save(phase);
  }

  async deletePhase(id: number): Promise<boolean> {
    const result = await this.manager.getRepository(TournamentPhase).delete(id);
    return (result.affected ?? 0) > 0;
  }
}

@Injectable()
export class FinalPhasesRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async transaction<T>(work: (unitOfWork: FinalPhasesUnitOfWork) => Promise<T>): Promise<T> {
    try {
      return await this.dataSource.transaction(manager => work(new FinalPhasesUnitOfWork(manager)));
    } catch (error: unknown) {
      if (this.hasDatabaseCode(error, 'ER_DUP_ENTRY')) throw new FinalPhaseOrderTakenError();
      if (this.hasDatabaseCode(error, 'ER_NO_REFERENCED_ROW_2', 'ER_NO_REFERENCED_ROW')) {
        throw new FinalPhaseReferenceConflictError();
      }
      if (this.hasDatabaseCode(error, 'ER_ROW_IS_REFERENCED_2', 'ER_ROW_IS_REFERENCED')) {
        throw new FinalPhaseHasDependenciesError();
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

  findFinalByTournament(tournamentId: number): Promise<TournamentPhase[]> {
    return this.dataSource.getRepository(TournamentPhase).find({
      where: { tournamentId, type: PhaseType.Final },
      order: { phaseOrder: 'ASC', id: 'ASC' },
    });
  }

  async countMatchesByPhase(phaseIds: number[]): Promise<Map<number, number>> {
    const counts = new Map<number, number>();
    if (phaseIds.length === 0) return counts;
    const rows = await this.dataSource.getRepository(Match).createQueryBuilder('match')
      .select('match.phaseId', 'phaseId')
      .addSelect('COUNT(*)', 'total')
      .where('match.phaseId IN (:...phaseIds)', { phaseIds })
      .groupBy('match.phaseId')
      .getRawMany<{ phaseId: number | string; total: number | string }>();
    for (const row of rows) counts.set(Number(row.phaseId), Number(row.total));
    return counts;
  }

  findMatchesByPhase(phaseId: number): Promise<Match[]> {
    return this.dataSource.getRepository(Match).find({
      where: { phaseId },
      relations: MATCH_RELATIONS,
      order: { scheduledAt: 'ASC', id: 'ASC' },
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
