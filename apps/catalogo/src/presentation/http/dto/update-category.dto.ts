import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateCategoryDto {
  @ApiProperty({ example: 'Frenos' })
  @IsString({ message: 'El nombre debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name: string;

  @ApiPropertyOptional({ example: 'Pastillas, discos y accesorios de freno' })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser un texto' })
  description?: string;

  @ApiPropertyOptional({ example: 'brake' })
  @IsOptional()
  @IsString({ message: 'El ícono debe ser un texto' })
  icon?: string;
}
