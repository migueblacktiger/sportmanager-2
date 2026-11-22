import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Player } from '../entities/player.entity';

type PlayerRow = Pick<Player, 'id' | 'name' | 'identification' | 'description'> & {
  active: number | boolean;
};

const PLAYER_COLUMNS = 'id, name, identification, description, active';

@Injectable()
export class PlayersRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findAll(): Promise<Player[]> {
    const rows: PlayerRow[] = await this.dataSource.query(
      `SELECT ${PLAYER_COLUMNS} FROM players ORDER BY name ASC, id ASC`,
    );
    return this.toEntities(rows);
  }

  async findById(id: number): Promise<Player | null> {
    const rows: PlayerRow[] = await this.dataSource.query(
      `SELECT ${PLAYER_COLUMNS} FROM players WHERE id = ? LIMIT 1`,
      [id],
    );
    return this.toEntities(rows)[0] ?? null;
  }

  async save(player: Player): Promise<Player> {
    return this.dataSource.getRepository(Player).save(player);
  }

  async existsByIdentification(identification: string, excludeId?: number): Promise<boolean> {
    const rows: { id: number }[] = await this.dataSource.query(
      'SELECT id FROM players WHERE normalized_identification = LOWER(TRIM(?))'
        + (excludeId === undefined ? '' : ' AND id <> ?') + ' LIMIT 1',
      excludeId === undefined ? [identification] : [identification, excludeId],
    );
    return rows.length > 0;
  }

  async remove(id: number): Promise<boolean> {
    // Direct deletion preserves database FK restrictions; no relation cascades.
    const result = await this.dataSource.getRepository(Player).delete(id);
    return (result.affected ?? 0) > 0;
  }

  private toEntities(rows: PlayerRow[]): Player[] {
    // Raw MySQL queries return tinyint values rather than actual booleans.
    return rows.map((row) => Object.assign(new Player(), row, {
      active: row.active === true || row.active === 1,
    }));
  }
}
