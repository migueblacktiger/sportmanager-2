import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { CreateFinalPhaseDto } from './dto/create-final-phase.dto';
import { UpdateFinalPhaseDto } from './dto/update-final-phase.dto';
import { FinalPhasesController } from './final-phases.controller';
import { FinalPhasesService } from './final-phases.service';

const errorsOf = async <T extends object>(type: new () => T, plain: unknown): Promise<number> => (
  await validate(plainToInstance(type, plain) as object, {
    whitelist: true, forbidNonWhitelisted: true,
  })
).length;

describe('FinalPhasesController', () => {
  const service = {
    create: jest.fn(),
    findByTournament: jest.fn(),
    findOne: jest.fn(),
    findMatches: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  let controller: FinalPhasesController;

  beforeEach(() => {
    jest.resetAllMocks();
    controller = new FinalPhasesController(service as unknown as FinalPhasesService);
  });

  it('delegates every operation to the service', async () => {
    await controller.create(4, { name: 'Final', order: 3 });
    await controller.findByTournament(4);
    await controller.findOne(4, 5);
    await controller.findMatches(4, 5);
    await controller.update(4, 5, { name: 'Nueva' });
    await controller.remove(4, 5);
    expect(service.create).toHaveBeenCalledWith(4, { name: 'Final', order: 3 });
    expect(service.findByTournament).toHaveBeenCalledWith(4);
    expect(service.findOne).toHaveBeenCalledWith(4, 5);
    expect(service.findMatches).toHaveBeenCalledWith(4, 5);
    expect(service.update).toHaveBeenCalledWith(4, 5, { name: 'Nueva' });
    expect(service.remove).toHaveBeenCalledWith(4, 5);
  });

  it('keeps the controller path relative to the global negocio prefix', () => {
    expect(Reflect.getMetadata(PATH_METADATA, FinalPhasesController))
      .toBe('tournaments/:tournamentId/final-phases');
  });

  it.each([
    ['create', RequestMethod.POST, '/'],
    ['findByTournament', RequestMethod.GET, '/'],
    ['findOne', RequestMethod.GET, ':id'],
    ['findMatches', RequestMethod.GET, ':id/matches'],
    ['update', RequestMethod.PATCH, ':id'],
    ['remove', RequestMethod.DELETE, ':id'],
  ] as const)('exposes %s with the intended method and without Public', (name, method, path) => {
    const handler = controller[name];
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(method);
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(path);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, FinalPhasesController)).not.toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).not.toBe(true);
  });

  it('accepts a name and an order and never a type or tournament', async () => {
    await expect(errorsOf(CreateFinalPhaseDto, { name: 'Final', order: 3 })).resolves.toBe(0);
    for (const bad of [
      {}, { name: 'Final' }, { order: 3 }, { name: '   ', order: 3 }, { name: 'F', order: 0 },
      { name: 'F', order: 1.5 }, { name: 'F', order: 1, type: 'groups' }, { name: 'F', order: 1, tournamentId: 2 },
    ]) {
      expect(await errorsOf(CreateFinalPhaseDto, bad)).toBeGreaterThan(0);
    }
  });

  it('allows partial updates but never changing the type or the tournament', async () => {
    await expect(errorsOf(UpdateFinalPhaseDto, { order: 4 })).resolves.toBe(0);
    await expect(errorsOf(UpdateFinalPhaseDto, { name: 'Nueva' })).resolves.toBe(0);
    await expect(errorsOf(UpdateFinalPhaseDto, { name: null })).resolves.toBeGreaterThan(0);
    await expect(errorsOf(UpdateFinalPhaseDto, { type: 'groups' })).resolves.toBeGreaterThan(0);
    await expect(errorsOf(UpdateFinalPhaseDto, { tournamentId: 2 })).resolves.toBeGreaterThan(0);
  });
});
