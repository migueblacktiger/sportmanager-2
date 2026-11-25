import { Injectable } from '@nestjs/common';
import { Match } from '../../matches/entities/match.entity';
import { PhaseType } from '../../tournament-phases/dto/phase-type';
import { CreateManagedMatchDto } from '../dto/create-managed-match.dto';
import { DEFAULT_MATCH_STATUS, MatchStatus } from '../dto/match-status';
import { ManagedMatchResponseDto } from '../dto/managed-match-response.dto';
import { MatchAttendance } from '../entities/match-attendance.entity';
import { MatchDetail } from '../entities/match-detail.entity';
import { AttendanceResponseDto } from '../dto/attendance-response.dto';

@Injectable()
export class MatchManagementMapper {
  toEntity(phaseId: number, dto: CreateManagedMatchDto): Match {
    const match = new Match();
    match.phaseId = phaseId;
    match.homeTeamId = dto.homeTeamId;
    match.awayTeamId = dto.awayTeamId;
    match.scheduledAt = new Date(dto.scheduledAt);
    return match;
  }

  toDetailEntity(matchId: number, status: MatchStatus, venueId: number | null): MatchDetail {
    const detail = new MatchDetail();
    detail.matchId = matchId;
    detail.status = status;
    detail.venueId = venueId;
    return detail;
  }

  /** Requiere cargadas phase, homeTeam y awayTeam; `detail` con su venue, o null si no existe. */
  toResponseDto(match: Match, detail: MatchDetail | null, attendanceCount: number): ManagedMatchResponseDto {
    const venue = detail?.venue ?? null;
    return {
      id: match.id,
      tournamentId: match.phase.tournamentId,
      phaseId: match.phaseId,
      phaseName: match.phase.name,
      phaseType: match.phase.type,
      isFinalPhase: match.phase.type === PhaseType.Final,
      homeTeamId: match.homeTeamId,
      homeTeamName: match.homeTeam.name,
      awayTeamId: match.awayTeamId,
      awayTeamName: match.awayTeam.name,
      scheduledAt: match.scheduledAt.toISOString(),
      status: detail?.status ?? DEFAULT_MATCH_STATUS,
      venue: venue ? { id: venue.id, name: venue.name, address: venue.address, active: venue.active } : null,
      attendanceCount,
    };
  }

  toResponseDtoList(
    matches: Match[],
    details: Map<number, MatchDetail>,
    counts: Map<number, number>,
  ): ManagedMatchResponseDto[] {
    return matches.map(match => this.toResponseDto(
      match, details.get(match.id) ?? null, counts.get(match.id) ?? 0,
    ));
  }

  toAttendanceDto(entity: MatchAttendance): AttendanceResponseDto {
    return { id: entity.id, matchId: entity.matchId, fanId: entity.fanId };
  }
}
