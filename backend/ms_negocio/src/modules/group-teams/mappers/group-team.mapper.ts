import { Injectable } from '@nestjs/common';
import { GroupTeamResponseDto } from '../dto/group-team-response.dto';
import { GroupTeam } from '../entities/group-team.entity';

@Injectable()
export class GroupTeamMapper {
  // Requiere cargadas las relaciones group, phase y team.
  toResponseDto(entity: GroupTeam): GroupTeamResponseDto {
    return {
      id: entity.id,
      groupId: entity.groupId,
      groupName: entity.group.name,
      phaseId: entity.phaseId,
      tournamentId: entity.phase.tournamentId,
      teamId: entity.teamId,
      teamName: entity.team.name,
      teamActive: entity.team.active,
    };
  }

  toResponseDtoList(entities: GroupTeam[]): GroupTeamResponseDto[] {
    return entities.map(entity => this.toResponseDto(entity));
  }
}
