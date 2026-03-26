import { Transform } from 'class-transformer';
import { IsString } from 'class-validator';
import { NameTransform } from '../../common/name.transform';

export class CheckDuplicateCiudadanoDto {
  @NameTransform()
  @IsString()
  name: string;

  @NameTransform()
  @IsString()
  last_name_father: string;

  @NameTransform()
  @IsString()
  last_name_mother?: string;
}
