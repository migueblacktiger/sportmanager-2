import { IsByteLength, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateVenueDto {
  @IsString()
  @MaxLength(180)
  @Matches(/\S/u, { message: 'El nombre no puede estar vacio ni contener solo espacios' })
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string | null;

  @IsOptional()
  @IsString()
  @IsByteLength(0, 65535)
  description?: string | null;
}
