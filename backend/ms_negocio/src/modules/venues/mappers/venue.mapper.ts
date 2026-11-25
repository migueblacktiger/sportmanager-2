import { Injectable } from '@nestjs/common';
import { CreateVenueDto } from '../dto/create-venue.dto';
import { UpdateVenueDto } from '../dto/update-venue.dto';
import { VenueResponseDto } from '../dto/venue-response.dto';
import { Venue } from '../entities/venue.entity';

@Injectable()
export class VenueMapper {
  toEntity(dto: CreateVenueDto): Venue {
    const venue = new Venue();
    venue.name = dto.name;
    venue.address = dto.address ?? null;
    venue.description = dto.description ?? null;
    venue.active = true;
    return venue;
  }

  mergeEntity(entity: Venue, dto: UpdateVenueDto): Venue {
    if (dto.name !== undefined) entity.name = dto.name;
    if (dto.address !== undefined) entity.address = dto.address;
    if (dto.description !== undefined) entity.description = dto.description;
    if (dto.active !== undefined) entity.active = dto.active;
    return entity;
  }

  toResponseDto(entity: Venue): VenueResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      address: entity.address,
      description: entity.description,
      active: entity.active,
    };
  }

  toResponseDtoList(entities: Venue[]): VenueResponseDto[] {
    return entities.map(entity => this.toResponseDto(entity));
  }
}
