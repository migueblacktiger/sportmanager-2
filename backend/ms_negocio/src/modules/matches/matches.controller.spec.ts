import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { CreateMatchDto } from './dto/create-match.dto';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';

describe('MatchesController', () => {
  const service = { create: jest.fn(), findByPhase: jest.fn(), findOne: jest.fn(), remove: jest.fn() };
  let controller: MatchesController;

  beforeEach(() => {
    jest.resetAllMocks();
    controller = new MatchesController(service as unknown as MatchesService);
  });

  it('delegates every operation to the service', async () => {
    const dto = { homeTeamId: 1, awayTeamId: 2, scheduledAt: '2027-01-10T15:00:00Z' };
    await controller.create(7, dto, 'Bearer abc');
    await controller.findByPhase(7);
    await controller.findOne(3);
    await controller.remove(3);
    expect(service.create).toHaveBeenCalledWith(7, dto, 'Bearer abc');
    expect(service.findByPhase).toHaveBeenCalledWith(7);
    expect(service.findOne).toHaveBeenCalledWith(3);
    expect(service.remove).toHaveBeenCalledWith(3);
  });

  it('declares the match routes and leaves them protected', () => {
    const routes = [
      ['create', RequestMethod.POST, 'phases/:phaseId/matches'],
      ['findByPhase', RequestMethod.GET, 'phases/:phaseId/matches'],
      ['findOne', RequestMethod.GET, 'matches/:id'],
      ['remove', RequestMethod.DELETE, 'matches/:id'],
    ] as const;
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, MatchesController)).not.toBe(true);
    for (const [name, method, path] of routes) {
      expect(Reflect.getMetadata(METHOD_METADATA, controller[name])).toBe(method);
      expect(Reflect.getMetadata(PATH_METADATA, controller[name])).toBe(path);
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, controller[name])).not.toBe(true);
    }
  });

  it('validates the match payload', async () => {
    const errors = async (plain: unknown): Promise<number> => (
      await validate(plainToInstance(CreateMatchDto, plain) as object, {
        whitelist: true, forbidNonWhitelisted: true,
      })
    ).length;
    const valid = { homeTeamId: 1, awayTeamId: 2, scheduledAt: '2027-01-10T15:00:00Z' };
    await expect(errors(valid)).resolves.toBe(0);
    await expect(errors({ ...valid, scheduledAt: '2027-01-10T15:00:00-05:00' })).resolves.toBe(0);
    await expect(errors({ ...valid, venueId: 5 })).resolves.toBe(0);
    const bad = [
      {},
      { ...valid, homeTeamId: 0 },
      { ...valid, awayTeamId: 1.5 },
      { ...valid, homeTeamId: '1' },
      { ...valid, scheduledAt: '2027-01-10T15:00:00' },
      { ...valid, scheduledAt: 'ayer' },
      { ...valid, venueId: 0 },
      { ...valid, phaseId: 7 },
    ];
    for (const plain of bad) expect(await errors(plain)).toBeGreaterThan(0);
  });
});
