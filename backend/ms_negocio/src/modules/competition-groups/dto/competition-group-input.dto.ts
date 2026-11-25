import { IsString, Matches, MaxLength } from 'class-validator';

export class CompetitionGroupInputDto {
  @IsString()
  @MaxLength(180)
  @Matches(/\S/u, { message: 'El nombre no puede estar vacio ni contener solo espacios' })
  name!: string;
}
