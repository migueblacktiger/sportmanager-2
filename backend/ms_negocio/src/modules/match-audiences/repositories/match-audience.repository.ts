import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Match } from '../../matches/entities/match.entity';
import { MatchAudience } from '../entities/match-audience.entity';
import { MatchAudienceSource } from '../match-audience-source';
import { hasDatabaseCode } from '../../match-management/database-errors';

@Injectable()
export class MatchAudienceRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async matchExists(matchId: number): Promise<boolean> {
    return (await this.dataSource.getRepository(Match).findOneBy({ id: matchId })) !== null;
  }

  async add(matchId: number, fanId: number, source: MatchAudienceSource): Promise<void> {
    try {
      await this.dataSource.getRepository(MatchAudience).insert({ matchId, fanId, source });
    } catch (error: unknown) {
      if (hasDatabaseCode(error, 'ER_DUP_ENTRY')) return;
      throw error;
    }
  }

  async findFanIds(matchId: number, source?: MatchAudienceSource): Promise<number[]> {
    const query = this.dataSource.getRepository(MatchAudience)
      .createQueryBuilder('audience')
      .select('audience.fanId', 'fanId')
      .where('audience.matchId = :matchId', { matchId })
      .distinct(true)
      .orderBy('audience.fanId', 'ASC');
    if (source !== undefined) query.andWhere('audience.source = :source', { source });
    const rows = await query.getRawMany<{ fanId: number | string }>();
    return rows.map(row => Number(row.fanId));
  }

  async remove(matchId: number, fanId: number, source: MatchAudienceSource): Promise<boolean> {
    const result = await this.dataSource.getRepository(MatchAudience).delete({ matchId, fanId, source });
    return (result.affected ?? 0) > 0;
  }
}
