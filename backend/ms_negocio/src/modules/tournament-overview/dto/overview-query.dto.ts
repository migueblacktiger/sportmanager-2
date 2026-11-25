import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class OverviewQueryDto {
  /** Si es true, cada partido incluye sus anotaciones; por defecto no se incluyen. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  includeAnnotations?: boolean;
}
