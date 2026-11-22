import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import {
  TournamentRegistrationDuplicateError,
  TournamentRegistrationInputInvalidError,
  TournamentRegistrationNotFoundError,
  TournamentRegistrationReferenceConflictError,
  TournamentRegistrationSportMismatchError,
  TournamentRegistrationTeamNotFoundError,
  TournamentRegistrationTournamentNotFoundError,
  TournamentRegistrationTournamentStartedError,
  TournamentRegistrationWindowClosedError,
} from './tournament-registration.errors';

type RegistrationError =
  | TournamentRegistrationDuplicateError
  | TournamentRegistrationInputInvalidError
  | TournamentRegistrationNotFoundError
  | TournamentRegistrationReferenceConflictError
  | TournamentRegistrationSportMismatchError
  | TournamentRegistrationTeamNotFoundError
  | TournamentRegistrationTournamentNotFoundError
  | TournamentRegistrationTournamentStartedError
  | TournamentRegistrationWindowClosedError;

@Catch(
  TournamentRegistrationDuplicateError,
  TournamentRegistrationInputInvalidError,
  TournamentRegistrationNotFoundError,
  TournamentRegistrationReferenceConflictError,
  TournamentRegistrationSportMismatchError,
  TournamentRegistrationTeamNotFoundError,
  TournamentRegistrationTournamentNotFoundError,
  TournamentRegistrationTournamentStartedError,
  TournamentRegistrationWindowClosedError,
)
export class TournamentRegistrationsHttpExceptionFilter implements ExceptionFilter {
  catch(exception: RegistrationError, host: ArgumentsHost): void {
    const status = exception instanceof TournamentRegistrationInputInvalidError
      ? HttpStatus.BAD_REQUEST
      : exception instanceof TournamentRegistrationTeamNotFoundError
        || exception instanceof TournamentRegistrationTournamentNotFoundError
        || exception instanceof TournamentRegistrationNotFoundError
        ? HttpStatus.NOT_FOUND
        : HttpStatus.CONFLICT;
    const response = host.switchToHttp().getResponse<Response>();
    response.status(status).json({ statusCode: status, message: exception.message });
  }
}
