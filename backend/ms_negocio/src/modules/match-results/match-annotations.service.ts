import { Injectable } from '@nestjs/common';
import { DEFAULT_MATCH_STATUS, MatchStatus } from '../match-management/dto/match-status';
import { Match } from '../matches/entities/match.entity';
import { CreateMatchAnnotationDto } from './dto/create-match-annotation.dto';
import {
  CreatedMatchAnnotationResponseDto, MatchAnnotationResponseDto,
} from './dto/match-annotation-response.dto';
import { UpdateMatchAnnotationDto } from './dto/update-match-annotation.dto';
import { MatchAnnotation } from './entities/match-annotation.entity';
import {
  MatchResultsAnnotationNotFoundError,
  MatchResultsInputInvalidError,
  MatchResultsMatchNotFoundError,
  MatchResultsNotAllowedError,
  MatchResultsPlayerNotFoundError,
  MatchResultsPlayerNotInMatchError,
  MatchResultsPlayerTeamAmbiguousError,
  MatchResultsTeamNotParticipantError,
  MatchResultsTournamentNotFoundError,
} from './match-results.errors';
import { isContractEffectiveAt, SCORING_STATUSES, validateId } from './match-results.rules';
import { MatchResultsMapper } from './mappers/match-results.mapper';
import { MatchResultsNotificationService } from './notifications/match-results-notification.service';
import { MatchResultsRepository, MatchResultsUnitOfWork } from './repositories/match-results.repository';

@Injectable()
export class MatchAnnotationsService {
  constructor(
    private readonly repository: MatchResultsRepository,
    private readonly mapper: MatchResultsMapper,
    private readonly notifications: MatchResultsNotificationService,
  ) {}

  /** Registra una anotacion de un jugador de uno de los equipos del partido y notifica a los aficionados. */
  async create(
    tournamentId: number,
    matchId: number,
    dto: CreateMatchAnnotationDto,
    authorization?: string,
  ): Promise<CreatedMatchAnnotationResponseDto> {
    validateId(tournamentId);
    validateId(matchId);
    const tournament = await this.requireTournament(tournamentId);

    const id = await this.repository.transaction(async unitOfWork => {
      const { match, detail } = await unitOfWork.lockMatch(tournamentId, matchId);
      this.ensureScoring(matchId, detail?.status ?? DEFAULT_MATCH_STATUS);
      if (!await unitOfWork.findPlayerForShare(dto.playerId)) throw new MatchResultsPlayerNotFoundError(dto.playerId);
      const teamId = await this.resolveTeam(unitOfWork, match, dto.playerId, dto.teamId ?? undefined);
      return (await unitOfWork.saveAnnotation(
        this.mapper.toAnnotationEntity(matchId, teamId, dto, new Date()),
      )).id;
    });

    const { match, annotation } = await this.load(matchId, id);
    // Fuera de la transaccion y sin lanzar: la anotacion ya esta guardada.
    const notification = await this.notifications.notifyAnnotation({
      matchId,
      tournamentName: tournament.name,
      homeTeamName: match.homeTeam.name,
      awayTeamName: match.awayTeam.name,
      playerName: annotation.player.name,
      teamName: annotation.team.name,
      minute: annotation.minute,
      points: annotation.points,
      description: annotation.description,
    }, authorization);
    return { ...this.mapper.toAnnotationResponseDto(match, annotation), notification };
  }

  async findAll(tournamentId: number, matchId: number): Promise<MatchAnnotationResponseDto[]> {
    validateId(tournamentId);
    validateId(matchId);
    await this.requireTournament(tournamentId);
    const match = await this.requireMatch(tournamentId, matchId);
    return this.mapper.toAnnotationResponseDtoList(match, await this.repository.findAnnotations(matchId));
  }

  async findOne(tournamentId: number, matchId: number, id: number): Promise<MatchAnnotationResponseDto> {
    validateId(tournamentId);
    validateId(matchId);
    validateId(id);
    await this.requireTournament(tournamentId);
    const match = await this.requireMatch(tournamentId, matchId);
    const annotation = await this.repository.findAnnotation(id);
    if (!annotation || annotation.matchId !== matchId) throw new MatchResultsAnnotationNotFoundError(id, matchId);
    return this.mapper.toAnnotationResponseDto(match, annotation);
  }

