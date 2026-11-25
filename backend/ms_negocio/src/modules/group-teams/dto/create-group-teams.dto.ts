import { ArrayNotEmpty, ArrayUnique, IsArray, IsInt, Max, Min } from 'class-validator';

export class CreateGroupTeamsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(2147483647, { each: true })
  teamIds!: number[];
}
