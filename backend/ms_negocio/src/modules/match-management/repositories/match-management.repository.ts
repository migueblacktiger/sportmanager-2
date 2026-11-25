import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In } from 'typeorm';
import { Match } from '../../matches/entities/match.entity';
import { Team } from '../../teams/entities/team.entity';
import { TournamentPhase } from '../../tournament-phases/entities/tournament-phase.entity';
import { TournamentRegistration } from '../../tournament-registrations/entities/tournament-registration.entity';
import { Tournament } from '../../tournaments/entities/tournament.entity';
import { Venue } from '../../venues/entities/venue.entity';
import { hasDatabaseCode, MISSING_REFERENCE_CODES } from '../database-errors';
import { MatchStatus } from '../dto/match-status';
import { MatchAttendance } from '../entities/match-attendance.entity';
import { MatchDetail } from '../entities/match-detail.entity';
import { MatchResult } from '../../match-results/entities/match-result.entity';
import { MatchManagementReferenceConflictError } from '../match-management.errors';

const MATCH_RELATIONS = { phase: true, homeTeam: true, awayTeam: true } as const;

export interface MatchFilters {
  phaseId?: number;
  teamId?: number;
  status?: MatchStatus;
}

/**
 * Orden de bloqueo comun con matches y final-phases: torneo, fase, equipos; luego escenario.
 * Las operaciones sobre un partido existente bloquean antes su fila (escritura).
 */
export class MatchManagementUnitOfWork {
  constructor(private readonly manager: EntityManager) {}

  findTournamentForShare(id: number): Promise<Tournament | null> {
    return this.manager.getRepository(Tournament).findOne({ where: { id }, lock: { mode: 'pessimistic_read' } });
  }

  findPhaseForShare(id: number): Promise<TournamentPhase | null> {
    return this.manager.getRepository(TournamentPhase).findOne({ where: { id }, lock: { mode: 'pessimistic_read' } });
  }

  findTeamsForShare(ids: number[]): Promise<Team[]> {
    return this.manager.getRepository(Team).createQueryBuilder('team')
      .where('team.id IN (:...ids)', { ids })
      .orderBy('team.id', 'ASC')
      .setLock('pessimistic_read')
      .getMany();
  }

  async findRegisteredTeamIds(tournamentId: number, teamIds: number[]): Promise<number[]> {
    const registrations = await this.manager.getRepository(TournamentRegistration).find({
      select: { teamId: true },
      where: { tournamentId, teamId: In(teamIds) },
    });
    return registrations.map(registration => registration.teamId);
  }

  findVenueForShare(id: number): Promise<Venue | null> {
    return this.manager.getRepository(Venue).findOne({ where: { id }, lock: { mode: 'pessimistic_read' } });
  }

  findMatchForUpdate(id: number): Promise<Match | null> {
    return this.manager.getRepository(Match).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
  }

  findDetailForUpdate(matchId: number): Promise<MatchDetail | null> {
    return this.manager.getRepository(MatchDetail).findOne({ where: { matchId }, lock: { mode: 'pessimistic_write' } });
  }

  insertMatch(match: Match): Promise<Match> {
    return this.manager.getRepository(Match).save(match);
  }

  saveMatch(match: Match): Promise<Match> {
    return this.manager.getRepository(Match).save(match);
  }

  saveDetail(detail: MatchDetail): Promise<MatchDetail> {
    return this.manager.getRepository(MatchDetail).save(detail);
  }

  countAttendances(matchId: number): Promise<number> {
    return this.manager.getRepository(MatchAttendance).count({ where: { matchId } });
  }

  async hasResult(matchId: number): Promise<boolean> {
    return (await this.manager.getRepository(MatchResult).findOneBy({ matchId })) !== null;
  }

  async deleteMatch(id: number): Promise<boolean> {
    // El detalle se elimina por ON DELETE CASCADE; las participaciones lo impiden (RESTRICT).
    const result = await this.manager.getRepository(Match).delete(id);
    return (result.affected ?? 0) > 0;
  }
}

@Injectable()
export class MatchManagementRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async transaction<T>(work: (unitOfWork: MatchManagementUnitOfWork) => Promise<T>): Promise<T> {
    try {
      return await this.dataSource.transaction(manager => work(new MatchManagementUnitOfWork(manager)));
    } catch (error: unknown) {
      if (hasDatabaseCode(error, ...MISSING_REFERENCE_CODES)) throw new MatchManagementReferenceConflictError();
      throw error;
    }
  }

  findTournament(id: number): Promise<Tournament | null> {
    return this.dataSource.getRepository(Tournament).findOneBy({ id });
  }

  findPhase(id: number): Promise<TournamentPhase | null> {
    return this.dataSource.getRepository(TournamentPhase).findOneBy({ id });
  }

  findMatch(id: number): Promise<Match | null> {
    return this.dataSource.getRepository(Match).findOne({ where: { id }, relations: MATCH_RELATIONS });
  }

  findMatches(tournamentId: number, filters: MatchFilters): Promise<Match[]> {
    const query = this.dataSource.getRepository(Match).createQueryBuilder('game')
      .innerJoinAndSelect('game.phase', 'phase')
      .innerJoinAndSelect('game.homeTeam', 'homeTeam')
      .innerJoinAndSelect('game.awayTeam', 'awayTeam')
      .leftJoin(MatchDetail, 'detail', 'detail.matchId = game.id')
      .where('phase.tournamentId = :tournamentId', { tournamentId });
    if (filters.phaseId !== undefined) query.andWhere('game.phaseId = :phaseId', { phaseId: filters.phaseId });
    if (filters.teamId !== undefined) {
      query.andWhere('(game.homeTeamId = :teamId OR game.awayTeamId = :teamId)', { teamId: filters.teamId });
    }
    // Un partido sin fila de detalle esta programado.
    if (filters.status !== undefined) {
      query.andWhere("COALESCE(detail.status, 'scheduled') = :status", { status: filters.status });
    }
    return query.orderBy('game.scheduledAt', 'ASC').addOrderBy('game.id', 'ASC').getMany();
  }

  async findDetails(matchIds: number[]): Promise<Map<number, MatchDetail>> {
    if (matchIds.length === 0) return new Map();
    const details = await this.dataSource.getRepository(MatchDetail).find({
      where: { matchId: In(matchIds) },
      relations: { venue: true },
    });
    return new Map(details.map(detail => [detail.matchId, detail]));
  }

  async countAttendances(matchIds: number[]): Promise<Map<number, number>> {
    if (matchIds.length === 0) return new Map();
    const rows = await this.dataSource.getRepository(MatchAttendance).createQueryBuilder('attendance')
      .select('attendance.matchId', 'matchId')
      .addSelect('COUNT(*)', 'total')
      .where('attendance.matchId IN (:...matchIds)', { matchIds })
      .groupBy('attendance.matchId')
      .getRawMany<{ matchId: number | string; total: number | string }>();
    return new Map(rows.map(row => [Number(row.matchId), Number(row.total)]));
  }
}
