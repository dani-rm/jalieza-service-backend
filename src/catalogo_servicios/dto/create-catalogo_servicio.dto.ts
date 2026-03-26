import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class CreateCatalogoServicioDto {
  @IsNotEmpty()
  @IsString()
  service_name: string;

  /* @IsNotEmpty()
  @IsString()
  description: string; */

  @IsNotEmpty()
  @IsNumber()
  orden_id: number; // Foreign key que se usa en @JoinColumn
}
