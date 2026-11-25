import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import {
  FinalPhaseHasDependenciesError,
  FinalPhaseHasMatchesError,
  FinalPhaseInputInvalidError,
  FinalPhaseNotFoundError,
  FinalPhaseOrderLockedError,
  FinalPhaseOrderTakenError,
  FinalPhaseReferenceConflictError,
  FinalPhaseTournamentNotFoundError,
} from './final-phase.errors';

type FinalPhaseError =
  | FinalPhaseHasDependenciesError
  | FinalPhaseHasMatchesError
  | FinalPhaseInputInvalidError
  | FinalPhaseNotFoundError
  | FinalPhaseOrderLockedError
  | FinalPhaseOrderTakenError
  | FinalPhaseReferenceConflictError
  | FinalPhaseTournamentNotFoundError;

@Catch(
  FinalPhaseHasDependenciesError,
  FinalPhaseHasMatchesError,
  FinalPhaseInputInvalidError,
  FinalPhaseNotFoundError,
  FinalPhaseOrderLockedError,
  FinalPhaseOrderTakenError,
  FinalPhaseReferenceConflictError,
  FinalPhaseTournamentNotFoundError,
)
export class FinalPhasesHttpExceptionFilter implements ExceptionFilter {
  catch(exception: FinalPhaseError, host: ArgumentsHost): void {
    const status = exception instanceof FinalPhaseInputInvalidError
      ? HttpStatus.BAD_REQUEST
      : exception instanceof FinalPhaseNotFoundError
        || exception instanceof FinalPhaseTournamentNotFoundError
        ? HttpStatus.NOT_FOUND
        : HttpStatus.CONFLICT;
    const response = host.switchToHttp().getResponse<Response>();
    response.status(status).json({ statusCode: status, message: exception.message });
  }
}
