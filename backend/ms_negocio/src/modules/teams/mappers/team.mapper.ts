import { Injectable } from '@nestjs/common';
import { CreateTeamDto } from '../dto/create-team.dto';
import { TeamResponseDto } from '../dto/team-response.dto';
import { UpdateTeamDto } from '../dto/update-team.dto';
import { Team } from '../entities/team.entity';

@Injectable()
export class TeamMapper {
  toEntity(dto: CreateTeamDto): Team {
    const team = new Team();
    team.name = dto.name;
    team.description = dto.description ?? null;
    // The active value is populated by the database default on persistence.
    return team;
  }

  mergeEntity(entity: Team, dto: UpdateTeamDto): Team {
    if (dto.name !== undefined) entity.name = dto.name;
    if (dto.description !== undefined) entity.description = dto.description;
    if (dto.active !== undefined) entity.active = dto.active;
    return entity;
  }

  toResponseDto(entity: Team): TeamResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      active: entity.active,
    };
  }

  toResponseDtoList(entities: Team[]): TeamResponseDto[] {
    return entities.map((entity) => this.toResponseDto(entity));
  }
}
