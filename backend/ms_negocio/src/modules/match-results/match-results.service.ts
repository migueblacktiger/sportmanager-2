import { Injectable } from '@nestjs/common';
import { hasDatabaseCode } from '../match-management/database-errors';
import { canTransition, DEFAULT_MATCH_STATUS, MatchStatus } from '../match-management/dto/match-status';
import { MatchDetail } from '../match-management/entities/match-detail.entity';
import { Match } from '../matches/entities/match.entity';
import { NotificationSummaryDto } from '../match-management/dto/managed-match-response.dto';
import { CreateMatchResultDto } from './dto/create-match-result.dto';
import { MatchResultResponseDto, MatchResultWithNotificationResponseDto } from './dto/match-result-response.dto';
import { MatchScoreDto } from './dto/match-score.dto';
import { UpdateMatchResultDto } from './dto/update-match-result.dto';
import {
  MatchResultsInputInvalidError,
  MatchResultsInvalidTransitionError,
  MatchResultsMatchNotFoundError,
  MatchResultsNotAllowedError,
  MatchResultsResultAlreadyExistsError,
  MatchResultsResultNotFoundError,
  MatchResultsTeamNotParticipantError,
  MatchResultsTournamentNotFoundError,
} from './match-results.errors';
import { SCORING_STATUSES, validateId } from './match-results.rules';
import { MatchResultsMapper } from './mappers/match-results.mapper';
import { MatchResultsNotificationService } from './notifications/match-results-notification.service';
import { MatchResultsRepository, MatchResultsUnitOfWork } from './repositories/match-results.repository';

interface Outcome {
  /** El partido paso a finalizado en esta operacion. */
  transitioned: boolean;
  finalStatus: MatchStatus;
}

@Injectable()
export class MatchResultsService {
  constructor(
    private readonly repository: MatchResultsRepository,
    private readonly mapper: MatchResultsMapper,
    private readonly notifications: MatchResultsNotificationService,
  ) {}

  /**
   * Registra el resultado de un partido en juego o finalizado. Con `finalize` el partido en juego pasa a
   * finalizado en la misma transaccion. El resumen se notifica cuando el partido queda finalizado.
   */
  async create(
    tournamentId: number,
    matchId: number,
    dto: CreateMatchResultDto,
    authorization?: string,
  ): Promise<MatchResultWithNotificationResponseDto> {
    validateId(tournamentId);
    validateId(matchId);
    const tournament = await this.requireTournament(tournamentId);

    let outcome: Outcome;
    try {
      outcome = await this.repository.transaction(async unitOfWork => {
        const { match, detail } = await unitOfWork.lockMatch(tournamentId, matchId);
        const status = detail?.status ?? DEFAULT_MATCH_STATUS;
        this.ensureScoring(matchId, status);
        if (await unitOfWork.findResultForUpdate(matchId)) throw new MatchResultsResultAlreadyExistsError(matchId);
        const [homeScore, awayScore] = this.resolveScores(match, dto.scores);
        await unitOfWork.saveResult(this.mapper.toResultEntity(matchId, homeScore, awayScore, new Date()));
        return this.finalizeIfRequested(unitOfWork, matchId, status, detail, dto.finalize);
      });
    } catch (error: unknown) {
      if (hasDatabaseCode(error, 'ER_DUP_ENTRY')) throw new MatchResultsResultAlreadyExistsError(matchId);
      throw error;
    }

    const response = await this.load(matchId);
    // El resultado es nuevo: si el partido esta finalizado (ahora o desde antes), se envia el resumen.
    const notification = outcome.finalStatus === MatchStatus.Finished
      ? await this.notifySummary(tournament.name, matchId, authorization)
      : null;
    return { ...response, notification };
  }

  async findOne(tournamentId: number, matchId: number): Promise<MatchResultResponseDto> {
    validateId(tournamentId);
    validateId(matchId);
    await this.requireTournament(tournamentId);
    const match = await this.repository.findMatch(matchId);
    if (!match || match.phase.tournamentId !== tournamentId) {
      throw new MatchResultsMatchNotFoundError(matchId, tournamentId);
    }
    return this.load(matchId);
  }

  /** Notifica el resumen cuando match-management finaliza un partido que ya tiene resultado. */
  async notifyFinalizedMatch(
    tournamentId: number,
    matchId: number,
    authorization?: string,
  ): Promise<NotificationSummaryDto> {
    validateId(tournamentId);
    validateId(matchId);
    const tournament = await this.requireTournament(tournamentId);
    const match = await this.repository.findMatch(matchId);
    if (!match || match.phase.tournamentId !== tournamentId) {
      throw new MatchResultsMatchNotFoundError(matchId, tournamentId);
    }
    if (!await this.repository.findResult(matchId)) throw new MatchResultsResultNotFoundError(matchId);
    return this.notifySummary(tournament.name, matchId, authorization);
  }

