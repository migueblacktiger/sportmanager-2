import { Injectable } from '@nestjs/common';
import { CreateSkillDto } from './dto/create-skill.dto';
import { SkillResponseDto } from './dto/skill-response.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { Skill } from './entities/skill.entity';
import { SkillMapper } from './mappers/skill.mapper';
import {
  SkillDeleteRestrictedError,
  SkillUniqueConstraintError,
} from './repositories/skills-repository.errors';
import { SkillsRepository } from './repositories/skills.repository';
import {
  SkillAlreadyExistsError,
  SkillInUseError,
  SkillNotFoundError,
} from './skills.errors';

@Injectable()
export class SkillsService {
  constructor(
    private readonly skillsRepository: SkillsRepository,
    private readonly skillMapper: SkillMapper,
  ) {}

  async create(dto: CreateSkillDto): Promise<SkillResponseDto> {
    const normalizedDto = { ...dto, name: dto.name.trim() };
    await this.ensureUniqueName(normalizedDto.name);
    const saved = await this.saveSkill(this.skillMapper.toEntity(normalizedDto));
    return this.skillMapper.toResponseDto(saved);
  }

  async findAll(): Promise<SkillResponseDto[]> {
    const skills = await this.skillsRepository.findAll();
    return this.skillMapper.toResponseDtoList(skills);
  }

  async findOne(id: number): Promise<SkillResponseDto> {
    return this.skillMapper.toResponseDto(await this.findSkill(id));
  }

  async update(id: number, dto: UpdateSkillDto): Promise<SkillResponseDto> {
    const skill = await this.findSkill(id);
    const normalizedDto = dto.name === undefined
      ? dto
      : { ...dto, name: dto.name.trim() };
    if (normalizedDto.name !== undefined) {
      await this.ensureUniqueName(normalizedDto.name, id);
    }

    const saved = await this.saveSkill(
      this.skillMapper.mergeEntity(skill, normalizedDto),
    );
    return this.skillMapper.toResponseDto(saved);
  }

  async remove(id: number): Promise<void> {
    await this.findSkill(id);
    try {
      if (!await this.skillsRepository.remove(id)) {
        throw new SkillNotFoundError(id);
      }
    } catch (error: unknown) {
      if (error instanceof SkillDeleteRestrictedError) {
        throw new SkillInUseError(id);
      }
      throw error;
    }
  }

  private async findSkill(id: number): Promise<Skill> {
    const skill = await this.skillsRepository.findById(id);
    if (!skill) throw new SkillNotFoundError(id);
    return skill;
  }

  private async ensureUniqueName(name: string, excludeId?: number): Promise<void> {
    const normalizedName = name.trim().toLowerCase();
    if (await this.skillsRepository.existsByNormalizedName(normalizedName, excludeId)) {
      throw new SkillAlreadyExistsError();
    }
  }

  private async saveSkill(skill: Skill): Promise<Skill> {
    try {
      return await this.skillsRepository.save(skill);
    } catch (error: unknown) {
      if (error instanceof SkillUniqueConstraintError) {
        throw new SkillAlreadyExistsError();
      }
      throw error;
    }
  }
}
