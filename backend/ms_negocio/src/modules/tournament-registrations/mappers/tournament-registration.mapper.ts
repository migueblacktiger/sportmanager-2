import { Injectable } from '@nestjs/common';
import { TournamentRegistrationResponseDto } from '../dto/tournament-registration-response.dto';
import { TournamentRegistration } from '../entities/tournament-registration.entity';

@Injectable()
export class TournamentRegistrationMapper {
  toResponseDto(entity: TournamentRegistration): TournamentRegistrationResponseDto {
    return {
      id: entity.id,
      tournamentId: entity.tournamentId,
      tournamentName: entity.tournament.name,
      sportId: entity.tournament.sportId,
      teamId: entity.teamId,
      teamName: entity.team.name,
      teamActive: entity.team.active,
    };
  }

  toResponseDtoList(entities: TournamentRegistration[]): TournamentRegistrationResponseDto[] {
    return entities.map(entity => this.toResponseDto(entity));
  }
}
