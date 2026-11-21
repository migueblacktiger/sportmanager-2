import { TeamResponseDto } from '../../teams/dto/team-response.dto';
import { SportResponseDto } from '../../sports/dto/sport-response.dto';

export class TeamSportResponseDto {
  id!: number;
  teamId!: number;
  sportId!: number;
  team!: TeamResponseDto;
  sport!: SportResponseDto;
}
