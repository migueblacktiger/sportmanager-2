import { Injectable } from '@nestjs/common';
import { CreatePlayerSkillDto } from './dto/create-player-skill.dto';
import { PlayerSkillResponseDto } from './dto/player-skill-response.dto';
import { PlayerSkillMapper } from './mappers/player-skill.mapper';
import { PlayerSkillsRepository } from './repositories/player-skills.repository';
import {
  PlayerSkillAlreadyExistsError,
  PlayerSkillAssociationNotFoundError,
  PlayerSkillInvalidIdError,
  PlayerSkillPlayerNotFoundError,
  PlayerSkillReferenceNotFoundError,
  PlayerSkillSkillNotFoundError,
} from './player-skill.errors';
import { PlayerSkillForeignKeyError, PlayerSkillUniqueConstraintError } from './repositories/player-skill-repository.errors';
import { PlayerResponseDto } from '../players/dto/player-response.dto';

const MAX_DATABASE_ID = 2147483647;

@Injectable()
export class PlayerSkillsService {
  constructor(
    private readonly repository: PlayerSkillsRepository,
    private readonly mapper: PlayerSkillMapper,
  ) {}

  async create(dto: CreatePlayerSkillDto): Promise<PlayerSkillResponseDto> {
    this.validateIds(dto.playerId, dto.skillId);
    await this.ensurePlayerExists(dto.playerId);
    await this.ensureSkillExists(dto.skillId);
    if (await this.repository.findByPair(dto.playerId, dto.skillId)) {
      throw new PlayerSkillAlreadyExistsError();
    }

    try {
      const saved = await this.repository.save(this.mapper.toEntity(dto));
      const association = await this.repository.findByPair(saved.playerId, saved.skillId);
      if (!association) throw new PlayerSkillReferenceNotFoundError();
      return this.mapper.toResponseDto(association);
    } catch (error: unknown) {
      if (error instanceof PlayerSkillUniqueConstraintError) {
        throw new PlayerSkillAlreadyExistsError();
      }
      if (error instanceof PlayerSkillForeignKeyError) {
        throw new PlayerSkillReferenceNotFoundError();
      }
      throw error;
    }
  }

  async findByPlayer(playerId: number): Promise<PlayerSkillResponseDto[]> {
    this.validateIds(playerId);
    await this.ensurePlayerExists(playerId);
    return this.mapper.toResponseDtoList(await this.repository.findByPlayerId(playerId));
  }

  async findBySkill(skillId: number): Promise<PlayerResponseDto[]> {
    this.validateIds(skillId);
    await this.ensureSkillExists(skillId);
    return this.mapper.toPlayerResponseList(await this.repository.findBySkillId(skillId));
  }

  async remove(playerId: number, skillId: number): Promise<{ message: string }> {
    this.validateIds(playerId, skillId);
    if (!await this.repository.remove(playerId, skillId)) {
      throw new PlayerSkillAssociationNotFoundError(playerId, skillId);
    }
    return { message: 'Habilidad retirada correctamente; el jugador y la habilidad se conservaron' };
  }

  private async ensurePlayerExists(id: number): Promise<void> {
    if (!await this.repository.findPlayerById(id)) {
      throw new PlayerSkillPlayerNotFoundError(id);
    }
  }

  private async ensureSkillExists(id: number): Promise<void> {
    if (!await this.repository.findSkillById(id)) {
      throw new PlayerSkillSkillNotFoundError(id);
    }
  }

  private validateIds(...ids: number[]): void {
    if (ids.some(id => !Number.isSafeInteger(id) || id < 1 || id > MAX_DATABASE_ID)) {
      throw new PlayerSkillInvalidIdError();
    }
  }
}
