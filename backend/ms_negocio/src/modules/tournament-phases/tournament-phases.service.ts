import { Injectable } from '@nestjs/common';
import { CreateTournamentPhasesDto } from './dto/create-tournament-phases.dto';
import { PhaseType } from './dto/phase-type';
import { TournamentPhaseResponseDto } from './dto/tournament-phase-response.dto';
import { UpdateTournamentPhaseDto } from './dto/update-tournament-phase.dto';
import { TournamentPhaseMapper } from './mappers/tournament-phase.mapper';
import { TournamentPhasesRepository } from './repositories/tournament-phases.repository';
import {
  TournamentPhaseInputInvalidError,
  TournamentPhaseNotFoundError,
  TournamentPhaseOrderLockedError,
  TournamentPhaseOrderTakenError,
  TournamentPhaseTournamentNotFoundError,
  TournamentPhaseFinalTypeLockedError,
  TournamentPhaseTypeLockedError,
} from './tournament-phase.errors';

const MAX_DATABASE_ID = 2147483647;

@Injectable()
export class TournamentPhasesService {
  constructor(
    private readonly repository: TournamentPhasesRepository,
    private readonly mapper: TournamentPhaseMapper,
  ) {}

  async create(tournamentId: number, dto: CreateTournamentPhasesDto): Promise<TournamentPhaseResponseDto[]> {
    this.validateId(tournamentId);
    this.validateOrders(dto.phases.map(phase => phase.order), dto.phases.length);
    return this.repository.transaction(async unitOfWork => {
      if (!await unitOfWork.findTournamentForUpdate(tournamentId)) {
        throw new TournamentPhaseTournamentNotFoundError(tournamentId);
      }
      const taken = await unitOfWork.findTakenOrders(tournamentId, dto.phases.map(phase => phase.order));
      if (taken.length > 0) throw new TournamentPhaseOrderTakenError(taken[0]);
      const saved = await unitOfWork.insertMany(
        dto.phases.map(phase => this.mapper.toEntity(tournamentId, phase)),
      );
      return this.mapper.toResponseDtoList(saved);
    });
  }

  async findByTournament(tournamentId: number): Promise<TournamentPhaseResponseDto[]> {
    this.validateId(tournamentId);
    if (!await this.repository.findTournament(tournamentId)) {
      throw new TournamentPhaseTournamentNotFoundError(tournamentId);
    }
    return this.mapper.toResponseDtoList(await this.repository.findByTournament(tournamentId));
  }

  async findOne(id: number): Promise<TournamentPhaseResponseDto> {
    this.validateId(id);
    const phase = await this.repository.findById(id);
    if (!phase) throw new TournamentPhaseNotFoundError(id);
    return this.mapper.toResponseDto(phase);
  }

  async update(id: number, dto: UpdateTournamentPhaseDto): Promise<TournamentPhaseResponseDto> {
    this.validateId(id);
    // Se lee solo el torneo de la fase; luego se bloquea primero el torneo y despues la fase.
    const reference = await this.repository.findById(id);
    if (!reference) throw new TournamentPhaseNotFoundError(id);
    return this.repository.transaction(async unitOfWork => {
      if (!await unitOfWork.findTournamentForUpdate(reference.tournamentId)) {
        throw new TournamentPhaseTournamentNotFoundError(reference.tournamentId);
      }
      const phase = await unitOfWork.findPhaseForUpdate(id);
      if (!phase) throw new TournamentPhaseNotFoundError(id);
      const typeChanged = dto.type !== undefined && dto.type !== phase.type;
      if (typeChanged && phase.type === PhaseType.Final) {
        throw new TournamentPhaseFinalTypeLockedError(id);
      }
      if (typeChanged
          && (await unitOfWork.countGroups(id) > 0 || await unitOfWork.countMatches(id) > 0)) {
        throw new TournamentPhaseTypeLockedError(id);
      }
      if (dto.order !== undefined && dto.order !== phase.phaseOrder) {
        if (await unitOfWork.countMatches(id) > 0) throw new TournamentPhaseOrderLockedError(id);
        const taken = await unitOfWork.findTakenOrders(phase.tournamentId, [dto.order], id);
        if (taken.length > 0) throw new TournamentPhaseOrderTakenError(dto.order);
      }
      const saved = await unitOfWork.save(this.mapper.mergeEntity(phase, dto));
      return this.mapper.toResponseDto(saved);
    });
  }

  async remove(id: number): Promise<{ message: string }> {
    this.validateId(id);
    if (!await this.repository.findById(id)) throw new TournamentPhaseNotFoundError(id);
    if (!await this.repository.remove(id)) throw new TournamentPhaseNotFoundError(id);
    return { message: `Fase #${id} eliminada correctamente; el torneo se conservo` };
  }

  private validateOrders(orders: number[], count: number): void {
    if (!Array.isArray(orders) || count === 0) {
      throw new TournamentPhaseInputInvalidError('Debe registrar al menos una fase');
    }
    if (orders.some(order => !Number.isSafeInteger(order) || order < 1 || order > MAX_DATABASE_ID)) {
      throw new TournamentPhaseInputInvalidError('El orden debe ser un entero positivo de hasta 2147483647');
    }
    if (new Set(orders).size !== orders.length) {
      throw new TournamentPhaseInputInvalidError('La lista contiene fases con el mismo orden');
    }
  }

  private validateId(id: number): void {
    if (!Number.isSafeInteger(id) || id < 1 || id > MAX_DATABASE_ID) {
      throw new TournamentPhaseInputInvalidError(
        'El identificador debe ser un entero positivo de hasta 2147483647',
      );
    }
  }
}
