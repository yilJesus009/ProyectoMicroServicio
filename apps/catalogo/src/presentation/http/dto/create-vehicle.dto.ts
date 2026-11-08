import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

/** El año valido va de 1950 al año siguiente al actual (p.ej. modelos del año entrante). */
const MIN_YEAR = 1950;
const MAX_YEAR = new Date().getFullYear() + 1;

export class CreateVehicleDto {
  @IsString()
  @IsNotEmpty()
  brand: string;

  @IsString()
  @IsNotEmpty()
  model: string;

  @IsInt()
  @Min(MIN_YEAR)
  @Max(MAX_YEAR)
  year: number;

  @IsOptional()
  @IsString()
  plate?: string;
}
