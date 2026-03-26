import { PartialType } from '@nestjs/mapped-types';
import { CreateCatalogoServicioDto } from './create-catalogo_servicio.dto';

export class UpdateCatalogoServicioDto extends PartialType(CreateCatalogoServicioDto){}
