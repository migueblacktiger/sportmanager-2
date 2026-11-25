import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { MatchScoreDto } from './match-score.dto';

export class UpdateMatchResultDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => MatchScoreDto)
  scores?: MatchScoreDto[];

  @IsOptional()
  @IsBoolean()
  finalize?: boolean;
}
