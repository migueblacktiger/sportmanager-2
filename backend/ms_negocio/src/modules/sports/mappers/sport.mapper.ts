import { Injectable } from '@nestjs/common';
import { CreateSportDto } from '../dto/create-sport.dto';
import { SportResponseDto } from '../dto/sport-response.dto';
import { UpdateSportDto } from '../dto/update-sport.dto';
import { Sport } from '../entities/sport.entity';

@Injectable()
export class SportMapper {
  toEntity(dto: CreateSportDto): Sport {
    const sport = new Sport();
    sport.name = dto.name;
    sport.description = dto.description ?? null;
    sport.parentId = dto.parentId ?? null;
    // active and normalizedName are populated by the database defaults/expression.
    return sport;
  }

  mergeEntity(entity: Sport, dto: UpdateSportDto): Sport {
    if (dto.name !== undefined) entity.name = dto.name;
    if (dto.description !== undefined) entity.description = dto.description;
    if (dto.active !== undefined) entity.active = dto.active;
    if (dto.parentId !== undefined) {
      entity.parentId = dto.parentId;
      // A previously loaded parent must not override the newly assigned FK on save.
      entity.parent = undefined;
    }
    return entity;
  }

  toResponseDto(entity: Sport): SportResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      active: entity.active,
      parentId: entity.parentId,
    };
  }

  toResponseDtoList(entities: Sport[]): SportResponseDto[] {
    return entities.map((entity) => this.toResponseDto(entity));
  }
}
