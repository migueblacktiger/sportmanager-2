import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { MatchDetail } from '../../match-management/entities/match-detail.entity';
import { hasDatabaseCode, MISSING_REFERENCE_CODES } from '../../match-management/database-errors';
import { Match } from '../../matches/entities/match.entity';
import { PlayerTeam } from '../../player-teams/entities/player-team.entity';
import { Player } from '../../players/entities/player.entity';
import { TournamentPhase } from '../../tournament-phases/entities/tournament-phase.entity';
import { Tournament } from '../../tournaments/entities/tournament.entity';
import { MatchAnnotation } from '../entities/match-annotation.entity';
import { MatchResult } from '../entities/match-result.entity';
import {
  MatchResultsMatchNotFoundError,
  MatchResultsReferenceConflictError,
  MatchResultsTournamentNotFoundError,
} from '../match-results.errors';

const MATCH_RELATIONS = { phase: true, homeTeam: true, awayTeam: true } as const;
const ANNOTATION_RELATIONS = { player: true, team: true } as const;

/**
 * Orden de bloqueo comun con match-management: torneo (compartido), partido (escritura), fase
 * (compartida) y detalle (escritura). Asi resultado, anotaciones, estado y eliminacion se serializan.
 */
export class MatchResultsUnitOfWork {
  constructor(private readonly manager: EntityManager) {}

  async lockMatch(tournamentId: number, matchId: number): Promise<{ match: Match; detail: MatchDetail | null }> {
    const tournament = await this.manager.getRepository(Tournament)
      .findOne({ where: { id: tournamentId }, lock: { mode: 'pessimistic_read' } });
    if (!tournament) throw new MatchResultsTournamentNotFoundError(tournamentId);
    const match = await this.manager.getRepository(Match)
      .findOne({ where: { id: matchId }, lock: { mode: 'pessimistic_write' } });
    if (!match) throw new MatchResultsMatchNotFoundError(matchId, tournamentId);
    const phase = await this.manager.getRepository(TournamentPhase)
      .findOne({ where: { id: match.phaseId }, lock: { mode: 'pessimistic_read' } });
    if (!phase || phase.tournamentId !== tournamentId) throw new MatchResultsMatchNotFoundError(matchId, tournamentId);
    const detail = await this.manager.getRepository(MatchDetail)
      .findOne({ where: { matchId }, lock: { mode: 'pessimistic_write' } });
    return { match, detail };
  }

  findPlayerForShare(id: number): Promise<Player | null> {
    return this.manager.getRepository(Player).findOne({ where: { id }, lock: { mode: 'pessimistic_read' } });
  }

  /** Lectura bloqueante (actual), no un snapshot, de los contratos del jugador con los equipos dados. */
  findContracts(playerId: number, teamIds: number[]): Promise<PlayerTeam[]> {
    return this.manager.getRepository(PlayerTeam).createQueryBuilder('contract')
      .where('contract.playerId = :playerId', { playerId })
      .andWhere('contract.teamId IN (:...teamIds)', { teamIds })
      .setLock('pessimistic_read')
      .getMany();
  }

  findResultForUpdate(matchId: number): Promise<MatchResult | null> {
    return this.manager.getRepository(MatchResult).findOne({ where: { matchId }, lock: { mode: 'pessimistic_write' } });
  }

  saveResult(result: MatchResult): Promise<MatchResult> {
    return this.manager.getRepository(MatchResult).save(result);
  }

  saveDetail(detail: MatchDetail): Promise<MatchDetail> {
    return this.manager.getRepository(MatchDetail).save(detail);
  }

  findAnnotationForUpdate(id: number): Promise<MatchAnnotation | null> {
    return this.manager.getRepository(MatchAnnotation).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
  }

  saveAnnotation(annotation: MatchAnnotation): Promise<MatchAnnotation> {
    return this.manager.getRepository(MatchAnnotation).save(annotation);
  }

  async deleteAnnotation(id: number): Promise<boolean> {
    // Solo se elimina la fila de la anotacion: jugador, equipo y partido no se tocan.
    const result = await this.manager.getRepository(MatchAnnotation).delete(id);
    return (result.affected ?? 0) > 0;
  }
}

@Injectable()
export class MatchResultsRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async transaction<T>(work: (unitOfWork: MatchResultsUnitOfWork) => Promise<T>): Promise<T> {
    try {
      return await this.dataSource.transaction(manager => work(new MatchResultsUnitOfWork(manager)));
    } catch (error: unknown) {
      if (hasDatabaseCode(error, ...MISSING_REFERENCE_CODES)) throw new MatchResultsReferenceConflictError();
      throw error;
    }
  }

  findTournament(id: number): Promise<Tournament | null> {
    return this.dataSource.getRepository(Tournament).findOneBy({ id });
  }

  /** Partido con fase, local y visitante cargados. */
  findMatch(id: number): Promise<Match | null> {
    return this.dataSource.getRepository(Match).findOne({ where: { id }, relations: MATCH_RELATIONS });
  }

  findDetail(matchId: number): Promise<MatchDetail | null> {
    return this.dataSource.getRepository(MatchDetail).findOneBy({ matchId });
  }

  findResult(matchId: number): Promise<MatchResult | null> {
    return this.dataSource.getRepository(MatchResult).findOneBy({ matchId });
  }

  /** Anotaciones del partido con jugador y equipo; por minuto (las que no tienen minuto, al final). */
  async findAnnotations(matchId: number): Promise<MatchAnnotation[]> {
    const annotations = await this.dataSource.getRepository(MatchAnnotation).find({
      where: { matchId }, relations: ANNOTATION_RELATIONS, order: { id: 'ASC' },
    });
    return annotations.sort((a, b) => (a.minute ?? Infinity) - (b.minute ?? Infinity) || a.id - b.id);
  }

  findAnnotation(id: number): Promise<MatchAnnotation | null> {
    return this.dataSource.getRepository(MatchAnnotation).findOne({
      where: { id }, relations: ANNOTATION_RELATIONS,
    });
  }
}
