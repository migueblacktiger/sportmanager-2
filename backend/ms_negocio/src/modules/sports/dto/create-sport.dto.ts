import {
  IsByteLength,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSportDto {
  @IsString()
  @MaxLength(180)
  @Matches(/\S/u, { message: 'El nombre no puede estar vacio ni contener solo espacios' })
  name!: string;

  @IsOptional()
  @IsString()
  @IsByteLength(0, 65535)
  description?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2147483647)
  parentId?: number | null;
}
