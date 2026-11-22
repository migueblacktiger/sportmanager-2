import { DataSource, QueryFailedError } from 'typeorm';
import { TournamentRegistrationsRepository } from './tournament-registrations.repository';
import { TournamentRegistrationDuplicateError } from '../tournament-registration.errors';

describe('TournamentRegistrationsRepository', () => {
  let dataSource: { transaction: jest.Mock };
  let repository: TournamentRegistrationsRepository;
  const manager = {};

  beforeEach(() => {
    dataSource = {
      transaction: jest.fn(async <T>(work: (transactionManager: object) => Promise<T>) =>
        work(manager)),
    };
    repository = new TournamentRegistrationsRepository(dataSource as unknown as DataSource);
  });

  it('runs the complete unit of work inside a TypeORM transaction', async () => {
    await expect(repository.transaction(async () => 'committed')).resolves.toBe('committed');
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(dataSource.transaction.mock.calls[0][0]).toBeInstanceOf(Function);
  });

  it('propagates validation errors so TypeORM rolls the transaction back', async () => {
    const validationError = new Error('Invalid batch');

    await expect(repository.transaction(async () => { throw validationError; }))
      .rejects.toBe(validationError);
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });

  it('maps a concurrent unique-index collision to a duplicate registration conflict', async () => {
    const databaseError = new QueryFailedError(
      'insert registration',
      [],
      Object.assign(new Error('duplicate key'), { code: 'ER_DUP_ENTRY' }),
    );
    dataSource.transaction.mockRejectedValue(databaseError);

    await expect(repository.transaction(async () => 'unreachable'))
      .rejects.toBeInstanceOf(TournamentRegistrationDuplicateError);
  });
});
