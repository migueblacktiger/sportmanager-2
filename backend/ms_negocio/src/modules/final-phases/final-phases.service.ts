import { Injectable } from '@nestjs/common';
import { MatchResponseDto } from '../matches/dto/match-response.dto';
import { MatchMapper } from '../matches/mappers/match.mapper';
import { PhaseType } from '../tournament-phases/dto/phase-type';
import { TournamentPhase } from '../tournament-phases/entities/tournament-phase.entity';
import { CreateFinalPhaseDto } from './dto/create-final-phase.dto';
import { FinalPhaseResponseDto } from './dto/final-phase-response.dto';
import { UpdateFinalPhaseDto } from './dto/update-final-phase.dto';
import {
  FinalPhaseHasMatchesError,
  FinalPhaseInputInvalidError,
  FinalPhaseNotFoundError,
  FinalPhaseOrderLockedError,
  FinalPhaseOrderTakenError,
  FinalPhaseTournamentNotFoundError,
} from './final-phase.errors';
import { FinalPhaseMapper } from './mappers/final-phase.mapper';
import { FinalPhasesRepository } from './repositories/final-phases.repository';

const MAX_DATABASE_ID = 2147483647;

@Injectable()
export class FinalPhasesService {
  constructor(
    private readonly repository: FinalPhasesRepository,
    private readonly mapper: FinalPhaseMapper,
    private readonly matchMapper: MatchMapper,
  ) {}

  async create(tournamentId: number, dto: CreateFinalPhaseDto): Promise<FinalPhaseResponseDto> {
    this.validateId(tournamentId);
    return this.repository.transaction(async unitOfWork => {
      if (!await unitOfWork.findTournamentForUpdate(tournamentId)) {
        throw new FinalPhaseTournamentNotFoundError(tournamentId);
      }
      const taken = await unitOfWork.findTakenOrders(tournamentId, [dto.order]);
      if (taken.length > 0) throw new FinalPhaseOrderTakenError(dto.order);
      const saved = await unitOfWork.save(this.mapper.toEntity(tournamentId, dto));
      return this.mapper.toResponseDto(saved, 0);
    });
  }

  async findByTournament(tournamentId: number): Promise<FinalPhaseResponseDto[]> {
    this.validateId(tournamentId);
    if (!await this.repository.findTournament(tournamentId)) {
      throw new FinalPhaseTournamentNotFoundError(tournamentId);
    }
    const phases = await this.repository.findFinalByTournament(tournamentId);
    const counts = await this.repository.countMatchesByPhase(phases.map(phase => phase.id));
    return this.mapper.toResponseDtoList(phases, counts);
  }

  async findOne(tournamentId: number, id: number): Promise<FinalPhaseResponseDto> {
    const phase = await this.requireFinalPhase(tournamentId, id);
    const counts = await this.repository.countMatchesByPhase([phase.id]);
    return this.mapper.toResponseDto(phase, counts.get(phase.id) ?? 0);
  }

  async findMatches(tournamentId: number, id: number): Promise<MatchResponseDto[]> {
    const phase = await this.requireFinalPhase(tournamentId, id);
    return this.matchMapper.toResponseDtoList(await this.repository.findMatchesByPhase(phase.id));
  }

  /**
   * Regla de competencia: una fase final con partidos conserva su orden (los partidos ya se
   * programaron sobre esa posicion); el nombre se puede corregir siempre. Solo se escribe la
   * fila de esta fase, por lo que las demas fases del torneo no cambian.
   */
  async update(tournamentId: number, id: number, dto: UpdateFinalPhaseDto): Promise<FinalPhaseResponseDto> {
    this.validateId(tournamentId);
    this.validateId(id);
    return this.repository.transaction(async unitOfWork => {
      if (!await unitOfWork.findTournamentForUpdate(tournamentId)) {
        throw new FinalPhaseTournamentNotFoundError(tournamentId);
      }
      const phase = this.ensureFinalPhaseOf(await unitOfWork.findPhaseForUpdate(id), tournamentId, id);
      const matchCount = await unitOfWork.countMatches(id);
      if (dto.order !== undefined && dto.order !== phase.phaseOrder) {
        if (matchCount > 0) throw new FinalPhaseOrderLockedError(id);
        const taken = await unitOfWork.findTakenOrders(tournamentId, [dto.order], id);
        if (taken.length > 0) throw new FinalPhaseOrderTakenError(dto.order);
      }
      const saved = await unitOfWork.save(this.mapper.mergeEntity(phase, dto));
      return this.mapper.toResponseDto(saved, matchCount);
    });
  }

  async remove(tournamentId: number, id: number): Promise<{ message: string }> {
    this.validateId(tournamentId);
    this.validateId(id);
    return this.repository.transaction(async unitOfWork => {
      if (!await unitOfWork.findTournamentForUpdate(tournamentId)) {
        throw new FinalPhaseTournamentNotFoundError(tournamentId);
      }
      this.ensureFinalPhaseOf(await unitOfWork.findPhaseForUpdate(id), tournamentId, id);
      if (await unitOfWork.countMatches(id) > 0) throw new FinalPhaseHasMatchesError(id);
      // Otra informacion asociada (grupos) la impide la FK RESTRICT; el repository la traduce a 409.
      if (!await unitOfWork.deletePhase(id)) throw new FinalPhaseNotFoundError(id, tournamentId);
      return { message: `Fase final #${id} eliminada correctamente; el torneo y las demas fases se conservaron` };
    });
  }

  private async requireFinalPhase(tournamentId: number, id: number): Promise<TournamentPhase> {
    this.validateId(tournamentId);
    this.validateId(id);
    if (!await this.repository.findTournament(tournamentId)) {
      throw new FinalPhaseTournamentNotFoundError(tournamentId);
    }
    return this.ensureFinalPhaseOf(await this.repository.findPhase(id), tournamentId, id);
  }

  // Una fase de otro torneo o de otro tipo no existe para este modulo.
  private ensureFinalPhaseOf(
    phase: TournamentPhase | null,
    tournamentId: number,
    id: number,
  ): TournamentPhase {
    if (!phase || phase.tournamentId !== tournamentId || phase.type !== PhaseType.Final) {
      throw new FinalPhaseNotFoundError(id, tournamentId);
    }
    return phase;
  }

  private validateId(id: number): void {
    if (!Number.isSafeInteger(id) || id < 1 || id > MAX_DATABASE_ID) {
      throw new FinalPhaseInputInvalidError(
        'El identificador debe ser un entero positivo de hasta 2147483647',
      );
    }
  }
}
