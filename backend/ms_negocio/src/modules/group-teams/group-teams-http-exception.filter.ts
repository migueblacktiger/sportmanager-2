import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import {
  GroupTeamDuplicateError,
  GroupTeamGroupNotFoundError,
  GroupTeamInputInvalidError,
  GroupTeamNotFoundError,
  GroupTeamPhaseTypeError,
  GroupTeamReferenceConflictError,
  GroupTeamTeamInactiveError,
  GroupTeamTeamInPhaseError,
  GroupTeamTeamNotFoundError,
  GroupTeamTeamNotRegisteredError,
} from './group-team.errors';

type GroupTeamError =
  | GroupTeamDuplicateError
  | GroupTeamGroupNotFoundError
  | GroupTeamInputInvalidError
  | GroupTeamNotFoundError
  | GroupTeamPhaseTypeError
  | GroupTeamReferenceConflictError
  | GroupTeamTeamInactiveError
  | GroupTeamTeamInPhaseError
  | GroupTeamTeamNotFoundError
  | GroupTeamTeamNotRegisteredError;

@Catch(
  GroupTeamDuplicateError,
  GroupTeamGroupNotFoundError,
  GroupTeamInputInvalidError,
  GroupTeamNotFoundError,
  GroupTeamPhaseTypeError,
  GroupTeamReferenceConflictError,
  GroupTeamTeamInactiveError,
  GroupTeamTeamInPhaseError,
  GroupTeamTeamNotFoundError,
  GroupTeamTeamNotRegisteredError,
)
export class GroupTeamsHttpExceptionFilter implements ExceptionFilter {
  catch(exception: GroupTeamError, host: ArgumentsHost): void {
    const status = exception instanceof GroupTeamInputInvalidError
      ? HttpStatus.BAD_REQUEST
      : exception instanceof GroupTeamGroupNotFoundError
        || exception instanceof GroupTeamTeamNotFoundError
        || exception instanceof GroupTeamNotFoundError
        ? HttpStatus.NOT_FOUND
        : HttpStatus.CONFLICT;
    const response = host.switchToHttp().getResponse<Response>();
    response.status(status).json({ statusCode: status, message: exception.message });
  }
}
