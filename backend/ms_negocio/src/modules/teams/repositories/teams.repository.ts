import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Team } from '../entities/team.entity';

type TeamRow = Pick<Team, 'id' | 'name' | 'description'> & {
  active: number | boolean;
};

const TEAM_COLUMNS = 'id, name, description, active';

@Injectable()
export class TeamsRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findAll(): Promise<Team[]> {
    const rows: TeamRow[] = await this.dataSource.query(
      `SELECT ${TEAM_COLUMNS} FROM teams ORDER BY name ASC, id ASC`,
    );
    return this.toEntities(rows);
  }

  async findById(id: number): Promise<Team | null> {
    const rows: TeamRow[] = await this.dataSource.query(
      `SELECT ${TEAM_COLUMNS} FROM teams WHERE id = ? LIMIT 1`,
      [id],
    );
    return this.toEntities(rows)[0] ?? null;
  }

  async save(team: Team): Promise<Team> {
    return this.dataSource.getRepository(Team).save(team);
  }

  async remove(id: number): Promise<boolean> {
    // Direct deletion preserves database FK restrictions; no relation cascades.
    const result = await this.dataSource.getRepository(Team).delete(id);
    return (result.affected ?? 0) > 0;
  }

  private toEntities(rows: TeamRow[]): Team[] {
    // Raw MySQL queries return tinyint values rather than actual booleans.
    return rows.map((row) => Object.assign(new Team(), row, {
      active: row.active === true || row.active === 1,
    }));
  }
}
