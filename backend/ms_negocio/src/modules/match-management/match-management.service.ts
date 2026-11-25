import { Injectable } from '@nestjs/common';
import { Match } from '../matches/entities/match.entity';
import { MatchResultsService } from '../match-results/match-results.service';
import { CreateManagedMatchDto } from './dto/create-managed-match.dto';
import { CreatedManagedMatchResponseDto, ManagedMatchResponseDto } from './dto/managed-match-response.dto';
import { MatchQueryDto } from './dto/match-query.dto';
import {
  canTransition, DEFAULT_MATCH_STATUS, DELETABLE_STATUSES, EDITABLE_STATUSES, MatchStatus,
} from './dto/match-status';
import { UpdateManagedMatchDto } from './dto/update-managed-match.dto';
import { UpdateMatchStatusDto } from './dto/update-match-status.dto';
import { hasDatabaseCode, REFERENCED_ROW_CODES } from './database-errors';
import {
  MatchManagementInputInvalidError,
  MatchManagementInvalidTransitionError,
  MatchManagementMatchNotFoundError,
  MatchManagementNotDeletableError,
  MatchManagementNotEditableError,
  MatchManagementPhaseNotFoundError,
  MatchManagementResultPresentError,
  MatchManagementTeamNotEnabledError,
  MatchManagementTeamNotFoundError,
  MatchManagementTournamentNotFoundError,
  MatchManagementVenueInactiveError,
  MatchManagementVenueNotFoundError,
} from './match-management.errors';
import { MatchManagementMapper } from './mappers/match-management.mapper';
import { MatchNotificationService } from './notifications/match-notification.service';
import { MatchManagementRepository, MatchManagementUnitOfWork } from './repositories/match-management.repository';

const MAX_DATABASE_ID = 2147483647;

@Injectable()
export class MatchManagementService {
  constructor(
    private readonly repository: MatchManagementRepository,
    private readonly mapper: MatchManagementMapper,
    private readonly notifications: MatchNotificationService,
    private readonly results: MatchResultsService,
  ) {}

  /** Registra el partido con su estado inicial y escenario, y despues notifica a los aficionados. */
  async create(
    tournamentId: number,
    phaseId: number,
    dto: CreateManagedMatchDto,
    authorization?: string,
  ): Promise<CreatedManagedMatchResponseDto> {
    this.validateId(tournamentId);
    this.validateId(phaseId);
    this.validateTeamsDiffer(dto.homeTeamId, dto.awayTeamId);
    const scheduledAt = this.parseDate(dto.scheduledAt);
    const tournament = await this.requireTournament(tournamentId);
    const reference = await this.repository.findPhase(phaseId);
    if (!reference || reference.tournamentId !== tournamentId) {
      throw new MatchManagementPhaseNotFoundError(phaseId, tournamentId);
    }
    const venueId = dto.venueId ?? null;

    const matchId = await this.repository.transaction(async unitOfWork => {
      if (!await unitOfWork.findTournamentForShare(tournamentId)) {
        throw new MatchManagementTournamentNotFoundError(tournamentId);
      }
      const phase = await unitOfWork.findPhaseForShare(phaseId);
      if (!phase || phase.tournamentId !== tournamentId) {
        throw new MatchManagementPhaseNotFoundError(phaseId, tournamentId);
      }
      await this.ensureTeamsEnabled(unitOfWork, tournamentId, [dto.homeTeamId, dto.awayTeamId]);
      if (venueId !== null) await this.ensureVenueAvailable(unitOfWork, venueId);
      const match = await unitOfWork.insertMatch(this.mapper.toEntity(phaseId, dto));
      await unitOfWork.saveDetail(this.mapper.toDetailEntity(match.id, DEFAULT_MATCH_STATUS, venueId));
      return match.id;
    });

    const response = await this.loadResponse(matchId);
    // Fuera de la transaccion y sin lanzar: el partido ya esta guardado.
    const notification = await this.notifications.notifyMatchCreated({
      matchId,
      tournamentName: tournament.name,
      phaseName: response.phaseName,
      homeTeamId: response.homeTeamId,
      homeTeamName: response.homeTeamName,
      awayTeamId: response.awayTeamId,
      awayTeamName: response.awayTeamName,
      scheduledAt,
      venueName: response.venue?.name ?? null,
    }, authorization);
    return { ...response, notification };
  }

  async findAll(tournamentId: number, query: MatchQueryDto = {}): Promise<ManagedMatchResponseDto[]> {
    this.validateId(tournamentId);
    await this.requireTournament(tournamentId);
    return this.list(tournamentId, query);
  }

