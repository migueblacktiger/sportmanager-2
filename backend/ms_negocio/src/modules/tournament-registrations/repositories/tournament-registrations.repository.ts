import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  In,
  QueryFailedError,
} from 'typeorm';
import { Team } from '../../teams/entities/team.entity';
import { TeamSport } from '../../team-sports/entities/team-sport.entity';
import { Tournament } from '../../tournaments/entities/tournament.entity';
import { TournamentRegistration } from '../entities/tournament-registration.entity';
import {
  TournamentRegistrationDuplicateError,
  TournamentRegistrationReferenceConflictError,
} from '../tournament-registration.errors';

export class TournamentRegistrationsUnitOfWork {
  constructor(private readonly manager: EntityManager) {}

  findTournamentForUpdate(id: number): Promise<Tournament | null> {
    return this.manager.getRepository(Tournament).findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
  }

  async findTeamsForUpdate(ids: number[]): Promise<Team[]> {
    return this.manager.getRepository(Team).createQueryBuilder('team')
      .where('team.id IN (:...ids)', { ids })
      .orderBy('team.id', 'ASC')
      .setLock('pessimistic_write')
      .getMany();
  }

  async findTeamSportsForUpdate(teamIds: number[], sportId: number): Promise<TeamSport[]> {
    return this.manager.getRepository(TeamSport).createQueryBuilder('teamSport')
      .where('teamSport.teamId IN (:...teamIds)', { teamIds })
      .andWhere('teamSport.sportId = :sportId', { sportId })
      .orderBy('teamSport.teamId', 'ASC')
      .setLock('pessimistic_write')
      .getMany();
  }

  async findExistingTeamIds(tournamentId: number, teamIds: number[]): Promise<number[]> {
    const registrations = await this.manager.getRepository(TournamentRegistration).find({
      select: { teamId: true },
      where: { tournamentId, teamId: In(teamIds) },
    });
    return registrations.map(registration => registration.teamId);
  }

  async insertMany(tournamentId: number, teamIds: number[]): Promise<TournamentRegistration[]> {
    const repository = this.manager.getRepository(TournamentRegistration);
    await repository.save(teamIds.map(teamId => repository.create({ tournamentId, teamId })));
    return repository.find({
      where: { tournamentId, teamId: In(teamIds) },
      relations: { tournament: true, team: true },
      order: { teamId: 'ASC' },
    });
  }

  findByTournament(tournamentId: number): Promise<TournamentRegistration[]> {
    return this.manager.getRepository(TournamentRegistration).find({
      where: { tournamentId },
      relations: { tournament: true, team: true },
      order: { teamId: 'ASC' },
    });
  }

  findByTeam(teamId: number): Promise<TournamentRegistration[]> {
    return this.manager.getRepository(TournamentRegistration).find({
      where: { teamId },
      relations: { tournament: true, team: true },
      order: { tournamentId: 'ASC' },
    });
  }

  findRegistrationForUpdate(tournamentId: number, teamId: number): Promise<TournamentRegistration | null> {
    return this.manager.getRepository(TournamentRegistration).findOne({
      where: { tournamentId, teamId },
      lock: { mode: 'pessimistic_write' },
    });
  }

  async deleteRegistration(registration: TournamentRegistration): Promise<boolean> {
    const result = await this.manager.getRepository(TournamentRegistration).delete(registration.id);
    return (result.affected ?? 0) > 0;
  }
}

@Injectable()
export class TournamentRegistrationsRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async transaction<T>(
    work: (unitOfWork: TournamentRegistrationsUnitOfWork) => Promise<T>,
  ): Promise<T> {
    // API mutations serialize on tournament, team, and TeamSport rows. Direct SQL writes
    // bypass these application-level cross-table checks; no composite FK is used by design.
    try {
      return await this.dataSource.transaction(manager => work(
        new TournamentRegistrationsUnitOfWork(manager),
      ));
    } catch (error: unknown) {
      if (this.hasDatabaseCode(error, 'ER_DUP_ENTRY')) {
        throw new TournamentRegistrationDuplicateError();
      }
      if (this.hasDatabaseCode(error, 'ER_NO_REFERENCED_ROW_2', 'ER_NO_REFERENCED_ROW')) {
        throw new TournamentRegistrationReferenceConflictError();
      }
      throw error;
    }
  }

  async findTournament(id: number): Promise<Tournament | null> {
    return this.dataSource.getRepository(Tournament).findOneBy({ id });
  }

  async findTeam(id: number): Promise<Team | null> {
    return this.dataSource.getRepository(Team).findOneBy({ id });
  }

  findByTournament(tournamentId: number): Promise<TournamentRegistration[]> {
    return this.dataSource.getRepository(TournamentRegistration).find({
      where: { tournamentId },
      relations: { tournament: true, team: true },
      order: { teamId: 'ASC' },
    });
  }

  findByTeam(teamId: number): Promise<TournamentRegistration[]> {
    return this.dataSource.getRepository(TournamentRegistration).find({
      where: { teamId },
      relations: { tournament: true, team: true },
      order: { tournamentId: 'ASC' },
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
