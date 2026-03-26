import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ServiceStatus } from '../enums/service-status.enum';

export class CreateServiciosCiudadanoDto {
  @IsInt()
  ciudadano_id: number;

  @IsInt()
  service_id: number;

  @IsDateString()
  start_date: string;

  @IsDateString()
  @IsOptional()
  end_date: string;

  @IsEnum(ServiceStatus)
  service_status: ServiceStatus;

  @IsString()
  @IsOptional()
  observations?: string;
}
