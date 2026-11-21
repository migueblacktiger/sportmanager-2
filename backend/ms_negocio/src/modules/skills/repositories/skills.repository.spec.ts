import { DataSource, QueryFailedError } from 'typeorm';
import { Skill } from '../entities/skill.entity';
import { SkillDeleteRestrictedError, SkillUniqueConstraintError } from './skills-repository.errors';
import { SkillsRepository } from './skills.repository';

describe('SkillsRepository', () => {
  let dataSource: { query: jest.Mock; getRepository: jest.Mock };
  let persistence: { find: jest.Mock; findOne: jest.Mock; save: jest.Mock; delete: jest.Mock };
  let repository: SkillsRepository;

  beforeEach(() => {
    persistence = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    dataSource = {
      query: jest.fn(),
      getRepository: jest.fn().mockReturnValue(persistence),
    };
    repository = new SkillsRepository(dataSource as unknown as DataSource);
  });

  function queryError(code: string): QueryFailedError {
    return new QueryFailedError(
      'database operation',
      [],
      Object.assign(new Error(code), { code }),
    );
  }

  it('checks normalized names using a parameterized query', async () => {
    dataSource.query.mockResolvedValue([{ id: 4 }]);

    await expect(repository.existsByNormalizedName('velocidad', 7)).resolves.toBe(true);
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('AND id <> ?'),
      ['velocidad', 7],
    );
  });

  it('maps MySQL duplicate-key errors to a repository error', async () => {
    persistence.save.mockRejectedValue(queryError('ER_DUP_ENTRY'));

    await expect(repository.save(new Skill())).rejects.toBeInstanceOf(SkillUniqueConstraintError);
  });

  it('maps restrictive foreign-key errors during deletion', async () => {
    persistence.delete.mockRejectedValue(queryError('ER_ROW_IS_REFERENCED_2'));

    await expect(repository.remove(1)).rejects.toBeInstanceOf(SkillDeleteRestrictedError);
  });
});
