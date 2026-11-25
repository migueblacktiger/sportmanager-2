import { Injectable } from '@nestjs/common';
import { PhaseType } from '../../tournament-phases/dto/phase-type';
import { CreateMatchDto } from '../dto/create-match.dto';
import { MatchResponseDto } from '../dto/match-response.dto';
import { Match } from '../entities/match.entity';

@Injectable()
export class MatchMapper {
  toEntity(phaseId: number, dto: CreateMatchDto): Match {
    const match = new Match();
    match.phaseId = phaseId;
    match.homeTeamId = dto.homeTeamId;
    match.awayTeamId = dto.awayTeamId;
    match.scheduledAt = new Date(dto.scheduledAt);
    return match;
  }

  // Requiere cargadas las relaciones phase, homeTeam y awayTeam.
  toResponseDto(entity: Match): MatchResponseDto {
    return {
      id: entity.id,
      phaseId: entity.phaseId,
      phaseName: entity.phase.name,
      phaseType: entity.phase.type,
      tournamentId: entity.phase.tournamentId,
      isFinalPhase: entity.phase.type === PhaseType.Final,
      homeTeamId: entity.homeTeamId,
      homeTeamName: entity.homeTeam.name,
      awayTeamId: entity.awayTeamId,
      awayTeamName: entity.awayTeam.name,
      scheduledAt: entity.scheduledAt.toISOString(),
    };
  }

  toResponseDtoList(entities: Match[]): MatchResponseDto[] {
    return entities.map(entity => this.toResponseDto(entity));
  }
}
