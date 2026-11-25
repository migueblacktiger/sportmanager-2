import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { Match } from '../../matches/entities/match.entity';
import { hasDatabaseCode } from '../database-errors';
import { MatchAttendance } from '../entities/match-attendance.entity';
import { MatchDetail } from '../entities/match-detail.entity';
import { MatchManagementAttendanceDuplicateError } from '../match-management.errors';

export class AttendanceUnitOfWork {
  constructor(private readonly manager: EntityManager) {}

  // Mismo bloqueo de escritura sobre el partido que usan estado y eliminacion: se serializan.
  findMatchForUpdate(id: number): Promise<Match | null> {
    return this.manager.getRepository(Match).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
  }

  findDetail(matchId: number): Promise<MatchDetail | null> {
    return this.manager.getRepository(MatchDetail).findOneBy({ matchId });
  }

  async insert(matchId: number, fanId: number): Promise<MatchAttendance> {
    const repository = this.manager.getRepository(MatchAttendance);
    return repository.save(repository.create({ matchId, fanId }));
  }
}

@Injectable()
export class MatchAttendancesRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async transaction<T>(matchId: number, fanId: number, work: (unitOfWork: AttendanceUnitOfWork) => Promise<T>): Promise<T> {
    try {
      return await this.dataSource.transaction(manager => work(new AttendanceUnitOfWork(manager)));
    } catch (error: unknown) {
      if (hasDatabaseCode(error, 'ER_DUP_ENTRY')) throw new MatchManagementAttendanceDuplicateError(matchId, fanId);
      throw error;
    }
  }

  findMatch(id: number): Promise<Match | null> {
    return this.dataSource.getRepository(Match).findOneBy({ id });
  }

  findByMatch(matchId: number): Promise<MatchAttendance[]> {
    return this.dataSource.getRepository(MatchAttendance).find({
      where: { matchId },
      order: { fanId: 'ASC' },
    });
  }

  async remove(matchId: number, fanId: number): Promise<boolean> {
    const result = await this.dataSource.getRepository(MatchAttendance).delete({ matchId, fanId });
    return (result.affected ?? 0) > 0;
  }

  /**
   * Aficionados que participaron en partidos anteriores (programados antes de `before`, no
   * cancelados) de alguno de los equipos indicados, sin contar el partido `excludeMatchId`.
   */
  async findFanIdsOfPreviousMatches(teamIds: number[], excludeMatchId: number, before: Date): Promise<number[]> {
    if (teamIds.length === 0) return [];
    const marks = teamIds.map(() => '?').join(', ');
    const rows: { fan_id: number | string }[] = await this.dataSource.query(
      `SELECT DISTINCT a.fan_id
         FROM match_attendances a
         INNER JOIN matches m ON m.id = a.match_id
         LEFT JOIN match_details d ON d.match_id = m.id
        WHERE m.id <> ?
          AND m.scheduled_at < ?
          AND (m.home_team_id IN (${marks}) OR m.away_team_id IN (${marks}))
          AND COALESCE(d.status, 'scheduled') <> 'cancelled'
        ORDER BY a.fan_id ASC`,
      [excludeMatchId, before, ...teamIds, ...teamIds],
    );
    return rows.map(row => Number(row.fan_id));
  }
}
