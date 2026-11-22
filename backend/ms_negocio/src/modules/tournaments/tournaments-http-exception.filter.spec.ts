import { ArgumentsHost } from '@nestjs/common';
import {
  TournamentDatesInvalidError,
  TournamentHasDependenciesError,
  TournamentNotFoundError,
  TournamentSportNotFoundError,
} from './tournament.errors';
import { TournamentsHttpExceptionFilter } from './tournaments-http-exception.filter';

describe('TournamentsHttpExceptionFilter', () => {
  let filter: TournamentsHttpExceptionFilter;
  let response: { status: jest.Mock; json: jest.Mock };

  beforeEach(() => {
    filter = new TournamentsHttpExceptionFilter();
    response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  });

  function apply(error: Error): void {
    const host = {
      switchToHttp: () => ({ getResponse: () => response }),
    } as unknown as ArgumentsHost;
    filter.catch(error as TournamentDatesInvalidError, host);
  }

  it('maps date validation to HTTP 400', () => {
    const error = new TournamentDatesInvalidError();
    apply(error);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ statusCode: 400, message: error.message });
  });

  it('maps a missing tournament or sport to HTTP 404', () => {
    for (const error of [new TournamentNotFoundError(2), new TournamentSportNotFoundError(3)]) {
      response.status.mockClear();
      response.json.mockClear();
      apply(error);
      expect(response.status).toHaveBeenCalledWith(404);
    }
  });

  it('maps dependent tournament deletion to HTTP 409', () => {
    const error = new TournamentHasDependenciesError(2);
    apply(error);
    expect(response.status).toHaveBeenCalledWith(409);
    expect(response.json).toHaveBeenCalledWith({ statusCode: 409, message: error.message });
  });
});
