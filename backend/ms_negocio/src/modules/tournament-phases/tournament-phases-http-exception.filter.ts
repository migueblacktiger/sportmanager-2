import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import {
  TournamentPhaseHasDependenciesError,
  TournamentPhaseInputInvalidError,
  TournamentPhaseNotFoundError,
  TournamentPhaseOrderLockedError,
  TournamentPhaseOrderTakenError,
  TournamentPhaseReferenceConflictError,
  TournamentPhaseTournamentNotFoundError,
  TournamentPhaseFinalTypeLockedError,
  TournamentPhaseTypeLockedError,
} from './tournament-phase.errors';

type PhaseError =
  | TournamentPhaseHasDependenciesError
  | TournamentPhaseInputInvalidError
  | TournamentPhaseNotFoundError
  | TournamentPhaseOrderLockedError
  | TournamentPhaseOrderTakenError
  | TournamentPhaseReferenceConflictError
  | TournamentPhaseTournamentNotFoundError
  | TournamentPhaseFinalTypeLockedError
  | TournamentPhaseTypeLockedError;

@Catch(
  TournamentPhaseHasDependenciesError,
  TournamentPhaseInputInvalidError,
  TournamentPhaseNotFoundError,
  TournamentPhaseOrderLockedError,
  TournamentPhaseOrderTakenError,
  TournamentPhaseReferenceConflictError,
  TournamentPhaseTournamentNotFoundError,
  TournamentPhaseFinalTypeLockedError,
  TournamentPhaseTypeLockedError,
)
export class TournamentPhasesHttpExceptionFilter implements ExceptionFilter {
  catch(exception: PhaseError, host: ArgumentsHost): void {
    const status = exception instanceof TournamentPhaseInputInvalidError
      ? HttpStatus.BAD_REQUEST
      : exception instanceof TournamentPhaseNotFoundError
        || exception instanceof TournamentPhaseTournamentNotFoundError
        ? HttpStatus.NOT_FOUND
        : HttpStatus.CONFLICT;
    const response = host.switchToHttp().getResponse<Response>();
    response.status(status).json({ statusCode: status, message: exception.message });
  }
}