  /** Solo con el partido en juego o finalizado; los campos omitidos conservan su valor. */
  async update(
    tournamentId: number,
    matchId: number,
    id: number,
    dto: UpdateMatchAnnotationDto,
  ): Promise<MatchAnnotationResponseDto> {
    validateId(tournamentId);
    validateId(matchId);
    validateId(id);
    if (Object.values(dto).every(value => value === undefined)) {
      throw new MatchResultsInputInvalidError('Debe indicar al menos un campo para actualizar');
    }
    await this.requireTournament(tournamentId);

    await this.repository.transaction(async unitOfWork => {
      const { match, detail } = await unitOfWork.lockMatch(tournamentId, matchId);
      const annotation = await unitOfWork.findAnnotationForUpdate(id);
      if (!annotation || annotation.matchId !== matchId) throw new MatchResultsAnnotationNotFoundError(id, matchId);
      this.ensureScoring(matchId, detail?.status ?? DEFAULT_MATCH_STATUS);

      const requestedTeamId = dto.teamId ?? undefined;
      const playerChanged = dto.playerId != null && dto.playerId !== annotation.playerId;
      const teamChanged = requestedTeamId !== undefined && requestedTeamId !== annotation.teamId;
      // Solo se revalida la pertenencia cuando cambia el jugador o el equipo.
      if (playerChanged || teamChanged) {
        const playerId = dto.playerId ?? annotation.playerId;
        if (playerChanged && !await unitOfWork.findPlayerForShare(playerId)) {
          throw new MatchResultsPlayerNotFoundError(playerId);
        }
        annotation.teamId = await this.resolveTeam(unitOfWork, match, playerId, requestedTeamId);
        annotation.playerId = playerId;
      }
      if (dto.minute !== undefined) annotation.minute = dto.minute;
      if (dto.points != null) annotation.points = dto.points;
      if (dto.description !== undefined) annotation.description = dto.description;
      await unitOfWork.saveAnnotation(annotation);
    });

    const { match, annotation } = await this.load(matchId, id);
    return this.mapper.toAnnotationResponseDto(match, annotation);
  }

  /** Elimina solo la anotacion; el jugador, el equipo y el partido se conservan. */
  async remove(tournamentId: number, matchId: number, id: number): Promise<{ message: string }> {
    validateId(tournamentId);
    validateId(matchId);
    validateId(id);
    await this.requireTournament(tournamentId);
    await this.repository.transaction(async unitOfWork => {
      await unitOfWork.lockMatch(tournamentId, matchId);
      const annotation = await unitOfWork.findAnnotationForUpdate(id);
      if (!annotation || annotation.matchId !== matchId) throw new MatchResultsAnnotationNotFoundError(id, matchId);
      if (!await unitOfWork.deleteAnnotation(id)) throw new MatchResultsAnnotationNotFoundError(id, matchId);
    });
    return { message: `Anotacion #${id} eliminada correctamente; el jugador y el partido se conservaron` };
  }

  /**
   * Equipo del partido con el que anota el jugador: aquel con el que tiene un contrato vigente en la
   * fecha del partido. Si pertenece a ambos debe indicarse `teamId`.
   */
  private async resolveTeam(
    unitOfWork: MatchResultsUnitOfWork,
    match: Match,
    playerId: number,
    requestedTeamId?: number,
  ): Promise<number> {
    const participants = [match.homeTeamId, match.awayTeamId];
    if (requestedTeamId !== undefined && !participants.includes(requestedTeamId)) {
      throw new MatchResultsTeamNotParticipantError(requestedTeamId, match.id);
    }
    const contracts = await unitOfWork.findContracts(playerId, participants);
    const instant = match.scheduledAt.getTime();
    const teams = participants.filter(teamId => contracts.some(
      contract => contract.teamId === teamId && isContractEffectiveAt(contract, instant),
    ));
    if (requestedTeamId !== undefined) {
      if (!teams.includes(requestedTeamId)) {
        throw new MatchResultsPlayerNotInMatchError(playerId, match.id, requestedTeamId);
      }
      return requestedTeamId;
    }
    if (teams.length === 0) throw new MatchResultsPlayerNotInMatchError(playerId, match.id);
    if (teams.length > 1) throw new MatchResultsPlayerTeamAmbiguousError(playerId, match.id);
    return teams[0];
  }

  private ensureScoring(matchId: number, status: MatchStatus): void {
    if (!SCORING_STATUSES.includes(status)) throw new MatchResultsNotAllowedError(matchId, status, 'annotations');
  }

  private async load(matchId: number, id: number): Promise<{ match: Match; annotation: MatchAnnotation }> {
    const [match, annotation] = await Promise.all([
      this.repository.findMatch(matchId), this.repository.findAnnotation(id),
    ]);
    if (!annotation || !match) throw new MatchResultsAnnotationNotFoundError(id, matchId);
    return { match, annotation };
  }

  private async requireTournament(id: number) {
    const tournament = await this.repository.findTournament(id);
    if (!tournament) throw new MatchResultsTournamentNotFoundError(id);
    return tournament;
  }

  private async requireMatch(tournamentId: number, matchId: number): Promise<Match> {
    const match = await this.repository.findMatch(matchId);
    if (!match || match.phase.tournamentId !== tournamentId) {
      throw new MatchResultsMatchNotFoundError(matchId, tournamentId);
    }
    return match;
  }
}
