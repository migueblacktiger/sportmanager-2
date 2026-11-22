import { Injectable } from '@nestjs/common';
import { CreatePlayerDto } from '../dto/create-player.dto';
import { PlayerResponseDto } from '../dto/player-response.dto';
import { UpdatePlayerDto } from '../dto/update-player.dto';
import { Player } from '../entities/player.entity';

@Injectable()
export class PlayerMapper {
  toEntity(dto: CreatePlayerDto): Player {
    const player = new Player();
    player.name = dto.name;
    player.identification = dto.identification?.trim() ?? null;
    player.description = dto.description ?? null;
    // The active value is populated by the database default on persistence.
    return player;
  }

  mergeEntity(entity: Player, dto: UpdatePlayerDto): Player {
    if (dto.name !== undefined) entity.name = dto.name;
    if (dto.identification !== undefined) entity.identification = dto.identification?.trim() ?? null;
    if (dto.description !== undefined) entity.description = dto.description;
    if (dto.active !== undefined) entity.active = dto.active;
    return entity;
  }

  toResponseDto(entity: Player): PlayerResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      identification: entity.identification,
      description: entity.description,
      active: entity.active,
    };
  }

  toResponseDtoList(entities: Player[]): PlayerResponseDto[] {
    return entities.map((entity) => this.toResponseDto(entity));
  }
}
