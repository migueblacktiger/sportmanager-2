import { Injectable } from '@nestjs/common';
import { CreateTournamentDto } from '../dto/create-tournament.dto';
import { TournamentResponseDto } from '../dto/tournament-response.dto';
import { UpdateTournamentDto } from '../dto/update-tournament.dto';
import { Tournament } from '../entities/tournament.entity';

@Injectable()
export class TournamentMapper {
  toEntity(dto: CreateTournamentDto): Tournament {
    const tournament = new Tournament();
    tournament.name = dto.name.trim();
    tournament.sportId = dto.sportId;
    tournament.registrationStartsAt = new Date(dto.registrationStartsAt);
    tournament.registrationEndsAt = new Date(dto.registrationEndsAt);
    tournament.startsAt = new Date(dto.startsAt);
    return tournament;
  }

  mergeEntity(entity: Tournament, dto: UpdateTournamentDto): Tournament {
    if (dto.name !== undefined) entity.name = dto.name.trim();
    if (dto.sportId !== undefined) entity.sportId = dto.sportId;
    if (dto.registrationStartsAt !== undefined) {
      entity.registrationStartsAt = new Date(dto.registrationStartsAt);
    }
    if (dto.registrationEndsAt !== undefined) {
      entity.registrationEndsAt = new Date(dto.registrationEndsAt);
    }
    if (dto.startsAt !== undefined) entity.startsAt = new Date(dto.startsAt);
    return entity;
  }

  toResponseDto(entity: Tournament): TournamentResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      sportId: entity.sportId,
      registrationStartsAt: entity.registrationStartsAt.toISOString(),
      registrationEndsAt: entity.registrationEndsAt.toISOString(),
      startsAt: entity.startsAt.toISOString(),
    };
  }

  toResponseDtoList(entities: Tournament[]): TournamentResponseDto[] {
    return entities.map((entity) => this.toResponseDto(entity));
  }
}
