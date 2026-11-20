import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { CreateSportDto } from './dto/create-sport.dto';
import { SportResponseDto } from './dto/sport-response.dto';
import { UpdateSportDto } from './dto/update-sport.dto';
import { Sport } from './entities/sport.entity';
import { SportMapper } from './mappers/sport.mapper';
import { SportsRepository } from './repositories/sports.repository';

@Injectable()
export class SportsService {
  constructor(
    private readonly sportsRepository: SportsRepository,
    private readonly sportMapper: SportMapper,
  ) {}

  async create(dto: CreateSportDto): Promise<SportResponseDto> {
    await this.ensureUniqueName(dto.name);
    if (dto.parentId !== undefined && dto.parentId !== null) {
      await this.validateParentChain(dto.parentId);
    }
    const saved = await this.saveSport(this.sportMapper.toEntity(dto));
    return this.sportMapper.toResponseDto(saved);
  }

  async findAll(): Promise<SportResponseDto[]> {
    return this.sportMapper.toResponseDtoList(await this.sportsRepository.findAll());
  }

  async findOne(id: number): Promise<SportResponseDto> {
    return this.sportMapper.toResponseDto(await this.findSport(id));
  }

  async update(id: number, dto: UpdateSportDto): Promise<SportResponseDto> {
    const sport = await this.findSport(id);
    if (dto.name !== undefined) {
      await this.ensureUniqueName(dto.name, id);
    }

    const parentId = dto.parentId === undefined ? sport.parentId : dto.parentId;
    if (parentId !== null) {
      const assigningParent = dto.parentId !== undefined;
      const reactivating = dto.active === true && !sport.active;
      await this.validateParentChain(parentId, id, assigningParent || reactivating);
    }

    const saved = await this.saveSport(this.sportMapper.mergeEntity(sport, dto));
    return this.sportMapper.toResponseDto(saved);
  }

  async remove(id: number): Promise<{ message: string }> {
    await this.findSport(id);
    if (await this.sportsRepository.hasChildren(id)) {
      throw new ConflictException(
        'No se puede eliminar un deporte con subdeportes; puede desactivarlo',
      );
    }

    try {
      if (!await this.sportsRepository.remove(id)) {
        throw new NotFoundException(`Deporte con id ${id} no encontrado`);
      }
    } catch (error: unknown) {
      if (this.hasDatabaseCode(error, 'ER_ROW_IS_REFERENCED_2')) {
        // Covers new children arriving after the check and future restrictive FKs.
        throw new ConflictException(
          'No se puede eliminar el deporte porque tiene informacion asociada',
        );
      }
      throw error;
    }
    return { message: `Deporte #${id} eliminado correctamente` };
  }

  private async findSport(id: number): Promise<Sport> {
    const sport = await this.sportsRepository.findById(id);
    if (!sport) throw new NotFoundException(`Deporte con id ${id} no encontrado`);
    return sport;
  }

  private async ensureUniqueName(name: string, excludeId?: number): Promise<void> {
    if (await this.sportsRepository.existsByName(name, excludeId)) {
      throw new ConflictException('Ya existe un deporte con ese nombre');
    }
  }

  private async validateParentChain(
    parentId: number,
    sportId?: number,
    requireActiveParent = true,
  ): Promise<void> {
    const visited = new Set<number>();
    let currentId: number | null = parentId;
    while (currentId !== null) {
      if (currentId === sportId) {
        throw new BadRequestException(
          parentId === sportId
            ? 'Un deporte no puede ser su propio padre'
            : 'El padre indicado generaria un ciclo entre deportes',
        );
      }
      if (visited.has(currentId)) {
        throw new ConflictException('La jerarquia del padre indicado ya contiene un ciclo');
      }
      visited.add(currentId);
      const ancestor = await this.sportsRepository.findById(currentId);
      if (!ancestor) {
        if (currentId === parentId) {
          throw new NotFoundException(`Deporte padre con id ${parentId} no encontrado`);
        }
        throw new ConflictException('La jerarquia del padre contiene una referencia inexistente');
      }
      if (currentId === parentId && requireActiveParent && !ancestor.active) {
        throw new ConflictException('No se puede asignar o reactivar un deporte con padre inactivo');
      }
      currentId = ancestor.parentId;
    }
  }

  private async saveSport(sport: Sport): Promise<Sport> {
    try {
      return await this.sportsRepository.save(sport);
    } catch (error: unknown) {
      // The unique index also protects concurrent requests after the pre-check.
      if (this.hasDatabaseCode(error, 'ER_DUP_ENTRY')) {
        throw new ConflictException('Ya existe un deporte con ese nombre');
      }
      if (this.hasDatabaseCode(error, 'ER_NO_REFERENCED_ROW_2')) {
        throw new ConflictException('El deporte padre ya no existe; revise la asociacion');
      }
      throw error;
    }
  }

  private hasDatabaseCode(error: unknown, code: string): boolean {
    if (!(error instanceof QueryFailedError)) return false;
    const driverError: unknown = error.driverError;
    return typeof driverError === 'object' && driverError !== null
      && 'code' in driverError && driverError.code === code;
  }
}
