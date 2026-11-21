import { Injectable } from '@nestjs/common';
import { Team } from '../../teams/entities/team.entity';
import { Sport } from '../../sports/entities/sport.entity';
import { TeamMapper } from '../../teams/mappers/team.mapper';
import { SportMapper } from '../../sports/mappers/sport.mapper';
import { CreateTeamSportDto } from '../dto/create-team-sport.dto';
import { TeamSportResponseDto } from '../dto/team-sport-response.dto';
import { TeamSport } from '../entities/team-sport.entity';

@Injectable()
export class TeamSportMapper {
  constructor(private readonly teamMapper: TeamMapper, private readonly sportMapper: SportMapper) {}

  toEntity(dto: CreateTeamSportDto, team: Team, sport: Sport): TeamSport {
    const association = new TeamSport();
    association.teamId = dto.teamId;
    association.sportId = dto.sportId;
    association.team = team;
    association.sport = sport;
    return association;
  }

  toResponseDto(entity: TeamSport): TeamSportResponseDto {
    return {
      id: entity.id,
      teamId: entity.teamId,
      sportId: entity.sportId,
      team: this.teamMapper.toResponseDto(entity.team),
      sport: this.sportMapper.toResponseDto(entity.sport),
    };
  }

  toResponseDtoList(entities: TeamSport[]): TeamSportResponseDto[] {
    return entities.map(entity => this.toResponseDto(entity));
  }
}
