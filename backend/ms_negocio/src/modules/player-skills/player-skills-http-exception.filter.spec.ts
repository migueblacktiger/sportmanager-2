import { ArgumentsHost } from '@nestjs/common';
import {
  PlayerSkillAlreadyExistsError,
  PlayerSkillAssociationNotFoundError,
  PlayerSkillInvalidIdError,
  PlayerSkillPlayerNotFoundError,
  PlayerSkillReferenceNotFoundError,
  PlayerSkillSkillNotFoundError,
} from './player-skill.errors';
import { PlayerSkillsHttpExceptionFilter } from './player-skills-http-exception.filter';

describe('PlayerSkillsHttpExceptionFilter', () => {
  let filter: PlayerSkillsHttpExceptionFilter;
  const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };

  beforeEach(() => {
    jest.resetAllMocks();
    response.status.mockReturnThis();
    filter = new PlayerSkillsHttpExceptionFilter();
  });

  function apply(error: Error): void {
    const host = {
      switchToHttp: () => ({ getResponse: () => response }),
    } as unknown as ArgumentsHost;
    filter.catch(error as PlayerSkillInvalidIdError, host);
  }

  it('maps invalid IDs to 400', () => {
    apply(new PlayerSkillInvalidIdError());
    expect(response.status).toHaveBeenCalledWith(400);
  });

  it.each([
    new PlayerSkillPlayerNotFoundError(12),
    new PlayerSkillSkillNotFoundError(5),
    new PlayerSkillAssociationNotFoundError(12, 5),
    new PlayerSkillReferenceNotFoundError(),
  ])('maps missing entities and associations to 404', error => {
    apply(error);
    expect(response.status).toHaveBeenCalledWith(404);
  });

  it('maps duplicate associations to 409', () => {
    apply(new PlayerSkillAlreadyExistsError());
    expect(response.status).toHaveBeenCalledWith(409);
  });
});