  async findByPhase(tournamentId: number, phaseId: number): Promise<ManagedMatchResponseDto[]> {
    this.validateId(tournamentId);
    this.validateId(phaseId);
    await this.requireTournament(tournamentId);
    const phase = await this.repository.findPhase(phaseId);
    if (!phase || phase.tournamentId !== tournamentId) {
      throw new MatchManagementPhaseNotFoundError(phaseId, tournamentId);
    }
    return this.list(tournamentId, { phaseId });
  }

  async findOne(tournamentId: number, id: number): Promise<ManagedMatchResponseDto> {
    this.validateId(tournamentId);
    this.validateId(id);
    await this.requireTournament(tournamentId);
    const response = await this.loadResponse(id);
    if (response.tournamentId !== tournamentId) throw new MatchManagementMatchNotFoundError(id, tournamentId);
    return response;
  }

  /** Solo con estado programado o aplazado; los campos omitidos conservan su valor. */
  async update(tournamentId: number, id: number, dto: UpdateManagedMatchDto): Promise<ManagedMatchResponseDto> {
    this.validateId(tournamentId);
    this.validateId(id);
    if (dto.homeTeamId === undefined && dto.awayTeamId === undefined
        && dto.scheduledAt === undefined && dto.venueId === undefined) {
      throw new MatchManagementInputInvalidError('Debe indicar al menos un campo para actualizar');
    }
    const scheduledAt = dto.scheduledAt === undefined ? undefined : this.parseDate(dto.scheduledAt);
    await this.requireTournament(tournamentId);

    await this.repository.transaction(async unitOfWork => {
      const { match, detail } = await this.lockMatch(unitOfWork, tournamentId, id);
      const status = detail?.status ?? DEFAULT_MATCH_STATUS;
      if (!EDITABLE_STATUSES.includes(status)) throw new MatchManagementNotEditableError(id, status);

      const homeTeamId = dto.homeTeamId ?? match.homeTeamId;
      const awayTeamId = dto.awayTeamId ?? match.awayTeamId;
      this.validateTeamsDiffer(homeTeamId, awayTeamId);
      // Solo se revalidan los equipos que cambian: uno ya asignado no bloquea editar la fecha.
      const changedTeams = [...new Set([
        ...(homeTeamId !== match.homeTeamId ? [homeTeamId] : []),
        ...(awayTeamId !== match.awayTeamId ? [awayTeamId] : []),
      ])];
      if (changedTeams.length > 0) await this.ensureTeamsEnabled(unitOfWork, tournamentId, changedTeams);

      let venueChange: { venueId: number | null } | undefined;
      if (dto.venueId !== undefined) {
        const venueId = dto.venueId;
        if (venueId !== (detail?.venueId ?? null)) {
          if (venueId !== null) await this.ensureVenueAvailable(unitOfWork, venueId);
          venueChange = { venueId };
        }
      }

      match.homeTeamId = homeTeamId;
      match.awayTeamId = awayTeamId;
      if (scheduledAt) match.scheduledAt = scheduledAt;
      await unitOfWork.saveMatch(match);
      if (venueChange) {
        const target = detail ?? this.mapper.toDetailEntity(id, status, null);
        target.venueId = venueChange.venueId;
        await unitOfWork.saveDetail(target);
      }
    });
    return this.loadResponse(id);
  }

  async updateStatus(
    tournamentId: number,
    id: number,
    dto: UpdateMatchStatusDto,
    authorization?: string,
  ): Promise<ManagedMatchResponseDto> {
    this.validateId(tournamentId);
    this.validateId(id);
    await this.requireTournament(tournamentId);
    const shouldNotifySummary = await this.repository.transaction(async unitOfWork => {
      const { detail } = await this.lockMatch(unitOfWork, tournamentId, id);
      const current = detail?.status ?? DEFAULT_MATCH_STATUS;
      if (!canTransition(current, dto.status)) {
        throw new MatchManagementInvalidTransitionError(id, current, dto.status);
      }
      if (dto.status === MatchStatus.Cancelled && await unitOfWork.hasResult(id)) {
        throw new MatchManagementResultPresentError(id);
      }
      const hasResult = dto.status === MatchStatus.Finished && await unitOfWork.hasResult(id);
      const target = detail ?? this.mapper.toDetailEntity(id, current, null);
      target.status = dto.status;
      await unitOfWork.saveDetail(target);
      return hasResult;
    });
    const response = await this.loadResponse(id);
    if (!shouldNotifySummary) return response;

    const notification = await this.results.notifyFinalizedMatch(tournamentId, id, authorization);
    return { ...response, notification };
  }

