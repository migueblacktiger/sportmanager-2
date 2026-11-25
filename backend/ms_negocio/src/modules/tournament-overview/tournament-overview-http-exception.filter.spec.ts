import { ArgumentsHost } from '@nestjs/common';
import { TournamentOverviewHttpExceptionFilter } from './tournament-overview-http-exception.filter';
import { TournamentOverviewNotFoundError } from './tournament-overview.errors';

describe('TournamentOverviewHttpExceptionFilter', () => {
  it('maps a missing tournament to HTTP 404', () => {
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const host = { switchToHttp: () => ({ getResponse: () => response }) } as unknown as ArgumentsHost;
    const error = new TournamentOverviewNotFoundError(9);
    new TournamentOverviewHttpExceptionFilter().catch(error, host);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ statusCode: 404, message: error.message });
  });
});
