import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryFailedError } from 'typeorm';
import { Player } from '../../players/entities/player.entity';
import { Skill } from '../../skills/entities/skill.entity';
import { PlayerSkill } from '../entities/player-skill.entity';
import {
  PlayerSkillForeignKeyError,
  PlayerSkillUniqueConstraintError,
} from './player-skill-repository.errors';

@Injectable()
export class PlayerSkillsRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findPlayerById(id: number): Promise<Player | null> {
    return this.dataSource.getRepository(Player).findOneBy({ id });
  }

  async findSkillById(id: number): Promise<Skill | null> {
    return this.dataSource.getRepository(Skill).findOneBy({ id });
  }

  async findByPair(playerId: number, skillId: number): Promise<PlayerSkill | null> {
    return this.dataSource.getRepository(PlayerSkill).findOne({
      where: { playerId, skillId },
      relations: { player: true, skill: true },
    });
  }

  async findByPlayerId(playerId: number): Promise<PlayerSkill[]> {
    return this.dataSource.getRepository(PlayerSkill).find({
      where: { playerId },
      relations: { player: true, skill: true },
      order: { skill: { name: 'ASC' }, skillId: 'ASC' },
    });
  }

  async findBySkillId(skillId: number): Promise<PlayerSkill[]> {
    return this.dataSource.getRepository(PlayerSkill).find({
      where: { skillId },
      relations: { player: true, skill: true },
      order: { player: { name: 'ASC' }, playerId: 'ASC' },
    });
  }

  async save(association: PlayerSkill): Promise<PlayerSkill> {
    try {
      return await this.dataSource.getRepository(PlayerSkill).save(association);
    } catch (error: unknown) {
      if (this.hasDatabaseCode(error, 'ER_DUP_ENTRY')) {
        throw new PlayerSkillUniqueConstraintError();
      }
      if (this.hasDatabaseCode(error, 'ER_NO_REFERENCED_ROW_2', 'ER_NO_REFERENCED_ROW')) {
        throw new PlayerSkillForeignKeyError();
      }
      throw error;
    }
  }

  async remove(playerId: number, skillId: number): Promise<boolean> {
    const result = await this.dataSource.getRepository(PlayerSkill).delete({ playerId, skillId });
    return (result.affected ?? 0) > 0;
  }

  private hasDatabaseCode(error: unknown, ...codes: string[]): boolean {
    if (!(error instanceof QueryFailedError)) return false;
    const driverError: unknown = error.driverError;
    return typeof driverError === 'object' && driverError !== null
      && 'code' in driverError && typeof driverError.code === 'string'
      && codes.includes(driverError.code);
  }
}
