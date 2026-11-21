import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { CreateTeamDto } from './dto/create-team.dto';
import { TeamResponseDto } from './dto/team-response.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { Team } from './entities/team.entity';
import { TeamMapper } from './mappers/team.mapper';
import { TeamsRepository } from './repositories/teams.repository';

@Injectable()
export class TeamsService {
  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly teamMapper: TeamMapper,
  ) {}

  async create(dto: CreateTeamDto): Promise<TeamResponseDto> {
    const saved = await this.saveTeam(this.teamMapper.toEntity(dto));
    return this.teamMapper.toResponseDto(saved);
  }

  async findAll(): Promise<TeamResponseDto[]> {
    return this.teamMapper.toResponseDtoList(await this.teamsRepository.findAll());
  }

  async findOne(id: number): Promise<TeamResponseDto> {
    return this.teamMapper.toResponseDto(await this.findTeam(id));
  }

  async update(id: number, dto: UpdateTeamDto): Promise<TeamResponseDto> {
    const team = await this.findTeam(id);
    const saved = await this.saveTeam(this.teamMapper.mergeEntity(team, dto));
    return this.teamMapper.toResponseDto(saved);
  }

  async remove(id: number): Promise<{ message: string }> {
    await this.findTeam(id);
    try {
      // Repository.delete preserves restrictive foreign keys without ORM cascades.
      if (!await this.teamsRepository.remove(id)) {
        throw new NotFoundException(`Equipo con id ${id} no encontrado`);
      }
    } catch (error: unknown) {
      if (this.isForeignKeyViolation(error)) {
        throw new ConflictException(
          'No se puede eliminar el equipo porque tiene informacion asociada; puede desactivarlo',
        );
      }
      throw error;
    }
    return { message: `Equipo #${id} eliminado correctamente` };
  }

  private async findTeam(id: number): Promise<Team> {
    const team = await this.teamsRepository.findById(id);
    if (!team) throw new NotFoundException(`Equipo con id ${id} no encontrado`);
    return team;
  }

  private async saveTeam(team: Team): Promise<Team> {
    try {
      return await this.teamsRepository.save(team);
    } catch (error: unknown) {
      if (this.isForeignKeyViolation(error)) {
        throw new ConflictException(
          'No se puede guardar el equipo porque una relacion asociada no es valida o impide el cambio',
        );
      }
      throw error;
    }
  }

  private isForeignKeyViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) return false;
    const driverError: unknown = error.driverError;
    return typeof driverError === 'object' && driverError !== null
      && 'code' in driverError && typeof driverError.code === 'string'
      && ['ER_ROW_IS_REFERENCED_2', 'ER_NO_REFERENCED_ROW_2',
        'ER_ROW_IS_REFERENCED', 'ER_NO_REFERENCED_ROW'].includes(driverError.code);
  }
}
