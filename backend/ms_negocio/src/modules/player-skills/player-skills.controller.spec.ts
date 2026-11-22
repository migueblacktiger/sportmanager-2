import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { PlayerSkillsController } from './player-skills.controller';
import { PlayerSkillsService } from './player-skills.service';

describe('PlayerSkillsController', () => {
  const service = {
    create: jest.fn(),
    findByPlayer: jest.fn(),
    findBySkill: jest.fn(),
    remove: jest.fn(),
  };
  let controller: PlayerSkillsController;

  beforeEach(() => {
    jest.resetAllMocks();
    controller = new PlayerSkillsController(service as unknown as PlayerSkillsService);
  });

  it('delegates assignment, both queries and removal to the service', async () => {
    service.create.mockResolvedValue({ id: 1 });
    service.findByPlayer.mockResolvedValue([]);
    service.findBySkill.mockResolvedValue([]);
    service.remove.mockResolvedValue({ message: 'Retirada' });

    await expect(controller.create({ playerId: 12, skillId: 5 })).resolves.toEqual({ id: 1 });
    await expect(controller.findByPlayer(12)).resolves.toEqual([]);
    await expect(controller.findBySkill(5)).resolves.toEqual([]);
    await expect(controller.remove(12, 5)).resolves.toEqual({ message: 'Retirada' });
  });

  it('exposes the protected REST route shapes and methods', () => {
    const routes = [
      ['create', RequestMethod.POST, '/'],
      ['findByPlayer', RequestMethod.GET, 'players/:playerId'],
      ['findBySkill', RequestMethod.GET, 'skills/:skillId'],
      ['remove', RequestMethod.DELETE, ':playerId/:skillId'],
    ] as const;
    expect(Reflect.getMetadata(PATH_METADATA, PlayerSkillsController)).toBe('player-skills');
    for (const [name, method, path] of routes) {
      expect(Reflect.getMetadata(METHOD_METADATA, controller[name])).toBe(method);
      expect(Reflect.getMetadata(PATH_METADATA, controller[name])).toBe(path);
    }
  });
});
