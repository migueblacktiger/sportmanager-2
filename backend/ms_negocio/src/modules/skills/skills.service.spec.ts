import { validate } from 'class-validator';
import { CreateSkillDto } from './dto/create-skill.dto';
import { Skill } from './entities/skill.entity';
import { SkillMapper } from './mappers/skill.mapper';
import { SkillDeleteRestrictedError, SkillUniqueConstraintError } from './repositories/skills-repository.errors';
import { SkillsRepository } from './repositories/skills.repository';
import { SkillAlreadyExistsError, SkillInUseError, SkillNotFoundError } from './skills.errors';
import { SkillsService } from './skills.service';

describe('SkillsService', () => {
  let repository: {
    findAll: jest.Mock;
    findById: jest.Mock;
    existsByNormalizedName: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };
  let service: SkillsService;

  const createSkill = (overrides: Partial<Skill> = {}): Skill =>
    Object.assign(new Skill(), { id: 1, name: 'Velocidad', description: null }, overrides);

  beforeEach(() => {
    repository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      existsByNormalizedName: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };
    service = new SkillsService(repository as unknown as SkillsRepository, new SkillMapper());
  });

  it('creates a valid skill and trims its name', async () => {
    const saved = createSkill();
    repository.existsByNormalizedName.mockResolvedValue(false);
    repository.save.mockResolvedValue(saved);

    await expect(service.create({ name: '  Velocidad  ' })).resolves.toEqual({
      id: 1, name: 'Velocidad', description: null,
    });
    expect(repository.existsByNormalizedName).toHaveBeenCalledWith('velocidad', undefined);
    expect(repository.save.mock.calls[0][0].name).toBe('Velocidad');
  });

  it.each(['', ' \t '])('rejects a name containing no visible characters: %j', async (name) => {
    const dto = Object.assign(new CreateSkillDto(), { name });
    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });

  it('requires a name', async () => {
    await expect(validate(new CreateSkillDto())).resolves.not.toHaveLength(0);
  });

  it('rejects a duplicate found before saving', async () => {
    repository.existsByNormalizedName.mockResolvedValue(true);

    await expect(service.create({ name: ' velocidad ' }))
      .rejects.toBeInstanceOf(SkillAlreadyExistsError);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('translates a concurrent database uniqueness violation to a duplicate error', async () => {
    repository.existsByNormalizedName.mockResolvedValue(false);
    repository.save.mockRejectedValue(new SkillUniqueConstraintError());

    await expect(service.create({ name: 'Velocidad' }))
      .rejects.toBeInstanceOf(SkillAlreadyExistsError);
  });

  it('lists skills through the mapper', async () => {
    repository.findAll.mockResolvedValue([createSkill()]);

    await expect(service.findAll()).resolves.toEqual([
      { id: 1, name: 'Velocidad', description: null },
    ]);
  });

  it('returns a skill detail and reports a missing ID', async () => {
    repository.findById.mockResolvedValueOnce(createSkill()).mockResolvedValueOnce(null);

    await expect(service.findOne(1)).resolves.toEqual({
      id: 1, name: 'Velocidad', description: null,
    });
    await expect(service.findOne(2)).rejects.toBeInstanceOf(SkillNotFoundError);
  });

  it('updates a skill and permits its current normalized name', async () => {
    const existing = createSkill();
    repository.findById.mockResolvedValue(existing);
    repository.existsByNormalizedName.mockResolvedValue(false);
    repository.save.mockImplementation(async (skill: Skill) => skill);

    await expect(service.update(1, { name: '  VELOCIDAD ' })).resolves.toEqual({
      id: 1, name: 'VELOCIDAD', description: null,
    });
    expect(repository.existsByNormalizedName).toHaveBeenCalledWith('velocidad', 1);
  });

  it('deletes a skill without associations', async () => {
    repository.findById.mockResolvedValue(createSkill());
    repository.remove.mockResolvedValue(true);

    await expect(service.remove(1)).resolves.toBeUndefined();
  });

  it('returns not found when deleting a missing skill', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.remove(99)).rejects.toBeInstanceOf(SkillNotFoundError);
    expect(repository.remove).not.toHaveBeenCalled();
  });

  it('translates a restrictive foreign-key error to an in-use error', async () => {
    repository.findById.mockResolvedValue(createSkill());
    repository.remove.mockRejectedValue(new SkillDeleteRestrictedError());

    await expect(service.remove(1)).rejects.toBeInstanceOf(SkillInUseError);
  });
});
