import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryFailedError } from 'typeorm';
import { Sport } from '../../sports/entities/sport.entity';
import { Tournament } from '../entities/tournament.entity';
import {
  TournamentDeleteRestrictedError,
  TournamentSportReferenceError,
} from './tournament-repository.errors';

@Injectable()
export class TournamentsRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findAll(): Promise<Tournament[]> {
    return this.dataSource.getRepository(Tournament).find({
      order: { name: 'ASC', id: 'ASC' },
    });
  }

  async findById(id: number): Promise<Tournament | null> {
    return this.dataSource.getRepository(Tournament).findOneBy({ id });
  }

  async findSportById(id: number): Promise<Sport | null> {
    return this.dataSource.getRepository(Sport).findOneBy({ id });
  }

  async save(tournament: Tournament): Promise<Tournament> {
    try {
      return await this.dataSource.getRepository(Tournament).save(tournament);
    } catch (error: unknown) {
      if (this.hasDatabaseCode(error, 'ER_NO_REFERENCED_ROW_2', 'ER_NO_REFERENCED_ROW')) {
        throw new TournamentSportReferenceError();
      }
      throw error;
    }
  }

  async remove(id: number): Promise<boolean> {
    try {
      const result = await this.dataSource.getRepository(Tournament).delete(id);
      return (result.affected ?? 0) > 0;
    } catch (error: unknown) {
      if (this.hasDatabaseCode(error, 'ER_ROW_IS_REFERENCED_2', 'ER_ROW_IS_REFERENCED')) {
        throw new TournamentDeleteRestrictedError();
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
