import { BadRequestException, RequestMethod, ValidationPipe } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { CreateTeamSportDto } from './dto/create-team-sport.dto';
import { TeamSportsController } from './team-sports.controller';

describe('TeamSportsController HTTP contract', () => {
  it('uses a relative path so negocio is applied only once', () => {
    expect(Reflect.getMetadata(PATH_METADATA, TeamSportsController)).toBe('team-sports');
  });

  it.each([
    ['create', RequestMethod.POST, '/'],
    ['findByTeam', RequestMethod.GET, 'teams/:teamId'],
    ['findBySport', RequestMethod.GET, 'sports/:sportId'],
    ['remove', RequestMethod.DELETE, ':teamId/:sportId'],
  ] as const)('protects %s and exposes its intended route', (name, method, path) => {
    const handler = TeamSportsController.prototype[name];
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(method);
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(path);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, TeamSportsController)).not.toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).not.toBe(true);
  });

  it.each([
    {}, { teamId: 2, sportId: null }, { teamId: '2', sportId: 3 },
    { teamId: 2, sportId: 0 }, { teamId: -1, sportId: 3 },
    { teamId: 2, sportId: 3, userId: 1 },
  ])('rejects invalid or extra body fields %j with the global pipe settings', async (body) => {
    const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
    await expect(pipe.transform(body, { type: 'body', metatype: CreateTeamSportDto })).rejects.toBeInstanceOf(BadRequestException);
  });
});
