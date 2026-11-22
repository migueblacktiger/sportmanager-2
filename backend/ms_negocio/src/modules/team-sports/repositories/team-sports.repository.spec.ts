import { DataSource } from 'typeorm';
import { TeamSport } from '../entities/team-sport.entity';
import { TeamSportHasTournamentRegistrationsError } from './team-sport.errors';
import { TeamSportsRepository } from './team-sports.repository';

describe('TeamSportsRepository', () => {
  it('locks and refuses to remove a TeamSport pair used by a tournament registration', async () => {
    const queryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ id: 12 }),
    };
    const associationRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 3, teamId: 4, sportId: 5 }),
      delete: jest.fn(),
    };
    const registrationRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    const manager = {
      getRepository: jest.fn(entity => entity === TeamSport
        ? associationRepository : registrationRepository),
    };
    const dataSource = {
      transaction: jest.fn((work: (transactionManager: object) => Promise<unknown>) => work(manager)),
    };
    const repository = new TeamSportsRepository(dataSource as unknown as DataSource);

    await expect(repository.remove(4, 5))
      .rejects.toBeInstanceOf(TeamSportHasTournamentRegistrationsError);
    expect(associationRepository.findOne).toHaveBeenCalledWith({
      where: { teamId: 4, sportId: 5 },
      lock: { mode: 'pessimistic_write' },
    });
    expect(registrationRepository.createQueryBuilder).toHaveBeenCalled();
    expect(associationRepository.delete).not.toHaveBeenCalled();
  });
});