  /** Corrige los marcadores y/o finaliza el partido; el resumen se notifica si pasa a finalizado ahora. */
  async update(
    tournamentId: number,
    matchId: number,
    dto: UpdateMatchResultDto,
    authorization?: string,
  ): Promise<MatchResultWithNotificationResponseDto> {
    validateId(tournamentId);
    validateId(matchId);
    if (dto.scores == null && dto.finalize !== true) {
      throw new MatchResultsInputInvalidError('Debe indicar scores o finalize=true');
    }
    const tournament = await this.requireTournament(tournamentId);

    const outcome = await this.repository.transaction(async unitOfWork => {
      const { match, detail } = await unitOfWork.lockMatch(tournamentId, matchId);
      const status = detail?.status ?? DEFAULT_MATCH_STATUS;
      this.ensureScoring(matchId, status);
      const result = await unitOfWork.findResultForUpdate(matchId);
      if (!result) throw new MatchResultsResultNotFoundError(matchId);
      if (dto.scores != null) {
        [result.homeScore, result.awayScore] = this.resolveScores(match, dto.scores);
        result.updatedAt = new Date();
        await unitOfWork.saveResult(result);
      }
      return this.finalizeIfRequested(unitOfWork, matchId, status, detail, dto.finalize);
    });

    const response = await this.load(matchId);
    const notification = outcome.transitioned
      ? await this.notifySummary(tournament.name, matchId, authorization)
      : null;
    return { ...response, notification };
  }

  private async finalizeIfRequested(
    unitOfWork: MatchResultsUnitOfWork,
    matchId: number,
    status: MatchStatus,
    detail: MatchDetail | null,
    finalize?: boolean,
  ): Promise<Outcome> {
    if (finalize !== true || status === MatchStatus.Finished) return { transitioned: false, finalStatus: status };
    if (!detail || !canTransition(status, MatchStatus.Finished)) {
      throw new MatchResultsInvalidTransitionError(matchId, status);
    }
    detail.status = MatchStatus.Finished;
    await unitOfWork.saveDetail(detail);
    return { transitioned: true, finalStatus: MatchStatus.Finished };
  }

  /** Exactamente un marcador por cada equipo del partido; devuelve [local, visitante]. */
  private resolveScores(match: Match, scores: MatchScoreDto[]): [number, number] {
    const byTeam = new Map<number, number>();
    for (const { teamId, score } of scores) {
      if (teamId !== match.homeTeamId && teamId !== match.awayTeamId) {
        throw new MatchResultsTeamNotParticipantError(teamId, match.id);
      }
      if (byTeam.has(teamId)) throw new MatchResultsInputInvalidError(`El equipo ${teamId} esta repetido en los marcadores`);
      byTeam.set(teamId, score);
    }
    const home = byTeam.get(match.homeTeamId);
    const away = byTeam.get(match.awayTeamId);
    if (home === undefined || away === undefined) {
      throw new MatchResultsInputInvalidError('Debe indicar el marcador de los dos equipos participantes');
    }
    return [home, away];
  }

  private ensureScoring(matchId: number, status: MatchStatus): void {
    if (!SCORING_STATUSES.includes(status)) throw new MatchResultsNotAllowedError(matchId, status, 'result');
  }

  private async load(matchId: number): Promise<MatchResultResponseDto> {
    const match = await this.repository.findMatch(matchId);
    if (!match) throw new MatchResultsResultNotFoundError(matchId);
    const [detail, result] = await Promise.all([
      this.repository.findDetail(matchId), this.repository.findResult(matchId),
    ]);
    if (!result) throw new MatchResultsResultNotFoundError(matchId);
    return this.mapper.toResultResponseDto(match, detail, result);
  }

  private async notifySummary(tournamentName: string, matchId: number, authorization?: string) {
    const [match, result, annotations] = await Promise.all([
      this.repository.findMatch(matchId),
      this.repository.findResult(matchId),
      this.repository.findAnnotations(matchId),
    ]);
    if (!match || !result) {
      return { recipients: 0, sent: 0, failed: 0, skipped: false, reason: 'No fue posible notificar a los aficionados' };
    }
    return this.notifications.notifyMatchSummary({
      matchId,
      tournamentName,
      phaseName: match.phase.name,
      homeTeamName: match.homeTeam.name,
      homeScore: result.homeScore,
      awayTeamName: match.awayTeam.name,
      awayScore: result.awayScore,
      annotations: annotations.map(annotation => ({
        playerName: annotation.player.name,
        teamName: annotation.team.name,
        minute: annotation.minute,
        points: annotation.points,
        description: annotation.description,
      })),
    }, authorization);
  }

  private async requireTournament(id: number) {
    const tournament = await this.repository.findTournament(id);
    if (!tournament) throw new MatchResultsTournamentNotFoundError(id);
    return tournament;
  }
}
