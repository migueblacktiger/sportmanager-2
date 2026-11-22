import { IsInt, Max, Min } from 'class-validator';

export class CreatePlayerSkillDto {
  @IsInt()
  @Min(1)
  @Max(2147483647)
  playerId!: number;

  @IsInt()
  @Min(1)
  @Max(2147483647)
  skillId!: number;
}
