import { DataSource, QueryFailedError } from 'typeorm';
import { Sport } from '../../sports/entities/sport.entity';
import { Tournament } from '../entities/tournament.entity';
import {
  TournamentDeleteRestrictedError,
  TournamentSportReferenceError,
} from './tournament-repository.errors';
import { TournamentsRepository } from './tournaments.repository';

describe('TournamentsRepository', () => {
  let dataSource: { getRepository: jest.Mock };
  let persistence: { findOneBy: jest.Mock; find: jest.Mock; save: jest.Mock; delete: jest.Mock };
  let repository: TournamentsRepository;

  beforeEach(() => {
    persistence = {
      findOneBy: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    dataSource = { getRepository: jest.fn().mockReturnValue(persistence) };
    repository = new TournamentsRepository(dataSource as unknown as DataSource);
  });

  function queryError(code: string): QueryFailedError {
    return new QueryFailedError(
      'database operation',
      [],
      Object.assign(new Error(code), { code }),
    );
  }

  it('uses the existing Sport entity for sport lookups', async () => {
    persistence.findOneBy.mockResolvedValue({ id: 4 });

    await expect(repository.findSportById(4)).resolves.toEqual({ id: 4 });
    expect(dataSource.getRepository).toHaveBeenCalledWith(Sport);
    expect(persistence.findOneBy).toHaveBeenCalledWith({ id: 4 });
  });

  it('translates a concurrent missing-sport foreign-key error', async () => {
    persistence.save.mockRejectedValue(queryError('ER_NO_REFERENCED_ROW_2'));

    await expect(repository.save(new Tournament()))
      .rejects.toBeInstanceOf(TournamentSportReferenceError);
  });

  it('translates restrictive foreign-key errors on delete', async () => {
    persistence.delete.mockRejectedValue(queryError('ER_ROW_IS_REFERENCED_2'));

    await expect(repository.remove(4)).rejects.toBeInstanceOf(TournamentDeleteRestrictedError);
  });
});
