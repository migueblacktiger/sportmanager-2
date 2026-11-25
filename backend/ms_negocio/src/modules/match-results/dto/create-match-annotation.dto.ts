import { IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class CreateMatchAnnotationDto {
  @IsInt()
  @Min(1)
  @Max(2147483647)
  playerId!: number;

  /** Equipo participante con el que anoto; solo es obligatorio si el jugador pertenece a ambos. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2147483647)
  teamId?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(300)
  minute?: number | null;

  /** Valor de la anotacion (por defecto 1). */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  points?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Matches(/\S/u, { message: 'La descripcion no puede contener solo espacios' })
  description?: string | null;
}
