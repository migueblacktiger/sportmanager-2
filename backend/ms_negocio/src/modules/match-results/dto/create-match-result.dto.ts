import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { MatchScoreDto } from './match-score.dto';

export class CreateMatchResultDto {
  /** Exactamente un marcador por equipo participante, en cualquier orden. */
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => MatchScoreDto)
  scores!: MatchScoreDto[];

  /** true: ademas de guardar el resultado, el partido en juego pasa a finalizado y se notifica el resumen. */
  @IsOptional()
  @IsBoolean()
  finalize?: boolean;
}
