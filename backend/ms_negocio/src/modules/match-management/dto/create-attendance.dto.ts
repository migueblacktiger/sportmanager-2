import { IsInt, Max, Min } from 'class-validator';

export class CreateAttendanceDto {
  /** Id del aficionado (usuario) en ms_security. */
  @IsInt()
  @Min(1)
  @Max(2147483647)
  fanId!: number;
}
