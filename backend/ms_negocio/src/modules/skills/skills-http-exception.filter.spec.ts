import { ArgumentsHost } from '@nestjs/common';
import { SkillAlreadyExistsError, SkillInUseError, SkillNotFoundError } from './skills.errors';
import { SkillsHttpExceptionFilter } from './skills-http-exception.filter';

describe('SkillsHttpExceptionFilter', () => {
  let filter: SkillsHttpExceptionFilter;
  let response: { status: jest.Mock; json: jest.Mock };

  beforeEach(() => {
    filter = new SkillsHttpExceptionFilter();
    response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  });

  function apply(error: SkillNotFoundError | SkillAlreadyExistsError | SkillInUseError): void {
    const host = {
      switchToHttp: () => ({ getResponse: () => response }),
    } as unknown as ArgumentsHost;
    filter.catch(error, host);
  }

  it('maps a missing skill to HTTP 404', () => {
    const error = new SkillNotFoundError(8);
    apply(error);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ statusCode: 404, message: error.message });
  });

  it.each([
    new SkillAlreadyExistsError(),
    new SkillInUseError(8),
  ])('maps duplicate and in-use errors to HTTP 409', (error) => {
    apply(error);

    expect(response.status).toHaveBeenCalledWith(409);
    expect(response.json).toHaveBeenCalledWith({ statusCode: 409, message: error.message });
  });
});
