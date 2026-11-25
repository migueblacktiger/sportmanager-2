import { IsInt, Min } from 'class-validator';
import { MatchAudienceSource } from '../match-audience-source';

export class RegisterMatchAudienceDto {
  @IsInt()
  @Min(1)
  fanId!: number;
}

export class MatchAudienceMemberDto {
  id!: number;
  email?: string;
  name?: string;
}

export class MatchAudienceRegistrationDto {
  matchId!: number;
  fanId!: number;
  source!: MatchAudienceSource;
}
