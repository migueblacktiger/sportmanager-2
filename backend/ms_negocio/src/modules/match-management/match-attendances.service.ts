import { Injectable } from '@nestjs/common';
import { AttendanceResponseDto } from './dto/attendance-response.dto';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { ATTENDANCE_STATUSES, DEFAULT_MATCH_STATUS } from './dto/match-status';
import {
  MatchManagementAttendanceNotAllowedError,
  MatchManagementAttendanceNotFoundError,
  MatchManagementInputInvalidError,
  MatchManagementMatchNotFoundError,
} from './match-management.errors';
import { MatchManagementMapper } from './mappers/match-management.mapper';
import { MatchAttendancesRepository } from './repositories/match-attendances.repository';

const MAX_DATABASE_ID = 2147483647;

@Injectable()
export class MatchAttendancesService {
  constructor(
    private readonly repository: MatchAttendancesRepository,
    private readonly mapper: MatchManagementMapper,
  ) {}

  /** Registra la participacion de un aficionado (id de ms_security) en un partido en juego o finalizado. */
  async register(matchId: number, dto: CreateAttendanceDto): Promise<AttendanceResponseDto> {
    this.validateId(matchId);
    this.validateId(dto.fanId);
    return this.repository.transaction(matchId, dto.fanId, async unitOfWork => {
      if (!await unitOfWork.findMatchForUpdate(matchId)) throw new MatchManagementMatchNotFoundError(matchId);
      const status = (await unitOfWork.findDetail(matchId))?.status ?? DEFAULT_MATCH_STATUS;
      if (!ATTENDANCE_STATUSES.includes(status)) {
        throw new MatchManagementAttendanceNotAllowedError(matchId, status);
      }
      return this.mapper.toAttendanceDto(await unitOfWork.insert(matchId, dto.fanId));
    });
  }

  async findByMatch(matchId: number): Promise<AttendanceResponseDto[]> {
    this.validateId(matchId);
    if (!await this.repository.findMatch(matchId)) throw new MatchManagementMatchNotFoundError(matchId);
    return (await this.repository.findByMatch(matchId)).map(item => this.mapper.toAttendanceDto(item));
  }

  async remove(matchId: number, fanId: number): Promise<{ message: string }> {
    this.validateId(matchId);
    this.validateId(fanId);
    if (!await this.repository.findMatch(matchId)) throw new MatchManagementMatchNotFoundError(matchId);
    if (!await this.repository.remove(matchId, fanId)) {
      throw new MatchManagementAttendanceNotFoundError(matchId, fanId);
    }
    return { message: `Participacion del aficionado ${fanId} en el partido ${matchId} eliminada correctamente` };
  }

  private validateId(id: number): void {
    if (!Number.isSafeInteger(id) || id < 1 || id > MAX_DATABASE_ID) {
      throw new MatchManagementInputInvalidError(
        'El identificador debe ser un entero positivo de hasta 2147483647',
      );
    }
  }
}
