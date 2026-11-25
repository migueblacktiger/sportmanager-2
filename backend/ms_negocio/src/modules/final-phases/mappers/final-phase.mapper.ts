import { Injectable } from '@nestjs/common';
import { PhaseType } from '../../tournament-phases/dto/phase-type';
import { TournamentPhase } from '../../tournament-phases/entities/tournament-phase.entity';
import { CreateFinalPhaseDto } from '../dto/create-final-phase.dto';
import { FinalPhaseResponseDto } from '../dto/final-phase-response.dto';
import { UpdateFinalPhaseDto } from '../dto/update-final-phase.dto';

@Injectable()
export class FinalPhaseMapper {
  toEntity(tournamentId: number, dto: CreateFinalPhaseDto): TournamentPhase {
    const phase = new TournamentPhase();
    phase.tournamentId = tournamentId;
    phase.name = dto.name.trim();
    phase.type = PhaseType.Final;
    phase.phaseOrder = dto.order;
    return phase;
  }

  // Solo nombre y orden: el tipo y el torneo de la fase nunca cambian desde este modulo.
  mergeEntity(entity: TournamentPhase, dto: UpdateFinalPhaseDto): TournamentPhase {
    if (dto.name !== undefined) entity.name = dto.name.trim();
    if (dto.order !== undefined) entity.phaseOrder = dto.order;
    return entity;
  }

  toResponseDto(entity: TournamentPhase, matchCount: number): FinalPhaseResponseDto {
    return {
      id: entity.id,
      tournamentId: entity.tournamentId,
      name: entity.name,
      type: PhaseType.Final,
      order: entity.phaseOrder,
      matchCount,
    };
  }

  toResponseDtoList(
    entities: TournamentPhase[],
    matchCounts: Map<number, number>,
  ): FinalPhaseResponseDto[] {
    return entities.map(entity => this.toResponseDto(entity, matchCounts.get(entity.id) ?? 0));
  }
}
