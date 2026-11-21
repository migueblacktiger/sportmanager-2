import { RequestMethod } from '@nestjs/common';
import { HTTP_CODE_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { SkillResponseDto } from './dto/skill-response.dto';
import { SkillsController } from './skills.controller';
import { SkillsService } from './skills.service';
import { SkillAlreadyExistsError, SkillNotFoundError } from './skills.errors';

describe('SkillsController', () => {
  let controller: SkillsController;
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const skill: SkillResponseDto = { id: 1, name: 'Velocidad', description: null };

  beforeEach(() => {
    jest.resetAllMocks();
    controller = new SkillsController(service as unknown as SkillsService);
  });

  it('delegates create, list, detail and update to the service', async () => {
    service.create.mockResolvedValue(skill);
    service.findAll.mockResolvedValue([skill]);
    service.findOne.mockResolvedValue(skill);
    service.update.mockResolvedValue(skill);

    await expect(controller.create({ name: 'Velocidad' })).resolves.toEqual(skill);
    await expect(controller.findAll()).resolves.toEqual([skill]);
    await expect(controller.findOne(1)).resolves.toEqual(skill);
    await expect(controller.update(1, { description: 'Rapidez' })).resolves.toEqual(skill);
    expect(service.create).toHaveBeenCalledWith({ name: 'Velocidad' });
    expect(service.update).toHaveBeenCalledWith(1, { description: 'Rapidez' });
  });

  it('returns no body from delete and declares HTTP 204', async () => {
    service.remove.mockResolvedValue(undefined);

    await expect(controller.remove(1)).resolves.toBeUndefined();
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, controller.remove)).toBe(204);
  });

  it('exposes the required routes without marking them public', () => {
    expect(Reflect.getMetadata(PATH_METADATA, SkillsController)).toBe('habilidades');
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, SkillsController)).not.toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, SkillsController.prototype.create)).not.toBe(true);
    expect(Reflect.getMetadata(METHOD_METADATA, controller.create)).toBe(RequestMethod.POST);
    expect(Reflect.getMetadata(METHOD_METADATA, controller.findAll)).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(PATH_METADATA, controller.findOne)).toBe(':id');
    expect(Reflect.getMetadata(METHOD_METADATA, controller.update)).toBe(RequestMethod.PATCH);
    expect(Reflect.getMetadata(METHOD_METADATA, controller.remove)).toBe(RequestMethod.DELETE);
  });

  it('propagates application errors to the HTTP exception filter', async () => {
    service.findOne.mockRejectedValue(new SkillNotFoundError(99));
    service.create.mockRejectedValue(new SkillAlreadyExistsError());

    await expect(controller.findOne(99)).rejects.toBeInstanceOf(SkillNotFoundError);
    await expect(controller.create({ name: 'Velocidad' })).rejects.toBeInstanceOf(SkillAlreadyExistsError);
  });
});
