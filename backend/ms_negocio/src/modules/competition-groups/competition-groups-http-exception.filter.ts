import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import {
  CompetitionGroupHasTeamsError,
  CompetitionGroupInputInvalidError,
  CompetitionGroupNameTakenError,
  CompetitionGroupNotFoundError,
  CompetitionGroupPhaseNotFoundError,
  CompetitionGroupPhaseTypeError,
  CompetitionGroupReferenceConflictError,
  CompetitionGroupTournamentNotFoundError,
} from './competition-group.errors';

type GroupError =
  | CompetitionGroupHasTeamsError
  | CompetitionGroupInputInvalidError
  | CompetitionGroupNameTakenError
  | CompetitionGroupNotFoundError
  | CompetitionGroupPhaseNotFoundError
  | CompetitionGroupPhaseTypeError
  | CompetitionGroupReferenceConflictError
  | CompetitionGroupTournamentNotFoundError;

@Catch(
  CompetitionGroupHasTeamsError,
  CompetitionGroupInputInvalidError,
  CompetitionGroupNameTakenError,
  CompetitionGroupNotFoundError,
  CompetitionGroupPhaseNotFoundError,
  CompetitionGroupPhaseTypeError,
  CompetitionGroupReferenceConflictError,
  CompetitionGroupTournamentNotFoundError,
)
export class CompetitionGroupsHttpExceptionFilter implements ExceptionFilter {
  catch(exception: GroupError, host: ArgumentsHost): void {
    const status = exception instanceof CompetitionGroupInputInvalidError
      ? HttpStatus.BAD_REQUEST
      : exception instanceof CompetitionGroupNotFoundError
        || exception instanceof CompetitionGroupPhaseNotFoundError
        || exception instanceof CompetitionGroupTournamentNotFoundError
        ? HttpStatus.NOT_FOUND
        : HttpStatus.CONFLICT;
    const response = host.switchToHttp().getResponse<Response>();
    response.status(status).json({ statusCode: status, message: exception.message });
  }
}
