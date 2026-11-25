import { Injectable } from '@nestjs/common';
import { PhaseType } from '../tournament-phases/dto/phase-type';
import {
  CompetitionGroupInputInvalidError,
  CompetitionGroupNameTakenError,
  CompetitionGroupNotFoundError,
  CompetitionGroupPhaseNotFoundError,
  CompetitionGroupPhaseTypeError,
  CompetitionGroupTournamentNotFoundError,
} from './competition-group.errors';
import { CompetitionGroupResponseDto } from './dto/competition-group-response.dto';
import { CreateCompetitionGroupsDto } from './dto/create-competition-groups.dto';
import { UpdateCompetitionGroupDto } from './dto/update-competition-group.dto';
import { CompetitionGroupMapper } from './mappers/competition-group.mapper';
import { CompetitionGroupsRepository } from './repositories/competition-groups.repository';

const MAX_DATABASE_ID = 2147483647;

const normalize = (name: string): string => name.trim().toLowerCase();

@Injectable()
export class CompetitionGroupsService {
  constructor(
    private readonly repository: CompetitionGroupsRepository,
    private readonly mapper: CompetitionGroupMapper,
  ) {}

  async create(
    tournamentId: number,
    phaseId: number,
    dto: CreateCompetitionGroupsDto,
  ): Promise<CompetitionGroupResponseDto[]> {
    this.validateId(tournamentId);
    this.validateId(phaseId);
    this.validateNames(dto.groups.map(group => group.name));
    if (!await this.repository.findTournament(tournamentId)) {
      throw new CompetitionGroupTournamentNotFoundError(tournamentId);
    }
    return this.repository.transaction(async unitOfWork => {
      const phase = await unitOfWork.findPhaseForUpdate(phaseId);
      if (!phase || phase.tournamentId !== tournamentId) {
        throw new CompetitionGroupPhaseNotFoundError(phaseId, tournamentId);
      }
      if (phase.type !== PhaseType.Groups) throw new CompetitionGroupPhaseTypeError(phaseId);
      const existing = new Set((await unitOfWork.findByPhase(phaseId)).map(group => normalize(group.name)));
      const repeated = dto.groups.find(group => existing.has(normalize(group.name)));
      if (repeated) throw new CompetitionGroupNameTakenError(repeated.name.trim());
      const saved = await unitOfWork.insertMany(
        dto.groups.map(group => this.mapper.toEntity(phaseId, group)),
      );
      return this.mapper.toResponseDtoList(saved);
    });
  }

  async findByPhase(tournamentId: number, phaseId: number): Promise<CompetitionGroupResponseDto[]> {
    this.validateId(tournamentId);
    this.validateId(phaseId);
    if (!await this.repository.findTournament(tournamentId)) {
      throw new CompetitionGroupTournamentNotFoundError(tournamentId);
    }
    const phase = await this.repository.findPhase(phaseId);
    if (!phase || phase.tournamentId !== tournamentId) {
      throw new CompetitionGroupPhaseNotFoundError(phaseId, tournamentId);
    }
    return this.mapper.toResponseDtoList(await this.repository.findByPhase(phaseId));
  }

  async findOne(id: number): Promise<CompetitionGroupResponseDto> {
    this.validateId(id);
    const group = await this.repository.findById(id);
    if (!group) throw new CompetitionGroupNotFoundError(id);
    return this.mapper.toResponseDto(group);
  }

  async update(id: number, dto: UpdateCompetitionGroupDto): Promise<CompetitionGroupResponseDto> {
    this.validateId(id);
    const reference = await this.repository.findById(id);
    if (!reference) throw new CompetitionGroupNotFoundError(id);
    return this.repository.transaction(async unitOfWork => {
      // Primero la fase (padre) y luego el grupo, igual que en la creacion.
      if (!await unitOfWork.findPhaseForUpdate(reference.phaseId)) {
        throw new CompetitionGroupNotFoundError(id);
      }
      const group = await unitOfWork.findGroupForUpdate(id);
      if (!group) throw new CompetitionGroupNotFoundError(id);
      if (dto.name !== undefined) {
        const taken = (await unitOfWork.findByPhase(group.phaseId))
          .some(other => other.id !== id && normalize(other.name) === normalize(dto.name as string));
        if (taken) throw new CompetitionGroupNameTakenError(dto.name.trim());
      }
      const saved = await unitOfWork.save(this.mapper.mergeEntity(group, dto));
      return this.mapper.toResponseDto(saved);
    });
  }

  async remove(id: number): Promise<{ message: string }> {
    this.validateId(id);
    if (!await this.repository.findById(id)) throw new CompetitionGroupNotFoundError(id);
    if (!await this.repository.remove(id)) throw new CompetitionGroupNotFoundError(id);
    return { message: `Grupo #${id} eliminado correctamente; los equipos se conservaron` };
  }

  private validateNames(names: string[]): void {
    if (!Array.isArray(names) || names.length === 0) {
      throw new CompetitionGroupInputInvalidError('Debe registrar al menos un grupo');
    }
    if (new Set(names.map(normalize)).size !== names.length) {
      throw new CompetitionGroupInputInvalidError('La lista contiene grupos con el mismo nombre');
    }
  }

  private validateId(id: number): void {
    if (!Number.isSafeInteger(id) || id < 1 || id > MAX_DATABASE_ID) {
      throw new CompetitionGroupInputInvalidError(
        'El identificador debe ser un entero positivo de hasta 2147483647',
      );
    }
  }
}
