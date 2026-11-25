import { Injectable } from '@nestjs/common';
import { TournamentPhaseInputDto } from '../dto/tournament-phase-input.dto';
import { TournamentPhaseResponseDto } from '../dto/tournament-phase-response.dto';
import { UpdateTournamentPhaseDto } from '../dto/update-tournament-phase.dto';
import { TournamentPhase } from '../entities/tournament-phase.entity';

@Injectable()
export class TournamentPhaseMapper {
  toEntity(tournamentId: number, dto: TournamentPhaseInputDto): TournamentPhase {
    const phase = new TournamentPhase();
    phase.tournamentId = tournamentId;
    phase.name = dto.name.trim();
    phase.type = dto.type;
    phase.phaseOrder = dto.order;
    return phase;
  }

  mergeEntity(entity: TournamentPhase, dto: UpdateTournamentPhaseDto): TournamentPhase {
    if (dto.name !== undefined) entity.name = dto.name.trim();
    if (dto.type !== undefined) entity.type = dto.type;
    if (dto.order !== undefined) entity.phaseOrder = dto.order;
    return entity;
  }

  toResponseDto(entity: TournamentPhase): TournamentPhaseResponseDto {
    return {
      id: entity.id,
      tournamentId: entity.tournamentId,
      name: entity.name,
      type: entity.type,
      order: entity.phaseOrder,
    };
  }

  toResponseDtoList(entities: TournamentPhase[]): TournamentPhaseResponseDto[] {
    return entities.map(entity => this.toResponseDto(entity));
  }
}
