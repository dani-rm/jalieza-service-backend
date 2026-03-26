import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCatalogoServicioDto } from './dto/create-catalogo_servicio.dto';
import { UpdateCatalogoServicioDto } from './dto/update-catalogo_servicio.dto';
import { CatalogoServicio } from '../catalogo_servicios/entities/catalogo_servicio.entity';
import { CatalogoOrden } from '../catalogo_orden/entities/catalogo_orden.entity';

@Injectable()
export class CatalogoServiciosService {
  constructor(
    @InjectRepository(CatalogoServicio)
    private readonly catalogoServiciosRepository: Repository<CatalogoServicio>,
    @InjectRepository(CatalogoOrden)
    private readonly catalogoOrdenRepository: Repository<CatalogoOrden>,
  ) {}

  async create(createCatalogoServicioDto: CreateCatalogoServicioDto): Promise<CatalogoServicio> {
  // Buscar la orden primero
  const orden = await this.catalogoOrdenRepository.findOneBy({ 
    id: createCatalogoServicioDto.orden_id 
  });
  
  if (!orden) {
    throw new NotFoundException(`Orden con id ${createCatalogoServicioDto.orden_id} no encontrada`);
  }

  // Crear el servicio con la relación correcta
  const nuevoServicio = this.catalogoServiciosRepository.create({
    service_name: createCatalogoServicioDto.service_name,
    order: orden, // ✅ Pasar la relación completa
  });
  
  return await this.catalogoServiciosRepository.save(nuevoServicio);
}

  async findAll(): Promise<CatalogoServicio[]> {
  return await this.catalogoServiciosRepository.find({
    relations: ['order'], // ✅ Incluir la relación
  });
}

  async findOne(id: number): Promise<CatalogoServicio> {
  const servicio = await this.catalogoServiciosRepository.findOne({
    where: { id },
    relations: ['order'], // ✅ Incluir la relación
  });
  if (!servicio) {
    throw new NotFoundException(`Servicio con id ${id} no encontrado`);
  }
  return servicio;
}

  async update(id: number, updateCatalogoServicioDto: UpdateCatalogoServicioDto): Promise<CatalogoServicio> {
    const servicio = await this.findOne(id);
    Object.assign(servicio, updateCatalogoServicioDto);
    return await this.catalogoServiciosRepository.save(servicio);
  }

  async remove(id: number): Promise<void> {
    const resultado = await this.catalogoServiciosRepository.delete(id);
    if (resultado.affected === 0) {
      throw new NotFoundException(`Servicio con id ${id} no encontrado`);
    }
  }
}
