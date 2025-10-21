import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
} from 'class-validator';
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

  @Transform(({ value }) => {
    if (!value || value === '') return undefined; // permite vacío
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date; // si no es fecha válida, undefined también
  })
  @Type(() => Date)
  @IsOptional()
  @IsDate()
  birth_date?: Date | null;
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
