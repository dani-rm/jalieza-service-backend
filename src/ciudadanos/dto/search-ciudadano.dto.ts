import { IsString, MinLength } from 'class-validator';
import { NameTransform } from '../../common/name.transform';

export class SearchCiudadanoDto {
  @IsString()
  @MinLength(2, { message: 'La búsqueda debe tener al menos 2 caracteres' })
  @NameTransform()
  query: string;
}