  async remove(tournamentId: number, id: number): Promise<{ message: string }> {
    this.validateId(tournamentId);
    this.validateId(id);
    await this.requireTournament(tournamentId);
    await this.repository.transaction(async unitOfWork => {
      const { detail } = await this.lockMatch(unitOfWork, tournamentId, id);
      const status = detail?.status ?? DEFAULT_MATCH_STATUS;
      if (!DELETABLE_STATUSES.includes(status)) {
        throw new MatchManagementNotDeletableError(id, 'status', status);
      }
      if (await unitOfWork.countAttendances(id) > 0) {
        throw new MatchManagementNotDeletableError(id, 'attendances');
      }
      if (await unitOfWork.hasResult(id)) {
        throw new MatchManagementNotDeletableError(id, 'result');
      }
      try {
        if (!await unitOfWork.deleteMatch(id)) throw new MatchManagementMatchNotFoundError(id, tournamentId);
      } catch (error: unknown) {
        if (hasDatabaseCode(error, ...REFERENCED_ROW_CODES)) {
          throw new MatchManagementNotDeletableError(id, 'references');
        }
        throw error;
      }
    });
    return { message: `Partido #${id} eliminado correctamente; la fase, los equipos y el escenario se conservaron` };
  }

  // Bloquea torneo (compartido), partido (escritura), fase (compartido) y detalle (escritura).
  private async lockMatch(unitOfWork: MatchManagementUnitOfWork, tournamentId: number, id: number) {
    if (!await unitOfWork.findTournamentForShare(tournamentId)) {
      throw new MatchManagementTournamentNotFoundError(tournamentId);
    }
    const match = await unitOfWork.findMatchForUpdate(id);
    if (!match) throw new MatchManagementMatchNotFoundError(id, tournamentId);
    const phase = await unitOfWork.findPhaseForShare(match.phaseId);
    if (!phase || phase.tournamentId !== tournamentId) {
      throw new MatchManagementMatchNotFoundError(id, tournamentId);
    }
    return { match, detail: await unitOfWork.findDetailForUpdate(id) };
  }

  // Habilitado = existe, esta activo e inscrito en el torneo de la fase.
  private async ensureTeamsEnabled(
    unitOfWork: MatchManagementUnitOfWork,
    tournamentId: number,
    teamIds: number[],
  ): Promise<void> {
    const ids = [...teamIds].sort((a, b) => a - b);
    const teams = new Map((await unitOfWork.findTeamsForShare(ids)).map(team => [team.id, team]));
    const registered = new Set(await unitOfWork.findRegisteredTeamIds(tournamentId, ids));
    for (const id of ids) {
      const team = teams.get(id);
      if (!team) throw new MatchManagementTeamNotFoundError(id);
      if (!team.active) throw new MatchManagementTeamNotEnabledError(id, 'inactive', tournamentId);
      if (!registered.has(id)) throw new MatchManagementTeamNotEnabledError(id, 'not-registered', tournamentId);
    }
  }

  private async ensureVenueAvailable(unitOfWork: MatchManagementUnitOfWork, venueId: number): Promise<void> {
    const venue = await unitOfWork.findVenueForShare(venueId);
    if (!venue) throw new MatchManagementVenueNotFoundError(venueId);
    if (!venue.active) throw new MatchManagementVenueInactiveError(venueId);
  }

  private async list(tournamentId: number, query: MatchQueryDto): Promise<ManagedMatchResponseDto[]> {
    const matches = await this.repository.findMatches(tournamentId, query);
    const ids = matches.map(match => match.id);
    const [details, counts] = await Promise.all([
      this.repository.findDetails(ids), this.repository.countAttendances(ids),
    ]);
    return this.mapper.toResponseDtoList(matches, details, counts);
  }

  private async loadResponse(id: number): Promise<ManagedMatchResponseDto> {
    const match: Match | null = await this.repository.findMatch(id);
    if (!match) throw new MatchManagementMatchNotFoundError(id);
    const [details, counts] = await Promise.all([
      this.repository.findDetails([id]), this.repository.countAttendances([id]),
    ]);
    return this.mapper.toResponseDto(match, details.get(id) ?? null, counts.get(id) ?? 0);
  }

  private async requireTournament(id: number) {
    const tournament = await this.repository.findTournament(id);
    if (!tournament) throw new MatchManagementTournamentNotFoundError(id);
    return tournament;
  }

  private validateTeamsDiffer(homeTeamId: number, awayTeamId: number): void {
    if (homeTeamId === awayTeamId) {
      throw new MatchManagementInputInvalidError('El equipo local y el visitante deben ser distintos');
    }
  }

  private parseDate(value: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new MatchManagementInputInvalidError('La fecha del partido no es valida');
    return date;
  }

  private validateId(id: number): void {
    if (!Number.isSafeInteger(id) || id < 1 || id > MAX_DATABASE_ID) {
      throw new MatchManagementInputInvalidError(
        'El identificador debe ser un entero positivo de hasta 2147483647',
      );
    }
  }
}
