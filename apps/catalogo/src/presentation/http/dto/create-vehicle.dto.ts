import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

/** El año valido va de 1950 al año siguiente al actual (p.ej. modelos del año entrante). */
const MIN_YEAR = 1950;
const MAX_YEAR = new Date().getFullYear() + 1;

export class CreateVehicleDto {
  @IsString({ message: 'La marca debe ser un texto' })
  @IsNotEmpty({ message: 'La marca es obligatoria' })
  brand: string;

  @IsString({ message: 'El modelo debe ser un texto' })
  @IsNotEmpty({ message: 'El modelo es obligatorio' })
  model: string;

  @IsInt({ message: 'El año debe ser un número entero' })
  @Min(MIN_YEAR, { message: `El año debe ser ${MIN_YEAR} o posterior` })
  @Max(MAX_YEAR, { message: `El año no puede ser posterior a ${MAX_YEAR}` })
  year: number;

  @IsOptional()
  @IsString({ message: 'La patente debe ser un texto' })
  plate?: string;
}
