import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { MatchResultsHttpExceptionFilter } from './match-results-http-exception.filter';
import {
  MatchResultsAnnotationNotFoundError,
  MatchResultsInputInvalidError,
  MatchResultsPlayerNotInMatchError,
  MatchResultsTeamNotParticipantError,
} from './match-results.errors';

describe('MatchResultsHttpExceptionFilter', () => {
  const filter = new MatchResultsHttpExceptionFilter();

  it.each([
    [new MatchResultsInputInvalidError('mal'), HttpStatus.BAD_REQUEST],
    [new MatchResultsTeamNotParticipantError(9, 5), HttpStatus.BAD_REQUEST],
    [new MatchResultsAnnotationNotFoundError(3, 5), HttpStatus.NOT_FOUND],
    [new MatchResultsPlayerNotInMatchError(20, 5), HttpStatus.CONFLICT],
  ])('maps %p to its HTTP status', (error, status) => {
    const json = jest.fn();
    const response = { status: jest.fn().mockReturnValue({ json }) };
    filter.catch(error, { switchToHttp: () => ({ getResponse: () => response }) } as unknown as ArgumentsHost);
    expect(response.status).toHaveBeenCalledWith(status);
    expect(json).toHaveBeenCalledWith({ statusCode: status, message: error.message });
  });
});
