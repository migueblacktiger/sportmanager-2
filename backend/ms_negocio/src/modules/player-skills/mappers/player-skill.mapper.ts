import { Injectable } from '@nestjs/common';
import { PlayerResponseDto } from '../../players/dto/player-response.dto';
import { PlayerMapper } from '../../players/mappers/player.mapper';
import { SkillMapper } from '../../skills/mappers/skill.mapper';
import { CreatePlayerSkillDto } from '../dto/create-player-skill.dto';
import { PlayerSkillResponseDto } from '../dto/player-skill-response.dto';
import { PlayerSkill } from '../entities/player-skill.entity';

@Injectable()
export class PlayerSkillMapper {
  constructor(
    private readonly playerMapper: PlayerMapper,
    private readonly skillMapper: SkillMapper,
  ) {}

  toEntity(dto: CreatePlayerSkillDto): PlayerSkill {
    const association = new PlayerSkill();
    association.playerId = dto.playerId;
    association.skillId = dto.skillId;
    return association;
  }

  toResponseDto(entity: PlayerSkill): PlayerSkillResponseDto {
    return {
      id: entity.id,
      playerId: entity.playerId,
      skillId: entity.skillId,
      player: this.playerMapper.toResponseDto(entity.player),
      skill: this.skillMapper.toResponseDto(entity.skill),
    };
  }

  toResponseDtoList(entities: PlayerSkill[]): PlayerSkillResponseDto[] {
    return entities.map(entity => this.toResponseDto(entity));
  }

  toPlayerResponseList(entities: PlayerSkill[]): PlayerResponseDto[] {
    return entities.map(entity => this.playerMapper.toResponseDto(entity.player));
  }
}
