import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { CreatePlayerTeamDto } from './dto/create-player-team.dto';
import { PlayerTeamResponseDto } from './dto/player-team-response.dto';
import { PlayerTeamStatus } from './dto/player-team-status';
import { PlayerTeam } from './entities/player-team.entity';
import { PlayerTeamMapper } from './mappers/player-team.mapper';
import { bogotaMidnight, isContractDate } from './player-team-dates';
import { PlayerTeamsRepository } from './repositories/player-teams.repository';

@Injectable()
export class PlayerTeamsService {
  constructor(private readonly repository: PlayerTeamsRepository, private readonly mapper: PlayerTeamMapper) {}

  async create(dto: CreatePlayerTeamDto): Promise<PlayerTeamResponseDto> {
    this.validateId(dto.playerId); this.validateId(dto.teamId);
    if (!isContractDate(dto.startDate) || !isContractDate(dto.endDate) || dto.endDate < dto.startDate) {
      throw new BadRequestException('Las fechas deben ser reales, tener formato YYYY-MM-DD y fin mayor o igual al inicio');
    }
    try {
      return await this.repository.transaction(async unit => {
        // All mutations acquire the same parent lock first, including first-ever assignments.
        const player = await unit.findPlayerForUpdate(dto.playerId);
        if (!player) throw new NotFoundException('Jugador no encontrado');
        const team = await unit.findTeamForShare(dto.teamId);
        if (!team) throw new NotFoundException('Equipo no encontrado');
        const existing = await unit.findPairForUpdate(dto.playerId, dto.teamId);
        const candidate = this.mapper.toEntity(dto, player, team);
        const [start, end] = this.interval(candidate);
        if (existing.some(contract => {
          const [otherStart, otherEnd] = this.interval(contract);
          return otherStart < otherEnd && start < otherEnd && otherStart < end;
        })) throw new ConflictException('El jugador ya tiene un contrato con este equipo en un periodo efectivo solapado');
        const saved = await unit.save(candidate);
        return this.mapper.toResponseDto(saved, this.status(saved, new Date()));
      });
    } catch (error: unknown) {
      if (error instanceof QueryFailedError && ['ER_NO_REFERENCED_ROW_2', 'ER_NO_REFERENCED_ROW'].includes(error.driverError?.code)) {
        throw new NotFoundException('El jugador o el equipo ya no existe');
      }
      throw error;
    }
  }

  async findByTeam(teamId: number, status?: PlayerTeamStatus): Promise<PlayerTeamResponseDto[]> {
    this.validateId(teamId); this.validateStatus(status);
    if (!await this.repository.findTeam(teamId)) throw new NotFoundException('Equipo no encontrado');
    return this.responses(await this.repository.findByTeam(teamId), status);
  }

  async findByPlayer(playerId: number, status?: PlayerTeamStatus): Promise<PlayerTeamResponseDto[]> {
    this.validateId(playerId); this.validateStatus(status);
    if (!await this.repository.findPlayer(playerId)) throw new NotFoundException('Jugador no encontrado');
    return this.responses(await this.repository.findByPlayer(playerId), status);
  }

  async finish(id: number): Promise<PlayerTeamResponseDto> {
    this.validateId(id);
    // Read only the immutable player ID; recheck the contract after taking its parent's lock.
    const reference = await this.repository.findById(id);
    if (!reference) throw new NotFoundException('Contrato no encontrado');
    return this.repository.transaction(async unit => {
      if (!await unit.findPlayerForUpdate(reference.playerId)) throw new NotFoundException('Jugador no encontrado');
      const contract = await unit.findContractForUpdate(id);
      if (!contract) throw new NotFoundException('Contrato no encontrado');
      const now = new Date();
      // Natural expiry stays vencida. A repeat never changes the original finish timestamp.
      if (contract.finishedAt === null && now.getTime() < bogotaMidnight(contract.endDate, true)) {
        contract.finishedAt = now;
        await unit.save(contract);
      }
      const loaded = await unit.findContract(id);
      if (!loaded) throw new NotFoundException('Contrato no encontrado');
      return this.mapper.toResponseDto(loaded, this.status(loaded, now));
    });
  }

  private interval(contract: PlayerTeam): [number, number] {
    return [bogotaMidnight(contract.startDate), Math.min(
      bogotaMidnight(contract.endDate, true), contract.finishedAt?.getTime() ?? Infinity,
    )];
  }

  private status(contract: PlayerTeam, now: Date): PlayerTeamStatus {
    if (contract.finishedAt !== null) return PlayerTeamStatus.Finished;
    if (now.getTime() < bogotaMidnight(contract.startDate)) return PlayerTeamStatus.Scheduled;
    if (now.getTime() >= bogotaMidnight(contract.endDate, true)) return PlayerTeamStatus.Expired;
    return PlayerTeamStatus.Current;
  }

  private responses(contracts: PlayerTeam[], filter?: PlayerTeamStatus): PlayerTeamResponseDto[] {
    const now = new Date();
    return contracts.map(contract => this.mapper.toResponseDto(contract, this.status(contract, now)))
      .filter(response => filter === undefined || response.status === filter);
  }

  private validateId(id: number): void {
    if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) throw new BadRequestException('El identificador debe ser un entero positivo de hasta 2147483647');
  }

  private validateStatus(status?: PlayerTeamStatus): void {
    if (status !== undefined && !Object.values(PlayerTeamStatus).includes(status)) throw new BadRequestException('Estado de contrato no valido');
  }
}
