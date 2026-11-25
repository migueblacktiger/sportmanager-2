import { MatchStatus } from './dto/match-status';
import {
  MatchManagementAttendanceNotAllowedError,
  MatchManagementAttendanceNotFoundError,
  MatchManagementMatchNotFoundError,
} from './match-management.errors';
import { MatchManagementMapper } from './mappers/match-management.mapper';
import { MatchAttendancesService } from './match-attendances.service';
import { MatchAttendancesRepository } from './repositories/match-attendances.repository';

describe('MatchAttendancesService', () => {
  const unitOfWork = { findMatchForUpdate: jest.fn(), findDetail: jest.fn(), insert: jest.fn() };
  const repository = {
    transaction: jest.fn(), findMatch: jest.fn(), findByMatch: jest.fn(), remove: jest.fn(),
  };
  let service: MatchAttendancesService;

  beforeEach(() => {
    jest.resetAllMocks();
    repository.transaction.mockImplementation(
      (_matchId: number, _fanId: number, work: (tx: typeof unitOfWork) => Promise<unknown>) => work(unitOfWork),
    );
    unitOfWork.findMatchForUpdate.mockResolvedValue({ id: 1 });
    unitOfWork.findDetail.mockResolvedValue({ status: MatchStatus.Finished });
    unitOfWork.insert.mockResolvedValue({ id: 4, matchId: 1, fanId: 8 });
    repository.findMatch.mockResolvedValue({ id: 1 });
    service = new MatchAttendancesService(
      repository as unknown as MatchAttendancesRepository, new MatchManagementMapper(),
    );
  });

  it('registers the attendance of a fan in a finished match', async () => {
    await expect(service.register(1, { fanId: 8 })).resolves.toEqual({ id: 4, matchId: 1, fanId: 8 });
  });

  it('only accepts matches in play or finished (legacy matches count as scheduled)', async () => {
    unitOfWork.findDetail.mockResolvedValue(null);
    await expect(service.register(1, { fanId: 8 })).rejects.toBeInstanceOf(MatchManagementAttendanceNotAllowedError);
    unitOfWork.findDetail.mockResolvedValue({ status: MatchStatus.Cancelled });
    await expect(service.register(1, { fanId: 8 })).rejects.toBeInstanceOf(MatchManagementAttendanceNotAllowedError);
  });

  it('returns 404 for a missing match and for a missing attendance', async () => {
    unitOfWork.findMatchForUpdate.mockResolvedValue(null);
    await expect(service.register(1, { fanId: 8 })).rejects.toBeInstanceOf(MatchManagementMatchNotFoundError);
    repository.remove.mockResolvedValue(false);
    await expect(service.remove(1, 8)).rejects.toBeInstanceOf(MatchManagementAttendanceNotFoundError);
  });
});
