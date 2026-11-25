import { DataSource, QueryFailedError } from 'typeorm';
import { MatchAudience } from '../entities/match-audience.entity';
import { MatchAudienceSource } from '../match-audience-source';
import { MatchAudienceRepository } from './match-audience.repository';

describe('MatchAudienceRepository', () => {
  it('treats a repeated confirmed audience registration as idempotent', async () => {
    const duplicateError = new QueryFailedError(
      'INSERT', [], Object.assign(new Error('duplicate'), { code: 'ER_DUP_ENTRY' }),
    );
    const insert = jest.fn().mockRejectedValue(duplicateError);
    const dataSource = {
      getRepository: jest.fn().mockReturnValue({ insert }),
    };
    const repository = new MatchAudienceRepository(dataSource as unknown as DataSource);

    await expect(repository.add(5, 7, MatchAudienceSource.Tickets)).resolves.toBeUndefined();
    expect(insert).toHaveBeenCalledWith({ matchId: 5, fanId: 7, source: MatchAudienceSource.Tickets });
  });

  it('does not suppress non-duplicate database errors', async () => {
    const error = new QueryFailedError(
      'INSERT', [], Object.assign(new Error('missing reference'), { code: 'ER_NO_REFERENCED_ROW_2' }),
    );
    const dataSource = {
      getRepository: jest.fn().mockReturnValue({ insert: jest.fn().mockRejectedValue(error) }),
    };
    const repository = new MatchAudienceRepository(dataSource as unknown as DataSource);

    await expect(repository.add(999, 7, MatchAudienceSource.Tickets)).rejects.toEqual(error);
  });
});
