import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { CompetitionGroupsController } from './competition-groups.controller';
import { CompetitionGroupsService } from './competition-groups.service';

describe('CompetitionGroupsController', () => {
  const service = {
    create: jest.fn(), findByPhase: jest.fn(), findOne: jest.fn(), update: jest.fn(), remove: jest.fn(),
  };
  let controller: CompetitionGroupsController;

  beforeEach(() => {
    jest.resetAllMocks();
    controller = new CompetitionGroupsController(service as unknown as CompetitionGroupsService);
  });

  it('delegates every operation to the service', async () => {
    await controller.create(4, 6, { groups: [] });
    await controller.findByPhase(4, 6);
    await controller.findOne(2);
    await controller.update(2, {});
    await controller.remove(2);
    expect(service.create).toHaveBeenCalledWith(4, 6, { groups: [] });
    expect(service.findByPhase).toHaveBeenCalledWith(4, 6);
    expect(service.findOne).toHaveBeenCalledWith(2);
    expect(service.update).toHaveBeenCalledWith(2, {});
    expect(service.remove).toHaveBeenCalledWith(2);
  });

  it('declares the group routes and leaves them protected', () => {
    const routes = [
      ['create', RequestMethod.POST, 'tournaments/:tournamentId/phases/:phaseId/groups'],
      ['findByPhase', RequestMethod.GET, 'tournaments/:tournamentId/phases/:phaseId/groups'],
      ['findOne', RequestMethod.GET, 'groups/:id'],
      ['update', RequestMethod.PATCH, 'groups/:id'],
      ['remove', RequestMethod.DELETE, 'groups/:id'],
    ] as const;
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, CompetitionGroupsController)).not.toBe(true);
    for (const [name, method, path] of routes) {
      expect(Reflect.getMetadata(METHOD_METADATA, controller[name])).toBe(method);
      expect(Reflect.getMetadata(PATH_METADATA, controller[name])).toBe(path);
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, controller[name])).not.toBe(true);
    }
  });
});
