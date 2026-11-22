import { PlayerResponseDto } from '../../players/dto/player-response.dto';
import { SkillResponseDto } from '../../skills/dto/skill-response.dto';

export class PlayerSkillResponseDto {
  id!: number;
  playerId!: number;
  skillId!: number;
  player!: PlayerResponseDto;
  skill!: SkillResponseDto;
}
