import { BadRequestException, ParseIntPipe, RequestMethod, ValidationPipe } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { CreatePlayerTeamDto } from './dto/create-player-team.dto';
import { PlayerTeamQueryDto } from './dto/player-team-query.dto';
import { PlayerTeamStatus } from './dto/player-team-status';
import { PlayerTeamsController } from './player-teams.controller';
import { PlayerTeamsService } from './player-teams.service';

const dto = { playerId: 2, teamId: 3, startDate: '2026-11-01', endDate: '2026-11-30' };

describe('PlayerTeamsController', () => {
  let controller: PlayerTeamsController;
  const service = { create: jest.fn(), findByTeam: jest.fn(), findByPlayer: jest.fn(), finish: jest.fn() };
  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({ controllers: [PlayerTeamsController], providers: [{ provide: PlayerTeamsService, useValue: service }] }).compile();
    controller = module.get(PlayerTeamsController);
  });

  it('delegates creation', async () => {
    service.create.mockResolvedValue({ id: 7 });
    await expect(controller.create(dto)).resolves.toEqual({ id: 7 }); expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('delegates both history queries and their optional status filter', async () => {
    service.findByTeam.mockResolvedValue([]); service.findByPlayer.mockResolvedValue([]);
    await expect(controller.findByTeam(3, {})).resolves.toEqual([]);
    await expect(controller.findByPlayer(2, { status: PlayerTeamStatus.Finished })).resolves.toEqual([]);
    expect(service.findByTeam).toHaveBeenCalledWith(3, undefined);
    expect(service.findByPlayer).toHaveBeenCalledWith(2, PlayerTeamStatus.Finished);
  });

  it('finishes by contract ID without taking a client timestamp', async () => {
    service.finish.mockResolvedValue({ id: 7, finishedAt: '2026-11-22T15:00:00.000Z' });
    await expect(controller.finish(7)).resolves.toMatchObject({ id: 7 }); expect(service.finish).toHaveBeenCalledWith(7);
  });

  it('keeps the route relative to the global negocio prefix', () => {
    expect(Reflect.getMetadata(PATH_METADATA, PlayerTeamsController)).toBe('player-teams');
  });

  it.each([
    ['create', RequestMethod.POST, '/'], ['findByTeam', RequestMethod.GET, 'teams/:teamId'],
    ['findByPlayer', RequestMethod.GET, 'players/:playerId'], ['finish', RequestMethod.PATCH, ':id/finish'],
  ] as const)('protects and registers %s', (method, http, path) => {
    expect(Reflect.getMetadata(METHOD_METADATA, controller[method])).toBe(http);
    expect(Reflect.getMetadata(PATH_METADATA, controller[method])).toBe(path);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, PlayerTeamsController)).not.toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, controller[method])).not.toBe(true);
  });
});

describe('PlayerTeams HTTP input validation', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const create = (body: unknown) => pipe.transform(body, { type: 'body', metatype: CreatePlayerTeamDto });

  it('accepts only the public create fields', async () => {
    await expect(create(dto)).resolves.toEqual(dto);
  });

  it.each(['finishedAt', 'status', 'id', 'active'])('rejects caller-controlled %s', async key => {
    await expect(create({ ...dto, [key]: 'unexpected' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([{ playerId: '2' }, { teamId: 0 }, { startDate: null }, { endDate: '2026-02-30' }, { startDate: '2026-11-01T00:00:00Z' }])('rejects malformed body %j', async invalid => {
    await expect(create({ ...dto, ...invalid })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('validates status queries including unknown parameters', async () => {
    await expect(pipe.transform({ status: 'vigente' }, { type: 'query', metatype: PlayerTeamQueryDto })).resolves.toMatchObject({ status: 'vigente' });
    for (const invalid of [{ status: 'otro' }, { status: null }, { ignored: 'value' }]) {
      await expect(pipe.transform(invalid, { type: 'query', metatype: PlayerTeamQueryDto })).rejects.toBeInstanceOf(BadRequestException);
    }
  });

  it('rejects non-integer route identifiers through ParseIntPipe', async () => {
    await expect(new ParseIntPipe().transform('2.4', { type: 'param' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
