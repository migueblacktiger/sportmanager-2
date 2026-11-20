import { ConflictException, NotFoundException, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { SportResponseDto } from './dto/sport-response.dto';
import { SportsController } from './sports.controller';
import { SportsService } from './sports.service';

describe('SportsController', () => {
  let controller: SportsController;
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const sport: SportResponseDto = {
    id: 15, name: 'Futbol', description: null, active: true, parentId: null,
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      controllers: [SportsController],
      providers: [{ provide: SportsService, useValue: service }],
    }).compile();
    controller = module.get(SportsController);
  });

  it('delegates creation and returns the service DTO', async () => {
    const dto = { name: 'Futbol' };
    service.create.mockResolvedValue(sport);
    await expect(controller.create(dto)).resolves.toEqual(sport);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('delegates the listing', async () => {
    service.findAll.mockResolvedValue([sport]);
    await expect(controller.findAll()).resolves.toEqual([sport]);
    expect(service.findAll).toHaveBeenCalledWith();
  });

  it('delegates detail lookup with the numeric id', async () => {
    service.findOne.mockResolvedValue(sport);
    await expect(controller.findOne(15)).resolves.toEqual(sport);
    expect(service.findOne).toHaveBeenCalledWith(15);
  });

  it('preserves explicit null and false in partial updates', async () => {
    const dto = { parentId: null, active: false };
    const updated = { ...sport, active: false };
    service.update.mockResolvedValue(updated);
    await expect(controller.update(15, dto)).resolves.toEqual(updated);
    expect(service.update).toHaveBeenCalledWith(15, dto);
  });

  it('delegates deletion and preserves its response', async () => {
    const response = { message: 'Deporte eliminado' };
    service.remove.mockResolvedValue(response);
    await expect(controller.remove(15)).resolves.toEqual(response);
    expect(service.remove).toHaveBeenCalledWith(15);
  });

  it('propagates a missing sport without hiding the HTTP exception', async () => {
    const error = new NotFoundException('Deporte no encontrado');
    service.findOne.mockRejectedValue(error);
    await expect(controller.findOne(15)).rejects.toBe(error);
  });

  it('propagates an associated-data conflict on deletion', async () => {
    const error = new ConflictException('El deporte tiene subdeportes');
    service.remove.mockRejectedValue(error);
    await expect(controller.remove(15)).rejects.toBe(error);
  });

  it('keeps the controller path relative to the global negocio prefix', () => {
    expect(Reflect.getMetadata(PATH_METADATA, SportsController)).toBe('sports');
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
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, SportsController)).not.toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).not.toBe(true);
  });
});
