import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, QueryFailedError } from 'typeorm';
import { Team } from '../../teams/entities/team.entity';
import { TournamentPhase } from '../../tournament-phases/entities/tournament-phase.entity';
import { TournamentRegistration } from '../../tournament-registrations/entities/tournament-registration.entity';
import { Tournament } from '../../tournaments/entities/tournament.entity';
import { Match } from '../entities/match.entity';
import { MatchReferenceConflictError } from '../match.errors';

const RELATIONS = { phase: true, homeTeam: true, awayTeam: true } as const;

export class MatchesUnitOfWork {
  constructor(private readonly manager: EntityManager) {}

  // Orden de bloqueo comun con fases finales: torneo, fase, equipos.
  // Bloqueo compartido: impide eliminar la fase o retirar inscripciones mientras se crea el partido.
  findTournamentForShare(id: number): Promise<Tournament | null> {
    return this.manager.getRepository(Tournament).findOne({
      where: { id },
      lock: { mode: 'pessimistic_read' },
    });
  }

  findPhaseForShare(id: number): Promise<TournamentPhase | null> {
    return this.manager.getRepository(TournamentPhase).findOne({
      where: { id },
      lock: { mode: 'pessimistic_read' },
    });
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

  async insert(match: Match): Promise<Match> {
    const repository = this.manager.getRepository(Match);
    const saved = await repository.save(match);
    return repository.findOneOrFail({ where: { id: saved.id }, relations: RELATIONS });
  }
}

@Injectable()
export class MatchesRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async transaction<T>(work: (unitOfWork: MatchesUnitOfWork) => Promise<T>): Promise<T> {
    try {
      return await this.dataSource.transaction(manager => work(new MatchesUnitOfWork(manager)));
    } catch (error: unknown) {
      if (this.hasDatabaseCode(error, 'ER_NO_REFERENCED_ROW_2', 'ER_NO_REFERENCED_ROW')) {
        throw new MatchReferenceConflictError();
      }
      throw error;
    }
  }

  findPhase(id: number): Promise<TournamentPhase | null> {
    return this.dataSource.getRepository(TournamentPhase).findOneBy({ id });
  }

  findById(id: number): Promise<Match | null> {
    return this.dataSource.getRepository(Match).findOne({ where: { id }, relations: RELATIONS });
  }

  findByPhase(phaseId: number): Promise<Match[]> {
    return this.dataSource.getRepository(Match).find({
      where: { phaseId },
      relations: RELATIONS,
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
