import { validate } from 'class-validator';
import { Player } from '../players/entities/player.entity';
import { Skill } from '../skills/entities/skill.entity';
import { CreatePlayerSkillDto } from './dto/create-player-skill.dto';
import { PlayerSkill } from './entities/player-skill.entity';
import { PlayerSkillMapper } from './mappers/player-skill.mapper';
import { PlayerMapper } from '../players/mappers/player.mapper';
import { SkillMapper } from '../skills/mappers/skill.mapper';
import { PlayerSkillsRepository } from './repositories/player-skills.repository';
import {
  PlayerSkillAlreadyExistsError,
  PlayerSkillAssociationNotFoundError,
  PlayerSkillInvalidIdError,
  PlayerSkillPlayerNotFoundError,
  PlayerSkillReferenceNotFoundError,
  PlayerSkillSkillNotFoundError,
} from './player-skill.errors';
import {
  PlayerSkillForeignKeyError,
  PlayerSkillUniqueConstraintError,
} from './repositories/player-skill-repository.errors';
import { PlayerSkillsService } from './player-skills.service';

describe('PlayerSkillsService', () => {
  let repository: {
    findPlayerById: jest.Mock;
    findSkillById: jest.Mock;
    findByPair: jest.Mock;
    findByPlayerId: jest.Mock;
    findBySkillId: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };
  let service: PlayerSkillsService;

  const player = (id: number): Player => Object.assign(new Player(), {
    id,
    name: `Jugador ${id}`,
    identification: null,
    description: null,
    active: false,
  });

  const skill = (id: number): Skill => Object.assign(new Skill(), {
    id,
    name: `Habilidad ${id}`,
    description: null,
  });

  const association = (playerId: number, skillId: number): PlayerSkill =>
    Object.assign(new PlayerSkill(), {
      id: playerId * 100 + skillId,
      playerId,
      skillId,
      player: player(playerId),
      skill: skill(skillId),
    });

  beforeEach(() => {
    repository = {
      findPlayerById: jest.fn().mockImplementation(async (id: number) => player(id)),
      findSkillById: jest.fn().mockImplementation(async (id: number) => skill(id)),
      findByPair: jest.fn(),
      findByPlayerId: jest.fn(),
      findBySkillId: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };
    service = new PlayerSkillsService(
      repository as unknown as PlayerSkillsRepository,
      new PlayerSkillMapper(new PlayerMapper(), new SkillMapper()),
    );
  });

  it('associates an existing skill to an existing player, even if inactive', async () => {
    const saved = association(12, 5);
    repository.findByPair.mockResolvedValueOnce(null).mockResolvedValueOnce(saved);
    repository.save.mockImplementation(async (entity: PlayerSkill) => entity);

    await expect(service.create({ playerId: 12, skillId: 5 })).resolves.toEqual({
      id: 1205,
      playerId: 12,
      skillId: 5,
      player: {
        id: 12, name: 'Jugador 12', identification: null, description: null, active: false,
      },
      skill: { id: 5, name: 'Habilidad 5', description: null },
    });
    expect(repository.findPlayerById).toHaveBeenCalledWith(12);
    expect(repository.findSkillById).toHaveBeenCalledWith(5);
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ playerId: 12, skillId: 5 }));
  });

  it('allows several skills per player and several players per skill', async () => {
    repository.findByPair.mockResolvedValue(null);
    repository.save.mockImplementation(async (entity: PlayerSkill) => entity);
    repository.findByPair
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(association(12, 5))
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(association(12, 8))
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(association(14, 5));

    await service.create({ playerId: 12, skillId: 5 });
    await service.create({ playerId: 12, skillId: 8 });
    await service.create({ playerId: 14, skillId: 5 });

    expect(repository.save).toHaveBeenCalledTimes(3);
  });

  it('rejects duplicate associations before persistence and translates unique-index collisions', async () => {
    repository.findByPair.mockResolvedValueOnce(association(12, 5));
    await expect(service.create({ playerId: 12, skillId: 5 }))
      .rejects.toBeInstanceOf(PlayerSkillAlreadyExistsError);
    expect(repository.save).not.toHaveBeenCalled();

    repository.findByPair.mockResolvedValueOnce(null);
    repository.save.mockRejectedValue(new PlayerSkillUniqueConstraintError());
    await expect(service.create({ playerId: 12, skillId: 5 }))
      .rejects.toBeInstanceOf(PlayerSkillAlreadyExistsError);
  });

  it('returns 404 for a missing player or skill', async () => {
    repository.findPlayerById.mockResolvedValue(null);
    await expect(service.create({ playerId: 12, skillId: 5 }))
      .rejects.toBeInstanceOf(PlayerSkillPlayerNotFoundError);

    repository.findPlayerById.mockResolvedValue(player(12));
    repository.findSkillById.mockResolvedValue(null);
    await expect(service.create({ playerId: 12, skillId: 5 }))
      .rejects.toBeInstanceOf(PlayerSkillSkillNotFoundError);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('maps a concurrently removed player or skill to not found', async () => {
    repository.findByPair.mockResolvedValue(null);
    repository.save.mockRejectedValue(new PlayerSkillForeignKeyError());

    await expect(service.create({ playerId: 12, skillId: 5 }))
      .rejects.toBeInstanceOf(PlayerSkillReferenceNotFoundError);
  });

  it('queries a player’s skills and a skill’s players, including empty results', async () => {
    repository.findByPlayerId.mockResolvedValue([association(12, 5)]);
    repository.findBySkillId.mockResolvedValue([association(12, 5), association(14, 5)]);

    await expect(service.findByPlayer(12)).resolves.toMatchObject([
      { playerId: 12, skillId: 5, skill: { name: 'Habilidad 5' } },
    ]);
    await expect(service.findBySkill(5)).resolves.toMatchObject([
      { id: 12, name: 'Jugador 12', active: false },
      { id: 14, name: 'Jugador 14', active: false },
    ]);

    repository.findByPlayerId.mockResolvedValue([]);
    repository.findBySkillId.mockResolvedValue([]);
    await expect(service.findByPlayer(12)).resolves.toEqual([]);
    await expect(service.findBySkill(5)).resolves.toEqual([]);
  });

  it('returns 404 when querying with a missing parent', async () => {
    repository.findPlayerById.mockResolvedValue(null);
    await expect(service.findByPlayer(12)).rejects.toBeInstanceOf(PlayerSkillPlayerNotFoundError);

    repository.findPlayerById.mockResolvedValue(player(12));
    repository.findSkillById.mockResolvedValue(null);
    await expect(service.findBySkill(5)).rejects.toBeInstanceOf(PlayerSkillSkillNotFoundError);
  });

  it('removes only the association and returns 404 if it does not exist', async () => {
    repository.remove.mockResolvedValue(true);
    await expect(service.remove(12, 5)).resolves.toMatchObject({ message: expect.any(String) });
    expect(repository.remove).toHaveBeenCalledWith(12, 5);

    repository.remove.mockResolvedValue(false);
    await expect(service.remove(12, 5))
      .rejects.toBeInstanceOf(PlayerSkillAssociationNotFoundError);
  });

  it.each([0, -1, 1.5, 2147483648])('rejects invalid ID %s before repository access', async id => {
    await expect(service.findByPlayer(id)).rejects.toBeInstanceOf(PlayerSkillInvalidIdError);
    await expect(service.findBySkill(id)).rejects.toBeInstanceOf(PlayerSkillInvalidIdError);
    await expect(service.remove(id, 5)).rejects.toBeInstanceOf(PlayerSkillInvalidIdError);
    expect(repository.findPlayerById).not.toHaveBeenCalled();
    expect(repository.findSkillById).not.toHaveBeenCalled();
  });

  it('validates request IDs as positive bounded integers', async () => {
    const invalid = Object.assign(new CreatePlayerSkillDto(), { playerId: 0, skillId: 5 });
    await expect(validate(invalid)).resolves.not.toHaveLength(0);
    const stringId = Object.assign(new CreatePlayerSkillDto(), { playerId: '12', skillId: 5 });
    await expect(validate(stringId)).resolves.not.toHaveLength(0);
  });
});
