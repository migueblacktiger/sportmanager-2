import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { VenueResponseDto } from './dto/venue-response.dto';
import { Venue } from './entities/venue.entity';
import { VenueMapper } from './mappers/venue.mapper';
import { VenuesRepository } from './repositories/venues.repository';

const DUPLICATE_CODES = ['ER_DUP_ENTRY'];
const REFERENCE_CODES = [
  'ER_ROW_IS_REFERENCED_2', 'ER_ROW_IS_REFERENCED', 'ER_NO_REFERENCED_ROW_2', 'ER_NO_REFERENCED_ROW',
];

@Injectable()
export class VenuesService {
  constructor(
    private readonly repository: VenuesRepository,
    private readonly mapper: VenueMapper,
  ) {}

  async create(dto: CreateVenueDto): Promise<VenueResponseDto> {
    return this.mapper.toResponseDto(await this.save(this.mapper.toEntity(dto)));
  }

  async findAll(): Promise<VenueResponseDto[]> {
    return this.mapper.toResponseDtoList(await this.repository.findAll());
  }

  async findOne(id: number): Promise<VenueResponseDto> {
    return this.mapper.toResponseDto(await this.findVenue(id));
  }

  async update(id: number, dto: UpdateVenueDto): Promise<VenueResponseDto> {
    const venue = await this.findVenue(id);
    return this.mapper.toResponseDto(await this.save(this.mapper.mergeEntity(venue, dto)));
  }

  async remove(id: number): Promise<{ message: string }> {
    await this.findVenue(id);
    try {
      if (!await this.repository.remove(id)) {
        throw new NotFoundException(`Escenario con id ${id} no encontrado`);
      }
    } catch (error: unknown) {
      if (this.hasCode(error, REFERENCE_CODES)) {
        throw new ConflictException(
          'No se puede eliminar el escenario porque tiene partidos asociados; puede desactivarlo',
        );
      }
      throw error;
    }
    return { message: `Escenario #${id} eliminado correctamente` };
  }

  private async findVenue(id: number): Promise<Venue> {
    const venue = await this.repository.findById(id);
    if (!venue) throw new NotFoundException(`Escenario con id ${id} no encontrado`);
    return venue;
  }

  private async save(venue: Venue): Promise<Venue> {
    try {
      return await this.repository.save(venue);
    } catch (error: unknown) {
      if (this.hasCode(error, DUPLICATE_CODES)) {
        throw new ConflictException('Ya existe un escenario con ese nombre');
      }
      throw error;
    }
  }

  private hasCode(error: unknown, codes: string[]): boolean {
    if (!(error instanceof QueryFailedError)) return false;
    const driverError: unknown = error.driverError;
    return typeof driverError === 'object' && driverError !== null
      && 'code' in driverError && typeof driverError.code === 'string'
      && codes.includes(driverError.code);
  }
}
