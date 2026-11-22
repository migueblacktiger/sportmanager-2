import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { TournamentRegistrationsController } from './tournament-registrations.controller';
import { TournamentRegistrationsService } from './tournament-registrations.service';

describe('TournamentRegistrationsController', () => {
  const service = {
    register: jest.fn(),
    findByTournament: jest.fn(),
    findByTeam: jest.fn(),
    remove: jest.fn(),
  };
  let controller: TournamentRegistrationsController;

  beforeEach(() => {
    jest.resetAllMocks();
    controller = new TournamentRegistrationsController(
      service as unknown as TournamentRegistrationsService,
    );
  });

  it('delegates registration, queries and withdrawal to the service', async () => {
    service.register.mockResolvedValue([]);
    service.findByTournament.mockResolvedValue([]);
    service.findByTeam.mockResolvedValue([]);
    service.remove.mockResolvedValue({ message: 'Retirada' });

    await expect(controller.register(8, { teamIds: [4] })).resolves.toEqual([]);
    await expect(controller.findByTournament(8)).resolves.toEqual([]);
    await expect(controller.findByTeam(4)).resolves.toEqual([]);
    await expect(controller.remove(8, 4)).resolves.toEqual({ message: 'Retirada' });
    expect(service.register).toHaveBeenCalledWith(8, { teamIds: [4] });
    expect(service.remove).toHaveBeenCalledWith(8, 4);
  });

  it('exposes the protected REST route shapes and HTTP methods', () => {
    const routes = [
      ['register', RequestMethod.POST, 'tournaments/:tournamentId/registrations'],
      ['findByTournament', RequestMethod.GET, 'tournaments/:tournamentId/registrations'],
      ['findByTeam', RequestMethod.GET, 'teams/:teamId/registrations'],
      ['remove', RequestMethod.DELETE, 'tournaments/:tournamentId/registrations/:teamId'],
    ] as const;
    for (const [name, method, path] of routes) {
      expect(Reflect.getMetadata(METHOD_METADATA, controller[name])).toBe(method);
      expect(Reflect.getMetadata(PATH_METADATA, controller[name])).toBe(path);
    }
  });
});
