import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { CreateTeamSportDto } from './dto/create-team-sport.dto';
import { TeamSportResponseDto } from './dto/team-sport-response.dto';
import { TeamSportMapper } from './mappers/team-sport.mapper';
import { TeamSportsRepository } from './repositories/team-sports.repository';

@Injectable()
export class TeamSportsService {
  constructor(
    private readonly teamSportsRepository: TeamSportsRepository,
    private readonly teamSportMapper: TeamSportMapper,
  ) {}

  async create(dto: CreateTeamSportDto): Promise<TeamSportResponseDto> {
    this.validateIds(dto.teamId, dto.sportId);
    const team = await this.findTeam(dto.teamId);
    const sport = await this.findSport(dto.sportId);
    if (await this.teamSportsRepository.findByPair(dto.teamId, dto.sportId)) {
      throw new ConflictException('El equipo ya esta asociado a ese deporte');
    }
    try {
      const saved = await this.teamSportsRepository.save(this.teamSportMapper.toEntity(dto, team, sport));
      return this.teamSportMapper.toResponseDto(saved);
    } catch (error: unknown) {
      const code = this.databaseCode(error);
      if (code === 'ER_DUP_ENTRY') throw new ConflictException('El equipo ya esta asociado a ese deporte');
      if (code === 'ER_NO_REFERENCED_ROW_2' || code === 'ER_NO_REFERENCED_ROW') {
        throw new NotFoundException('El equipo o el deporte ya no existe');
      }
      throw error;
    }
  }

  async findByTeam(teamId: number): Promise<TeamSportResponseDto[]> {
    this.validateIds(teamId);
    await this.findTeam(teamId);
    return this.teamSportMapper.toResponseDtoList(await this.teamSportsRepository.findByTeamId(teamId));
  }

  async findBySport(sportId: number): Promise<TeamSportResponseDto[]> {
    this.validateIds(sportId);
    await this.findSport(sportId);
    return this.teamSportMapper.toResponseDtoList(await this.teamSportsRepository.findBySportId(sportId));
  }

  async remove(teamId: number, sportId: number): Promise<{ message: string }> {
    this.validateIds(teamId, sportId);
    if (!await this.teamSportsRepository.findByPair(teamId, sportId)) {
      throw new NotFoundException('Asociacion entre equipo y deporte no encontrada');
    }
    try {
      if (!await this.teamSportsRepository.remove(teamId, sportId)) {
        throw new NotFoundException('Asociacion entre equipo y deporte no encontrada');
      }
    } catch (error: unknown) {
      const code = this.databaseCode(error);
      if (code === 'ER_ROW_IS_REFERENCED_2' || code === 'ER_ROW_IS_REFERENCED') {
        throw new ConflictException('La asociacion tiene informacion vinculada que impide retirarla');
      }
      throw error;
    }
    return { message: 'Asociacion retirada correctamente; equipo y deporte conservados' };
  }

  private async findTeam(id: number) {
    const team = await this.teamSportsRepository.findTeamById(id);
    if (!team) throw new NotFoundException(`Equipo con id ${id} no encontrado`);
    return team;
  }

  private async findSport(id: number) {
    const sport = await this.teamSportsRepository.findSportById(id);
    if (!sport) throw new NotFoundException(`Deporte con id ${id} no encontrado`);
    return sport;
  }

  private validateIds(...ids: number[]): void {
    if (ids.some(id => !Number.isSafeInteger(id) || id < 1 || id > 2147483647)) {
      throw new BadRequestException('Los identificadores deben ser enteros positivos de hasta 2147483647');
    }
  }

  private databaseCode(error: unknown): string | undefined {
    if (!(error instanceof QueryFailedError)) return undefined;
    const driverError: unknown = error.driverError;
    return typeof driverError === 'object' && driverError !== null && 'code' in driverError
      && typeof driverError.code === 'string' ? driverError.code : undefined;
  }
}
