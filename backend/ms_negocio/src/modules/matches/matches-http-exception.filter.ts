import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import {
  MatchInputInvalidError,
  MatchNotFoundError,
  MatchPhaseNotFoundError,
  MatchReferenceConflictError,
  MatchTeamInactiveError,
  MatchTeamNotFoundError,
  MatchTeamNotRegisteredError,
} from './match.errors';

type MatchError =
  | MatchInputInvalidError
  | MatchNotFoundError
  | MatchPhaseNotFoundError
  | MatchReferenceConflictError
  | MatchTeamInactiveError
  | MatchTeamNotFoundError
  | MatchTeamNotRegisteredError;

@Catch(
  MatchInputInvalidError,
  MatchNotFoundError,
  MatchPhaseNotFoundError,
  MatchReferenceConflictError,
  MatchTeamInactiveError,
  MatchTeamNotFoundError,
  MatchTeamNotRegisteredError,
)
export class MatchesHttpExceptionFilter implements ExceptionFilter {
  catch(exception: MatchError, host: ArgumentsHost): void {
    const status = exception instanceof MatchInputInvalidError
      ? HttpStatus.BAD_REQUEST
      : exception instanceof MatchNotFoundError
        || exception instanceof MatchPhaseNotFoundError
        || exception instanceof MatchTeamNotFoundError
        ? HttpStatus.NOT_FOUND
        : HttpStatus.CONFLICT;
    const response = host.switchToHttp().getResponse<Response>();
    response.status(status).json({ statusCode: status, message: exception.message });
  }
}
