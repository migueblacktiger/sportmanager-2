import { IsInt, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

// El tipo no forma parte del contrato: toda fase creada por este modulo es de tipo final.
export class CreateFinalPhaseDto {
  @IsString()
  @MaxLength(180)
  @Matches(/\S/u, { message: 'El nombre no puede estar vacio ni contener solo espacios' })
  name!: string;

  @IsInt()
  @Min(1)
  @Max(2147483647)
  order!: number;
}
