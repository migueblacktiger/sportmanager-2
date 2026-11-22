import { ConflictException, NotFoundException, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { PlayerResponseDto } from './dto/player-response.dto';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';

describe('PlayersController', () => {
  let controller: PlayersController;
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const player: PlayerResponseDto = {
    id: 15, name: 'Jugador de prueba', description: null, identification: null, active: true,
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      controllers: [PlayersController],
      providers: [{ provide: PlayersService, useValue: service }],
    }).compile();
    controller = module.get(PlayersController);
  });

  it('delegates creation and returns the service DTO', async () => {
    const dto = { name: 'Jugador de prueba' };
    service.create.mockResolvedValue(player);
    await expect(controller.create(dto)).resolves.toEqual(player);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('delegates the listing', async () => {
    service.findAll.mockResolvedValue([player]);
    await expect(controller.findAll()).resolves.toEqual([player]);
    expect(service.findAll).toHaveBeenCalledWith();
  });

  it('delegates detail lookup with the numeric id', async () => {
    service.findOne.mockResolvedValue(player);
    await expect(controller.findOne(15)).resolves.toEqual(player);
    expect(service.findOne).toHaveBeenCalledWith(15);
  });

  it('preserves explicit null and false in partial updates', async () => {
    const dto = { description: null, active: false };
    const updated = { ...player, active: false };
    service.update.mockResolvedValue(updated);
    await expect(controller.update(15, dto)).resolves.toEqual(updated);
    expect(service.update).toHaveBeenCalledWith(15, dto);
  });

  it('delegates deletion and preserves its response', async () => {
    const response = { message: 'Jugador eliminado' };
    service.remove.mockResolvedValue(response);
    await expect(controller.remove(15)).resolves.toEqual(response);
    expect(service.remove).toHaveBeenCalledWith(15);
  });

  it('propagates a missing player without hiding the HTTP exception', async () => {
    const error = new NotFoundException('Jugador no encontrado');
    service.findOne.mockRejectedValue(error);
    await expect(controller.findOne(15)).rejects.toBe(error);
  });

  it('propagates an associated-data conflict on deletion', async () => {
    const error = new ConflictException('El jugador tiene informacion asociada');
    service.remove.mockRejectedValue(error);
    await expect(controller.remove(15)).rejects.toBe(error);
  });

  it('keeps the controller path relative to the global negocio prefix', () => {
    expect(Reflect.getMetadata(PATH_METADATA, PlayersController)).toBe('players');
  });

  it.each([
    ['create', RequestMethod.POST, '/'],
    ['findAll', RequestMethod.GET, '/'],
    ['findOne', RequestMethod.GET, ':id'],
    ['update', RequestMethod.PATCH, ':id'],
    ['remove', RequestMethod.DELETE, ':id'],
  ] as const)('exposes %s with the intended method and without Public', (name, method, path) => {
    const handler = controller[name];
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(method);
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(path);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, PlayersController)).not.toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).not.toBe(true);
  });
});
