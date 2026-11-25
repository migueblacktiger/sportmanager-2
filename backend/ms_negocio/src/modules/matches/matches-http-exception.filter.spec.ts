import { ArgumentsHost } from '@nestjs/common';
import {
  MatchInputInvalidError,
  MatchNotFoundError,
  MatchPhaseNotFoundError,
  MatchReferenceConflictError,
  MatchTeamNotFoundError,
  MatchTeamNotRegisteredError,
} from './match.errors';
import { MatchesHttpExceptionFilter } from './matches-http-exception.filter';

describe('MatchesHttpExceptionFilter', () => {
  let filter: MatchesHttpExceptionFilter;
  let response: { status: jest.Mock; json: jest.Mock };

  beforeEach(() => {
    filter = new MatchesHttpExceptionFilter();
    response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  });

  function apply(error: Error): void {
    const host = {
      switchToHttp: () => ({ getResponse: () => response }),
    } as unknown as ArgumentsHost;
    filter.catch(error as MatchInputInvalidError, host);
  }

  it.each([
    ['invalid input', new MatchInputInvalidError(), 400],
    ['missing match', new MatchNotFoundError(1), 404],
    ['missing phase', new MatchPhaseNotFoundError(1), 404],
    ['missing team', new MatchTeamNotFoundError(1), 404],
    ['team not registered', new MatchTeamNotRegisteredError(1, 2), 409],
    ['reference conflict', new MatchReferenceConflictError(), 409],
  ] as const)('maps %s to its HTTP status', (_label, error, status) => {
    apply(error);
    expect(response.status).toHaveBeenCalledWith(status);
    expect(response.json).toHaveBeenCalledWith({ statusCode: status, message: error.message });
  });
});
