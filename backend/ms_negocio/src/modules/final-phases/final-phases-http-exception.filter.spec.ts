import { ArgumentsHost } from '@nestjs/common';
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
import { FinalPhasesHttpExceptionFilter } from './final-phases-http-exception.filter';

describe('FinalPhasesHttpExceptionFilter', () => {
  let filter: FinalPhasesHttpExceptionFilter;
  let response: { status: jest.Mock; json: jest.Mock };

  beforeEach(() => {
    filter = new FinalPhasesHttpExceptionFilter();
    response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  });

  function apply(error: Error): void {
    const host = {
      switchToHttp: () => ({ getResponse: () => response }),
    } as unknown as ArgumentsHost;
    filter.catch(error as FinalPhaseInputInvalidError, host);
  }

  it.each([
    ['invalid input', new FinalPhaseInputInvalidError(), 400],
    ['missing tournament', new FinalPhaseTournamentNotFoundError(1), 404],
    ['missing final phase', new FinalPhaseNotFoundError(1, 2), 404],
    ['order taken', new FinalPhaseOrderTakenError(3), 409],
    ['order locked by matches', new FinalPhaseOrderLockedError(1), 409],
    ['deletion blocked by matches', new FinalPhaseHasMatchesError(1), 409],
    ['deletion blocked by other data', new FinalPhaseHasDependenciesError(1), 409],
    ['reference conflict', new FinalPhaseReferenceConflictError(), 409],
  ] as const)('maps %s to its HTTP status', (_label, error, status) => {
    apply(error);
    expect(response.status).toHaveBeenCalledWith(status);
    expect(response.json).toHaveBeenCalledWith({ statusCode: status, message: error.message });
  });
});
