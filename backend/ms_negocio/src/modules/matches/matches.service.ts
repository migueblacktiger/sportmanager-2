import { Injectable } from '@nestjs/common';
import { CreateMatchDto } from './dto/create-match.dto';
import { MatchResponseDto } from './dto/match-response.dto';
import {
  MatchInputInvalidError,
  MatchNotFoundError,
  MatchPhaseNotFoundError,
} from './match.errors';
import { MatchMapper } from './mappers/match.mapper';
import { MatchesRepository } from './repositories/matches.repository';
import { MatchManagementService } from '../match-management/match-management.service';

const MAX_DATABASE_ID = 2147483647;

@Injectable()
export class MatchesService {
  constructor(
    private readonly repository: MatchesRepository,
    private readonly mapper: MatchMapper,
    private readonly matchManagement: MatchManagementService,
  ) {}

  async create(
    phaseId: number,
    dto: CreateMatchDto,
    authorization?: string,
  ): Promise<MatchResponseDto> {
    this.validateId(phaseId);
    const reference = await this.repository.findPhase(phaseId);
    if (!reference) throw new MatchPhaseNotFoundError(phaseId);
    const managed = await this.matchManagement.create(
      reference.tournamentId, phaseId, dto, authorization,
    );
    return {
      id: managed.id,
      phaseId: managed.phaseId,
      phaseName: managed.phaseName,
      phaseType: managed.phaseType,
      tournamentId: managed.tournamentId,
      isFinalPhase: managed.isFinalPhase,
      homeTeamId: managed.homeTeamId,
      homeTeamName: managed.homeTeamName,
      awayTeamId: managed.awayTeamId,
      awayTeamName: managed.awayTeamName,
      scheduledAt: managed.scheduledAt,
      notification: managed.notification,
    };
  }

  async findByPhase(phaseId: number): Promise<MatchResponseDto[]> {
    this.validateId(phaseId);
    if (!await this.repository.findPhase(phaseId)) throw new MatchPhaseNotFoundError(phaseId);
    return this.mapper.toResponseDtoList(await this.repository.findByPhase(phaseId));
  }

  async findOne(id: number): Promise<MatchResponseDto> {
    this.validateId(id);
    const match = await this.repository.findById(id);
    if (!match) throw new MatchNotFoundError(id);
    return this.mapper.toResponseDto(match);
  }

  async remove(id: number): Promise<{ message: string }> {
    this.validateId(id);
    const match = await this.repository.findById(id);
    if (!match) throw new MatchNotFoundError(id);
    return this.matchManagement.remove(match.phase.tournamentId, id);
  }

  private validateId(id: number): void {
    if (!Number.isSafeInteger(id) || id < 1 || id > MAX_DATABASE_ID) {
      throw new MatchInputInvalidError(
        'El identificador debe ser un entero positivo de hasta 2147483647',
      );
    }
  }
}
