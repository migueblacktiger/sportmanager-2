import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { TournamentPhasesController } from './tournament-phases.controller';
import { TournamentPhasesService } from './tournament-phases.service';

describe('TournamentPhasesController', () => {
  const service = {
    create: jest.fn(), findByTournament: jest.fn(), findOne: jest.fn(), update: jest.fn(), remove: jest.fn(),
  };
  let controller: TournamentPhasesController;

  beforeEach(() => {
    jest.resetAllMocks();
    controller = new TournamentPhasesController(service as unknown as TournamentPhasesService);
  });

  it('delegates every operation to the service', async () => {
    service.create.mockResolvedValue([]);
    service.findByTournament.mockResolvedValue([]);
    service.findOne.mockResolvedValue({ id: 1 });
    service.update.mockResolvedValue({ id: 1 });
    service.remove.mockResolvedValue({ message: 'ok' });
    await controller.create(4, { phases: [] });
    await controller.findByTournament(4);
    await controller.findOne(1);
    await controller.update(1, {});
    await controller.remove(1);
    expect(service.create).toHaveBeenCalledWith(4, { phases: [] });
    expect(service.findByTournament).toHaveBeenCalledWith(4);
    expect(service.findOne).toHaveBeenCalledWith(1);
    expect(service.update).toHaveBeenCalledWith(1, {});
    expect(service.remove).toHaveBeenCalledWith(1);
  });

  it('declares the phase routes and leaves them protected', () => {
    const routes = [
      ['create', RequestMethod.POST, 'tournaments/:tournamentId/phases'],
      ['findByTournament', RequestMethod.GET, 'tournaments/:tournamentId/phases'],
      ['findOne', RequestMethod.GET, 'phases/:id'],
      ['update', RequestMethod.PATCH, 'phases/:id'],
      ['remove', RequestMethod.DELETE, 'phases/:id'],
    ] as const;
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, TournamentPhasesController)).not.toBe(true);
    for (const [name, method, path] of routes) {
      expect(Reflect.getMetadata(METHOD_METADATA, controller[name])).toBe(method);
      expect(Reflect.getMetadata(PATH_METADATA, controller[name])).toBe(path);
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, controller[name])).not.toBe(true);
    }
  });
});
