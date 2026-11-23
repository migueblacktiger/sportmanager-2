import { Injectable } from '@nestjs/common';
import { Player } from '../../players/entities/player.entity';
import { PlayerMapper } from '../../players/mappers/player.mapper';
import { Team } from '../../teams/entities/team.entity';
import { TeamMapper } from '../../teams/mappers/team.mapper';
import { CreatePlayerTeamDto } from '../dto/create-player-team.dto';
import { PlayerTeamResponseDto } from '../dto/player-team-response.dto';
import { PlayerTeamStatus } from '../dto/player-team-status';
import { PlayerTeam } from '../entities/player-team.entity';

@Injectable()
export class PlayerTeamMapper {
  constructor(private readonly playerMapper: PlayerMapper, private readonly teamMapper: TeamMapper) {}

  toEntity(dto: CreatePlayerTeamDto, player: Player, team: Team): PlayerTeam {
    return Object.assign(new PlayerTeam(), {
      playerId: dto.playerId, teamId: dto.teamId, startDate: dto.startDate,
      endDate: dto.endDate, finishedAt: null, player, team,
    });
  }

  toResponseDto(entity: PlayerTeam, status: PlayerTeamStatus): PlayerTeamResponseDto {
    return {
      id: entity.id, playerId: entity.playerId, teamId: entity.teamId,
      startDate: entity.startDate, endDate: entity.endDate,
      finishedAt: entity.finishedAt?.toISOString() ?? null, status,
      player: this.playerMapper.toResponseDto(entity.player),
      team: this.teamMapper.toResponseDto(entity.team),
    };
  }
}
