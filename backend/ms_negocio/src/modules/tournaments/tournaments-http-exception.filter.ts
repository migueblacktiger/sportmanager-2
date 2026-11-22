import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  TournamentDatesInvalidError,
  TournamentHasDependenciesError,
  TournamentHasRegistrationsError,
  TournamentNotFoundError,
  TournamentSportNotFoundError,
} from './tournament.errors';

@Catch(
  TournamentDatesInvalidError,
  TournamentHasDependenciesError,
  TournamentHasRegistrationsError,
  TournamentNotFoundError,
  TournamentSportNotFoundError,
)
export class TournamentsHttpExceptionFilter implements ExceptionFilter {
  catch(
    exception:
      | TournamentDatesInvalidError
      | TournamentHasDependenciesError
      | TournamentHasRegistrationsError
      | TournamentNotFoundError
      | TournamentSportNotFoundError,
    host: ArgumentsHost,
  ): void {
    const status = exception instanceof TournamentDatesInvalidError
      ? HttpStatus.BAD_REQUEST
      : exception instanceof TournamentHasDependenciesError
        || exception instanceof TournamentHasRegistrationsError
        ? HttpStatus.CONFLICT
        : HttpStatus.NOT_FOUND;
    const response = host.switchToHttp().getResponse<Response>();
    response.status(status).json({ statusCode: status, message: exception.message });
  }
}
