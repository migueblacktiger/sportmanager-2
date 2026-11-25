import { Injectable } from '@nestjs/common';
import { CompetitionGroupInputDto } from '../dto/competition-group-input.dto';
import { CompetitionGroupResponseDto } from '../dto/competition-group-response.dto';
import { UpdateCompetitionGroupDto } from '../dto/update-competition-group.dto';
import { CompetitionGroup } from '../entities/competition-group.entity';

@Injectable()
export class CompetitionGroupMapper {
  toEntity(phaseId: number, dto: CompetitionGroupInputDto): CompetitionGroup {
    const group = new CompetitionGroup();
    group.phaseId = phaseId;
    group.name = dto.name.trim();
    return group;
  }

  mergeEntity(entity: CompetitionGroup, dto: UpdateCompetitionGroupDto): CompetitionGroup {
    if (dto.name !== undefined) entity.name = dto.name.trim();
    return entity;
  }

  // Requiere la relacion phase cargada para informar el torneo.
  toResponseDto(entity: CompetitionGroup): CompetitionGroupResponseDto {
    return {
      id: entity.id,
      phaseId: entity.phaseId,
      tournamentId: entity.phase.tournamentId,
      name: entity.name,
    };
  }

  toResponseDtoList(entities: CompetitionGroup[]): CompetitionGroupResponseDto[] {
    return entities.map(entity => this.toResponseDto(entity));
  }
}
