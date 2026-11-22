import { Injectable } from '@nestjs/common';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { TournamentResponseDto } from './dto/tournament-response.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { Tournament } from './entities/tournament.entity';
import { TournamentMapper } from './mappers/tournament.mapper';
import {
  TournamentDeleteRestrictedError,
  TournamentSportReferenceError,
} from './repositories/tournament-repository.errors';
import { TournamentsRepository } from './repositories/tournaments.repository';
import {
  TournamentDatesInvalidError,
  TournamentHasDependenciesError,
  TournamentNotFoundError,
  TournamentSportNotFoundError,
} from './tournament.errors';

@Injectable()
export class TournamentsService {
  constructor(
    private readonly tournamentsRepository: TournamentsRepository,
    private readonly tournamentMapper: TournamentMapper,
  ) {}

  async create(dto: CreateTournamentDto): Promise<TournamentResponseDto> {
    const tournament = this.tournamentMapper.toEntity(dto);
    this.validateSchedule(tournament);
    await this.ensureSportExists(dto.sportId);
    const saved = await this.saveTournament(tournament);
    return this.tournamentMapper.toResponseDto(saved);
  }

  async findAll(): Promise<TournamentResponseDto[]> {
    const tournaments = await this.tournamentsRepository.findAll();
    return this.tournamentMapper.toResponseDtoList(tournaments);
  }

  async findOne(id: number): Promise<TournamentResponseDto> {
    return this.tournamentMapper.toResponseDto(await this.findTournament(id));
  }

  async update(id: number, dto: UpdateTournamentDto): Promise<TournamentResponseDto> {
    const tournament = await this.findTournament(id);
    const updated = this.tournamentMapper.mergeEntity(tournament, dto);
    this.validateSchedule(updated);
    if (dto.sportId !== undefined) await this.ensureSportExists(dto.sportId);
    const saved = await this.saveTournament(updated);
    return this.tournamentMapper.toResponseDto(saved);
  }

  async remove(id: number): Promise<{ message: string }> {
    await this.findTournament(id);
    try {
      if (!await this.tournamentsRepository.remove(id)) {
        throw new TournamentNotFoundError(id);
      }
    } catch (error: unknown) {
      if (error instanceof TournamentDeleteRestrictedError) {
        throw new TournamentHasDependenciesError(id);
      }
      throw error;
    }
    return { message: `Torneo #${id} eliminado correctamente` };
  }

  private async findTournament(id: number): Promise<Tournament> {
    const tournament = await this.tournamentsRepository.findById(id);
    if (!tournament) throw new TournamentNotFoundError(id);
    return tournament;
  }

  private async ensureSportExists(id: number): Promise<void> {
    if (!await this.tournamentsRepository.findSportById(id)) {
      throw new TournamentSportNotFoundError(id);
    }
  }

  private async saveTournament(tournament: Tournament): Promise<Tournament> {
    try {
      return await this.tournamentsRepository.save(tournament);
    } catch (error: unknown) {
      if (error instanceof TournamentSportReferenceError) {
        throw new TournamentSportNotFoundError(tournament.sportId);
      }
      throw error;
    }
  }

  private validateSchedule(tournament: Tournament): void {
    const { registrationStartsAt, registrationEndsAt, startsAt } = tournament;
    if (
      Number.isNaN(registrationStartsAt.getTime())
      || Number.isNaN(registrationEndsAt.getTime())
      || Number.isNaN(startsAt.getTime())
      || registrationStartsAt >= registrationEndsAt
      || registrationEndsAt > startsAt
    ) {
      throw new TournamentDatesInvalidError();
    }
  }
}
