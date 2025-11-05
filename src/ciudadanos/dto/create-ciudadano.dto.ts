import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { MaritalStatus } from '../enums/marital-status.enum';
import { NameTransform } from '../../common/name.transform';

export class CreateCiudadanoDto {
  @NameTransform()
  @IsString()
  name: string;

  @NameTransform()  
  @IsString()
  last_name_father: string;

  @IsOptional()
  @NameTransform()
  @IsString()
  last_name_mother?: string | null;

  @IsOptional()
  @Transform(({ value }) => value?.trim?.())
  @IsString()
  comment?: string | null;

  // Mantener el DTO como string (YYYY-MM-DD) para evitar problemas de zona horaria
  // y parsear en el servicio como se hace en servicios_ciudadanos
  @Transform(({ value }) => {
    // Si es string vacío, null o undefined, retornar null
    if (!value || value === '') return null;
    return value;
  })
  @IsOptional()
  @IsDateString()
  birth_date?: string | null;
  @IsOptional()
  @Transform(({ value }) => value?.trim?.())
  @IsString()
  phone?: string | null;

  @IsEnum(MaritalStatus)
  marital_status: MaritalStatus;

  @IsOptional()
  @IsNumber()
  partner?: number | null; // O partner_id si usas solo el ID
}
