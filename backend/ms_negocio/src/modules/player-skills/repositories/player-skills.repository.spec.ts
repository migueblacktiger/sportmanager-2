import { DataSource, QueryFailedError } from 'typeorm';
import { PlayerSkill } from '../entities/player-skill.entity';
import {
  PlayerSkillForeignKeyError,
  PlayerSkillUniqueConstraintError,
} from './player-skill-repository.errors';
import { PlayerSkillsRepository } from './player-skills.repository';

describe('PlayerSkillsRepository', () => {
  let dataSource: { getRepository: jest.Mock };
  let persistence: { findOne: jest.Mock; findOneBy: jest.Mock; find: jest.Mock; save: jest.Mock; delete: jest.Mock };
  let repository: PlayerSkillsRepository;

  beforeEach(() => {
    persistence = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    dataSource = { getRepository: jest.fn().mockReturnValue(persistence) };
    repository = new PlayerSkillsRepository(dataSource as unknown as DataSource);
  });

  function queryError(code: string): QueryFailedError {
    return new QueryFailedError('database operation', [], Object.assign(new Error(code), { code }));
  }

  it('uses the PlayerSkill entity to persist the associative model', async () => {
    const association = new PlayerSkill();
    persistence.save.mockResolvedValue(association);

    await expect(repository.save(association)).resolves.toBe(association);
    expect(dataSource.getRepository).toHaveBeenCalledWith(PlayerSkill);
  });

  it('translates concurrent unique and missing-reference database errors', async () => {
    persistence.save.mockRejectedValueOnce(queryError('ER_DUP_ENTRY'));
    await expect(repository.save(new PlayerSkill()))
      .rejects.toBeInstanceOf(PlayerSkillUniqueConstraintError);

    persistence.save.mockRejectedValueOnce(queryError('ER_NO_REFERENCED_ROW_2'));
    await expect(repository.save(new PlayerSkill()))
      .rejects.toBeInstanceOf(PlayerSkillForeignKeyError);
  });

  it('removes only the matching association', async () => {
    persistence.delete.mockResolvedValue({ affected: 1 });
    await expect(repository.remove(12, 5)).resolves.toBe(true);
    expect(persistence.delete).toHaveBeenCalledWith({ playerId: 12, skillId: 5 });
  });
});
