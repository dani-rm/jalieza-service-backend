import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatalogoOrden } from './entities/catalogo_orden.entity';
import { CreateCatalogoOrdenDto } from './dto/create-catalogo_orden.dto';
import { UpdateCatalogoOrdenDto } from './dto/update-catalogo_orden.dto';

@Injectable()
export class CatalogoOrdenService {
  constructor(
    @InjectRepository(CatalogoOrden)
    private readonly catalogoOrdenRepository: Repository<CatalogoOrden>,
  ) {}

  // Crear una nueva orden
  async create(createCatalogoOrdenDto: CreateCatalogoOrdenDto) {
    const nuevaOrden = this.catalogoOrdenRepository.create(createCatalogoOrdenDto);
    return await this.catalogoOrdenRepository.save(nuevaOrden);
  }

  // Obtener todas las órdenes con sus servicios
  async findAll() {
    return await this.catalogoOrdenRepository.find({
      /* order: { required_points: 'ASC' }, */
      relations: ['services'],
    });
  }

  // Obtener una orden por su ID, con servicios incluidos
  async findOne(id: number) {
    const orden = await this.catalogoOrdenRepository.findOne({
      where: { id },
      relations: ['services'],
    });

    if (!orden) {
      throw new NotFoundException(`No se encontró la orden con ID ${id}`);
    }

    return orden;
  }

  // Actualizar una orden existente
  async update(id: number, updateCatalogoOrdenDto: UpdateCatalogoOrdenDto) {
    const existing = await this.findOne(id); // lanza error si no existe
    const updated = Object.assign(existing, updateCatalogoOrdenDto);
    return await this.catalogoOrdenRepository.save(updated);
  }

  // Eliminar una orden
  async remove(id: number) {
    const result = await this.catalogoOrdenRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`No se pudo eliminar. Orden con ID ${id} no encontrada`);
    }
    return { message: `Orden con ID ${id} eliminada correctamente` };
  }
}
