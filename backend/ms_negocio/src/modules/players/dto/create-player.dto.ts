import { IsByteLength, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreatePlayerDto {
  @IsString()
  @MaxLength(180)
  @Matches(/\S/u, { message: 'El nombre no puede estar vacio ni contener solo espacios' })
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(/\S/u, { message: 'La identificacion no puede estar vacia' })
  identification?: string | null;

  @IsOptional()
  @IsString()
  @IsByteLength(0, 65535)
  description?: string | null;
}
