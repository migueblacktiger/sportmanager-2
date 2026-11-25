import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { CompetitionGroupInputDto } from './competition-group-input.dto';

export class CreateCompetitionGroupsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CompetitionGroupInputDto)
  groups!: CompetitionGroupInputDto[];
}
