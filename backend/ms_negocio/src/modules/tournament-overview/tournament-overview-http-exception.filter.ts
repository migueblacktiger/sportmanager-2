import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { TournamentOverviewNotFoundError } from './tournament-overview.errors';

@Catch(TournamentOverviewNotFoundError)
export class TournamentOverviewHttpExceptionFilter implements ExceptionFilter {
  catch(exception: TournamentOverviewNotFoundError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    response.status(HttpStatus.NOT_FOUND).json({ statusCode: HttpStatus.NOT_FOUND, message: exception.message });
  }
}
