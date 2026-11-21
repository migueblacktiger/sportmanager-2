import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryFailedError } from 'typeorm';
import { Skill } from '../entities/skill.entity';
import {
  SkillDeleteRestrictedError,
  SkillUniqueConstraintError,
} from './skills-repository.errors';

@Injectable()
export class SkillsRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findAll(): Promise<Skill[]> {
    return this.dataSource.getRepository(Skill).find({
      order: { name: 'ASC', id: 'ASC' },
    });
  }

  async findById(id: number): Promise<Skill | null> {
    return this.dataSource.getRepository(Skill).findOne({ where: { id } });
  }

  async existsByNormalizedName(name: string, excludeId?: number): Promise<boolean> {
    const rows: Array<{ id: number }> = await this.dataSource.query(
      `SELECT id FROM skills
       WHERE normalized_name =
         LOWER(TRIM(CONVERT(? USING utf8mb4))) COLLATE utf8mb4_bin
       ${excludeId === undefined ? '' : 'AND id <> ?'}
       LIMIT 1`,
      excludeId === undefined ? [name] : [name, excludeId],
    );
    return rows.length > 0;
  }

  async save(skill: Skill): Promise<Skill> {
    try {
      return await this.dataSource.getRepository(Skill).save(skill);
    } catch (error: unknown) {
      if (this.hasDatabaseCode(error, 'ER_DUP_ENTRY')) {
        throw new SkillUniqueConstraintError();
      }
      throw error;
    }
  }

  async remove(id: number): Promise<boolean> {
    try {
      const result = await this.dataSource.getRepository(Skill).delete(id);
      return (result.affected ?? 0) > 0;
    } catch (error: unknown) {
      if (this.hasDatabaseCode(error, 'ER_ROW_IS_REFERENCED_2', 'ER_ROW_IS_REFERENCED')) {
        throw new SkillDeleteRestrictedError();
      }
      throw error;
    }
  }

  private hasDatabaseCode(error: unknown, ...codes: string[]): boolean {
    if (!(error instanceof QueryFailedError)) return false;
    const driverError: unknown = error.driverError;
    return typeof driverError === 'object' && driverError !== null
      && 'code' in driverError && typeof driverError.code === 'string'
      && codes.includes(driverError.code);
  }
}
