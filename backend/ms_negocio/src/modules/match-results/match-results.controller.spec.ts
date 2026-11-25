import { BadRequestException, RequestMethod, ValidationPipe } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { CreateMatchAnnotationDto } from './dto/create-match-annotation.dto';
import { CreateMatchResultDto } from './dto/create-match-result.dto';
import { UpdateMatchAnnotationDto } from './dto/update-match-annotation.dto';
import { UpdateMatchResultDto } from './dto/update-match-result.dto';
import { MatchAnnotationsController } from './match-annotations.controller';
import { MatchAnnotationsService } from './match-annotations.service';
import { MatchResultsController } from './match-results.controller';
import { MatchResultsService } from './match-results.service';

describe('Match results controllers', () => {
  const results = { create: jest.fn(), findOne: jest.fn(), update: jest.fn() };
  const annotations = { create: jest.fn(), findAll: jest.fn(), findOne: jest.fn(), update: jest.fn(), remove: jest.fn() };
  const resultsController = new MatchResultsController(results as unknown as MatchResultsService);
  const annotationsController = new MatchAnnotationsController(annotations as unknown as MatchAnnotationsService);

  beforeEach(() => jest.resetAllMocks());

  it('delegates results, forwarding the Authorization header where notifications may be sent', async () => {
    const dto = { scores: [{ teamId: 1, score: 2 }, { teamId: 2, score: 0 }], finalize: true };
    await resultsController.create(1, 5, dto, 'Bearer t');
    await resultsController.findOne(1, 5);
    await resultsController.update(1, 5, { finalize: true }, 'Bearer t');
    expect(results.create).toHaveBeenCalledWith(1, 5, dto, 'Bearer t');
    expect(results.findOne).toHaveBeenCalledWith(1, 5);
    expect(results.update).toHaveBeenCalledWith(1, 5, { finalize: true }, 'Bearer t');
  });

  it('delegates annotations', async () => {
    await annotationsController.create(1, 5, { playerId: 20 }, 'Bearer t');
    await annotationsController.findAll(1, 5);
    await annotationsController.findOne(1, 5, 3);
    await annotationsController.update(1, 5, 3, { minute: 4 });
    await annotationsController.remove(1, 5, 3);
    expect(annotations.create).toHaveBeenCalledWith(1, 5, { playerId: 20 }, 'Bearer t');
    expect(annotations.findAll).toHaveBeenCalledWith(1, 5);
    expect(annotations.findOne).toHaveBeenCalledWith(1, 5, 3);
    expect(annotations.update).toHaveBeenCalledWith(1, 5, 3, { minute: 4 });
    expect(annotations.remove).toHaveBeenCalledWith(1, 5, 3);
  });

  it('keeps every route protected and exposes the expected verbs and paths', () => {
    const route = (controller: object, name: string) => {
      const handler = (controller as Record<string, unknown>)[name] as object;
      return [Reflect.getMetadata(METHOD_METADATA, handler), Reflect.getMetadata(PATH_METADATA, handler)];
    };
    expect(Reflect.getMetadata(PATH_METADATA, MatchResultsController))
      .toBe('tournaments/:tournamentId/matches/:matchId/result');
    expect(Reflect.getMetadata(PATH_METADATA, MatchAnnotationsController))
      .toBe('tournaments/:tournamentId/matches/:matchId/annotations');
    expect(route(resultsController, 'create')).toEqual([RequestMethod.POST, '/']);
    expect(route(resultsController, 'update')).toEqual([RequestMethod.PATCH, '/']);
    expect(route(annotationsController, 'update')).toEqual([RequestMethod.PATCH, ':id']);
    expect(route(annotationsController, 'remove')).toEqual([RequestMethod.DELETE, ':id']);
    for (const controller of [MatchResultsController, MatchAnnotationsController]) {
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, controller)).toBeUndefined();
    }
  });
});

describe('Match results DTO validation', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const check = (metatype: new () => object, value: unknown) => pipe.transform(value, { type: 'body', metatype });
  const scores = [{ teamId: 1, score: 2 }, { teamId: 2, score: 0 }];

  it('accepts two scores with an optional finalize flag', async () => {
    await expect(check(CreateMatchResultDto, { scores })).resolves.toMatchObject({ scores });
    await expect(check(CreateMatchResultDto, { scores, finalize: true })).resolves.toMatchObject({ finalize: true });
    await expect(check(UpdateMatchResultDto, { finalize: true })).resolves.toMatchObject({ finalize: true });
  });

  it.each([
    {}, { scores: [] }, { scores: [scores[0]] }, { scores: [...scores, scores[0]] },
    { scores: [{ teamId: 1, score: -1 }, scores[1]] }, { scores: [{ teamId: 1, score: 1.5 }, scores[1]] },
    { scores: [{ teamId: 0, score: 1 }, scores[1]] }, { scores: [{ teamId: 1 }, scores[1]] },
    { scores: [{ teamId: 1, score: 1, extra: 1 }, scores[1]] }, { scores, finalize: 'yes' }, { scores, id: 4 },
  ])('rejects invalid result %j', async (value) => {
    await expect(check(CreateMatchResultDto, value)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts a minimal annotation and rejects invalid ones', async () => {
    await expect(check(CreateMatchAnnotationDto, { playerId: 3 })).resolves.toMatchObject({ playerId: 3 });
    await expect(check(CreateMatchAnnotationDto, {
      playerId: 3, teamId: 1, minute: 90, points: 3, description: 'Gol',
    })).resolves.toMatchObject({ minute: 90, points: 3 });
    for (const value of [
      {}, { playerId: 0 }, { playerId: null }, { playerId: 3, minute: -1 }, { playerId: 3, minute: 301 },
      { playerId: 3, points: 0 }, { playerId: 3, points: 101 }, { playerId: 3, description: '  ' },
      { playerId: 3, description: 'a'.repeat(256) }, { playerId: 3, matchId: 5 }, { playerId: 3, createdAt: 'x' },
    ]) {
      await expect(check(CreateMatchAnnotationDto, value)).rejects.toBeInstanceOf(BadRequestException);
    }
  });

  it('allows partial annotation updates and clearing minute and description', async () => {
    await expect(check(UpdateMatchAnnotationDto, {})).resolves.toEqual({});
    await expect(check(UpdateMatchAnnotationDto, { minute: null, description: null }))
      .resolves.toMatchObject({ minute: null, description: null });
    await expect(check(UpdateMatchAnnotationDto, { points: 0 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(check(UpdateMatchAnnotationDto, { matchId: 7 })).rejects.toBeInstanceOf(BadRequestException);
  });
});
