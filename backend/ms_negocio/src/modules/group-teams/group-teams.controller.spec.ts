import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { CreateGroupTeamsDto } from './dto/create-group-teams.dto';
import { GroupTeamsController } from './group-teams.controller';
import { GroupTeamsService } from './group-teams.service';

describe('GroupTeamsController', () => {
  const service = { assign: jest.fn(), findByGroup: jest.fn(), remove: jest.fn() };
  let controller: GroupTeamsController;

  beforeEach(() => {
    jest.resetAllMocks();
    controller = new GroupTeamsController(service as unknown as GroupTeamsService);
  });

  it('delegates every operation to the service', async () => {
    await controller.assign(2, { teamIds: [10] });
    await controller.findByGroup(2);
    await controller.remove(2, 10);
    expect(service.assign).toHaveBeenCalledWith(2, { teamIds: [10] });
    expect(service.findByGroup).toHaveBeenCalledWith(2);
    expect(service.remove).toHaveBeenCalledWith(2, 10);
  });

  it('declares the group-team routes and leaves them protected', () => {
    const routes = [
      ['assign', RequestMethod.POST, 'groups/:groupId/teams'],
      ['findByGroup', RequestMethod.GET, 'groups/:groupId/teams'],
      ['remove', RequestMethod.DELETE, 'groups/:groupId/teams/:teamId'],
    ] as const;
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, GroupTeamsController)).not.toBe(true);
    for (const [name, method, path] of routes) {
      expect(Reflect.getMetadata(METHOD_METADATA, controller[name])).toBe(method);
      expect(Reflect.getMetadata(PATH_METADATA, controller[name])).toBe(path);
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, controller[name])).not.toBe(true);
    }
  });

  it('validates the list of team identifiers', async () => {
    const errors = async (plain: unknown): Promise<number> => (
      await validate(plainToInstance(CreateGroupTeamsDto, plain) as object, {
        whitelist: true, forbidNonWhitelisted: true,
      })
    ).length;
    await expect(errors({ teamIds: [1, 2, 3] })).resolves.toBe(0);
    for (const bad of [{ teamIds: [] }, { teamIds: [1, 1] }, { teamIds: [0] }, { teamIds: ['a'] }, {}]) {
      expect(await errors(bad)).toBeGreaterThan(0);
    }
  });
});
