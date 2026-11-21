import { Injectable } from '@nestjs/common';
import { CreateSkillDto } from '../dto/create-skill.dto';
import { SkillResponseDto } from '../dto/skill-response.dto';
import { UpdateSkillDto } from '../dto/update-skill.dto';
import { Skill } from '../entities/skill.entity';

@Injectable()
export class SkillMapper {
  toEntity(dto: CreateSkillDto): Skill {
    const skill = new Skill();
    skill.name = dto.name;
    skill.description = dto.description ?? null;
    return skill;
  }

  mergeEntity(entity: Skill, dto: UpdateSkillDto): Skill {
    if (dto.name !== undefined) entity.name = dto.name;
    if (dto.description !== undefined) entity.description = dto.description;
    return entity;
  }

  toResponseDto(entity: Skill): SkillResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
    };
  }

  toResponseDtoList(entities: Skill[]): SkillResponseDto[] {
    return entities.map((entity) => this.toResponseDto(entity));
  }
}
