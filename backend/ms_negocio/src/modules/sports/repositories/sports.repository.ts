import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Sport } from '../entities/sport.entity';

type SportRow = Pick<Sport, 'id' | 'name' | 'description' | 'parentId'> & {
  active: number | boolean;
};

const SPORT_COLUMNS = 'id, name, description, active, parent_id AS parentId';

@Injectable()
export class SportsRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findAll(): Promise<Sport[]> {
    const rows: SportRow[] = await this.dataSource.query(
      `SELECT ${SPORT_COLUMNS} FROM sports ORDER BY name ASC, id ASC`,
    );
    return this.toEntities(rows);
  }

  async findById(id: number): Promise<Sport | null> {
    const rows: SportRow[] = await this.dataSource.query(
      `SELECT ${SPORT_COLUMNS} FROM sports WHERE id = ? LIMIT 1`,
      [id],
    );
    return this.toEntities(rows)[0] ?? null;
  }

  /** Same global normalization as sports.normalized_name, including inactive rows. */
  async existsByName(name: string, excludeId?: number): Promise<boolean> {
    const rows: Array<{ id: number }> = await this.dataSource.query(
      `SELECT id FROM sports
       WHERE normalized_name =
         LOWER(REPLACE(TRIM(CONVERT(? USING utf8mb4)), ' ', '')) COLLATE utf8mb4_bin
       ${excludeId === undefined ? '' : 'AND id <> ?'}
       LIMIT 1`,
      excludeId === undefined ? [name] : [name, excludeId],
    );
    return rows.length > 0;
  }

  async findChildren(parentId: number): Promise<Sport[]> {
    const rows: SportRow[] = await this.dataSource.query(
      `SELECT ${SPORT_COLUMNS} FROM sports
       WHERE parent_id = ? ORDER BY name ASC, id ASC`,
      [parentId],
    );
    return this.toEntities(rows);
  }

  /** Only sports.parent_id references Sport at this stage of the model. */
  async hasChildren(parentId: number): Promise<boolean> {
    const rows: Array<{ id: number }> = await this.dataSource.query(
      'SELECT id FROM sports WHERE parent_id = ? LIMIT 1',
      [parentId],
    );
    return rows.length > 0;
  }

  async save(sport: Sport): Promise<Sport> {
    return this.dataSource.getRepository(Sport).save(sport);
  }

  async remove(id: number): Promise<boolean> {
    // Direct deletion preserves database FK restrictions; no relation cascades.
    const result = await this.dataSource.getRepository(Sport).delete(id);
    return (result.affected ?? 0) > 0;
  }

  private toEntities(rows: SportRow[]): Sport[] {
    // Raw MySQL queries return tinyint values; API mappings need actual booleans.
    return rows.map((row) => Object.assign(new Sport(), row, {
      active: row.active === true || row.active === 1,
    }));
  }
}
