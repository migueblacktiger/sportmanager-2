import { HTTP_CODE_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { TournamentResponseDto } from './dto/tournament-response.dto';
import { TournamentsController } from './tournaments.controller';
import { TournamentsService } from './tournaments.service';

describe('TournamentsController', () => {
  let controller: TournamentsController;
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const tournament: TournamentResponseDto = {
    id: 7,
    name: 'Copa de prueba',
    sportId: 3,
    registrationStartsAt: '2027-01-01T00:00:00.000Z',
    registrationEndsAt: '2027-01-10T00:00:00.000Z',
    startsAt: '2027-01-11T00:00:00.000Z',
  };

  beforeEach(() => {
    jest.resetAllMocks();
    controller = new TournamentsController(service as unknown as TournamentsService);
  });

  it('delegates create, list, detail, update and delete to the service', async () => {
    service.create.mockResolvedValue(tournament);
    service.findAll.mockResolvedValue([tournament]);
    service.findOne.mockResolvedValue(tournament);
    service.update.mockResolvedValue(tournament);
    service.remove.mockResolvedValue({ message: 'Torneo eliminado' });

    await expect(controller.create({} as never)).resolves.toEqual(tournament);
    await expect(controller.findAll()).resolves.toEqual([tournament]);
    await expect(controller.findOne(7)).resolves.toEqual(tournament);
    await expect(controller.update(7, {})).resolves.toEqual(tournament);
    await expect(controller.remove(7)).resolves.toEqual({ message: 'Torneo eliminado' });
    expect(service.findOne).toHaveBeenCalledWith(7);
    expect(service.update).toHaveBeenCalledWith(7, {});
    expect(service.remove).toHaveBeenCalledWith(7);
  });

  it('declares all tournament routes and leaves them protected', () => {
    expect(Reflect.getMetadata(PATH_METADATA, TournamentsController)).toBe('tournaments');
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, TournamentsController)).not.toBe(true);
    const methods = [
      ['create', RequestMethod.POST, '/'],
      ['findAll', RequestMethod.GET, '/'],
      ['findOne', RequestMethod.GET, ':id'],
      ['update', RequestMethod.PATCH, ':id'],
      ['remove', RequestMethod.DELETE, ':id'],
    ] as const;
    for (const [name, method, path] of methods) {
      expect(Reflect.getMetadata(METHOD_METADATA, controller[name])).toBe(method);
      expect(Reflect.getMetadata(PATH_METADATA, controller[name])).toBe(path);
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, controller[name])).not.toBe(true);
    }
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, controller.remove)).toBeUndefined();
  });
});
