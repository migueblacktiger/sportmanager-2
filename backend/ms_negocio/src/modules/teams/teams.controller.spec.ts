import { ConflictException, NotFoundException, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { TeamResponseDto } from './dto/team-response.dto';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';

describe('TeamsController', () => {
  let controller: TeamsController;
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const team: TeamResponseDto = {
    id: 15, name: 'Equipo de prueba', description: null, active: true,
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      controllers: [TeamsController],
      providers: [{ provide: TeamsService, useValue: service }],
    }).compile();
    controller = module.get(TeamsController);
  });

  it('delegates creation and returns the service DTO', async () => {
    const dto = { name: 'Equipo de prueba' };
    service.create.mockResolvedValue(team);
    await expect(controller.create(dto)).resolves.toEqual(team);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('delegates the listing', async () => {
    service.findAll.mockResolvedValue([team]);
    await expect(controller.findAll()).resolves.toEqual([team]);
    expect(service.findAll).toHaveBeenCalledWith();
  });

  it('delegates detail lookup with the numeric id', async () => {
    service.findOne.mockResolvedValue(team);
    await expect(controller.findOne(15)).resolves.toEqual(team);
    expect(service.findOne).toHaveBeenCalledWith(15);
  });

  it('preserves explicit null and false in partial updates', async () => {
    const dto = { description: null, active: false };
    const updated = { ...team, active: false };
    service.update.mockResolvedValue(updated);
    await expect(controller.update(15, dto)).resolves.toEqual(updated);
    expect(service.update).toHaveBeenCalledWith(15, dto);
  });

  it('delegates deletion and preserves its response', async () => {
    const response = { message: 'Equipo eliminado' };
    service.remove.mockResolvedValue(response);
    await expect(controller.remove(15)).resolves.toEqual(response);
    expect(service.remove).toHaveBeenCalledWith(15);
  });

  it('propagates a missing team without hiding the HTTP exception', async () => {
    const error = new NotFoundException('Equipo no encontrado');
    service.findOne.mockRejectedValue(error);
    await expect(controller.findOne(15)).rejects.toBe(error);
  });

  it('propagates an associated-data conflict on deletion', async () => {
    const error = new ConflictException('El equipo tiene informacion asociada');
    service.remove.mockRejectedValue(error);
    await expect(controller.remove(15)).rejects.toBe(error);
  });

  it('keeps the controller path relative to the global negocio prefix', () => {
    expect(Reflect.getMetadata(PATH_METADATA, TeamsController)).toBe('teams');
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
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, TeamsController)).not.toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).not.toBe(true);
  });
});
