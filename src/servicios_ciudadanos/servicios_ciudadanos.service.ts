import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateServiciosCiudadanoDto } from './dto/create-servicios_ciudadano.dto';
import { UpdateServiciosCiudadanoDto } from './dto/update-servicios_ciudadano.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ServiciosCiudadano } from './entities/servicios_ciudadano.entity';
import { Ciudadanos } from 'src/ciudadanos/entities/ciudadano.entity';
import { CatalogoServicio } from 'src/catalogo_servicios/entities/catalogo_servicio.entity';
//import { PointsManagementService } from 'src/ciudadanos/services/points-management.service';
import { ServiceStatus } from './enums/service-status.enum';

@Injectable()
export class ServiciosCiudadanosService {
  constructor(
    @InjectRepository(ServiciosCiudadano)
    private readonly serviciosRepository: Repository<ServiciosCiudadano>,

    @InjectRepository(Ciudadanos)
    private readonly ciudadanosRepository: Repository<Ciudadanos>,

    @InjectRepository(CatalogoServicio)
    private readonly catalogoServicioRepository: Repository<CatalogoServicio>,

    /* private readonly pointsManagementService: PointsManagementService, */
  ) {}

// ✅ CREAR NUEVO SERVICIO
async create(createDto: CreateServiciosCiudadanoDto) {
  const ciudadano = await this.ciudadanosRepository.findOneBy({
    id: createDto.ciudadano_id,
  });

  if (!ciudadano) {
    throw new BadRequestException(
      `Ciudadano con id ${createDto.ciudadano_id} no existe`,
    );
  }

  const catalogo = await this.catalogoServicioRepository.findOne({
    where: { id: createDto.service_id },
    relations: ['order'],
  });

  if (!catalogo) {
    throw new BadRequestException(
      `Servicio con id ${createDto.service_id} no existe`,
    );
  }

  // ✅ NUEVO: Validación simple basada en max_orden_desbloqueada
    if (catalogo.order && catalogo.order.id > ciudadano.max_orden_desbloqueada) {
      throw new BadRequestException(
        `El ciudadano no puede acceder a este servicio. Orden requerida: ${catalogo.order.id}, Orden disponible: ${ciudadano.max_orden_desbloqueada}`
      );
    }

  /* const canAccessOrden = await this.pointsManagementService.canAccessOrden(createDto.ciudadano_id, catalogo.order.id);
  if (!canAccessOrden) {
    throw new BadRequestException(
      `El ciudadano no puede acceder a este servicio`,
    );
  } */

  // 🚨 VALIDACIÓN para impedir más de un cargo "EnCurso"
  if (createDto.service_status === ServiceStatus.in_progress) {
    const cargosEnCurso = await this.serviciosRepository.find({
      where: {
        citizen: { id: createDto.ciudadano_id },
        service_status: ServiceStatus.in_progress,
      },
    });

    if (cargosEnCurso.length > 0) {
      throw new BadRequestException(
        `El ciudadano ya tiene un cargo en curso y no puede registrar otro.`
      );
    }
  }

  // ⚙️ Cálculo del periodo de descanso
  const startDate = new Date(createDto.start_date);
  const endDate = new Date(createDto.end_date);
  let restPeriodEnd: Date | null = null;

  if (createDto.service_status === ServiceStatus.completed) {
    restPeriodEnd = new Date(endDate);
    restPeriodEnd.setFullYear(restPeriodEnd.getFullYear() + 2); // +2 años
  }

  const nuevoServicio = this.serviciosRepository.create({
    citizen: ciudadano,
    catalogoServicio: catalogo,
    start_date: startDate,
    end_date: endDate,
    service_status: createDto.service_status,
    observations: createDto.observations || '',
    rest_period_end: restPeriodEnd,
  });


  return await this.serviciosRepository.save(nuevoServicio);
}

  // 🟡 OBTENER TODOS (opcional, aún sin implementar)
  findAll() {
    return `This action returns all serviciosCiudadanos`;
  }

  // 🟡 OBTENER UNO POR ID (opcional)
  findOne(id: number) {
    return `This action returns a #${id} serviciosCiudadano`;
  }

  // ✅ ACTUALIZAR SERVICIO
  async update(id: number, updateDto: UpdateServiciosCiudadanoDto) {
  const cargo = await this.serviciosRepository.findOne({
    where: { id },
    relations: ['catalogoServicio'],
  });

  if (!cargo) {
    throw new NotFoundException(`Cargo con id ${id} no encontrado`);
  }

  // Actualiza la relación si cambió el servicio
  if (
    updateDto.service_id &&
    (!cargo.catalogoServicio || cargo.catalogoServicio.id !== updateDto.service_id)
  ) {
    const nuevoServicio = await this.catalogoServicioRepository.findOneBy({
      id: updateDto.service_id,
    });

    if (!nuevoServicio) {
      throw new NotFoundException(
        `Servicio con id ${updateDto.service_id} no encontrado`,
      );
    }

    cargo.catalogoServicio = nuevoServicio;
  }

  // Actualiza campos básicos
  cargo.start_date = updateDto.start_date
    ? new Date(updateDto.start_date)
    : cargo.start_date;

  cargo.end_date = updateDto.end_date
    ? new Date(updateDto.end_date)
    : cargo.end_date;

  const nuevoStatus = updateDto.service_status ?? cargo.service_status;
  const statusAnterior = cargo.service_status;
  
  // ✅ VALIDACIÓN: Si se cambia a "completado", la fecha de finalización es obligatoria
  if (nuevoStatus === ServiceStatus.completed && statusAnterior !== ServiceStatus.completed) {
    const fechaFinalizacion = updateDto.end_date ? new Date(updateDto.end_date) : cargo.end_date;
    
    if (!fechaFinalizacion) {
      throw new BadRequestException(
        'La fecha de finalización es obligatoria cuando se marca el servicio como completado'
      );
    }
    
    // Validar que la fecha de finalización no sea anterior a la fecha de inicio
    const fechaInicio = cargo.start_date;
    if (fechaInicio && fechaFinalizacion < fechaInicio) {
      throw new BadRequestException(
        'La fecha de finalización no puede ser anterior a la fecha de inicio'
      );
    }
  }
  
  cargo.service_status = nuevoStatus;
  cargo.observations = updateDto.observations ?? cargo.observations;

  // 🚀 Lógica para calcular rest_period_end
  if (nuevoStatus === ServiceStatus.completed && cargo.end_date) {
    const finDescanso = new Date(cargo.end_date);
    finDescanso.setFullYear(finDescanso.getFullYear() + 2);
    cargo.rest_period_end = finDescanso;
  } else {
    // Si cambia a otro status, anulamos el descanso
    cargo.rest_period_end = null;
  }

    
  await this.serviciosRepository.save(cargo);
  return { message: 'Actualización exitosa' };
}


  // 🗑️ ELIMINAR (placeholder)
  remove(id: number) {
    return `This action removes a #${id} serviciosCiudadano`;
  }

  // ✅ OBTENER TODOS LOS CARGOS DE UN CIUDADANO
  async obtenerCargosPorCiudadano(ciudadanoId: number) {
    if (isNaN(ciudadanoId)) {
      throw new BadRequestException(
        `El ID proporcionado no es válido: ${ciudadanoId}`,
      );
    }

    const ciudadano = await this.ciudadanosRepository.findOne({
      where: { id: ciudadanoId },
      relations: ['services', 'services.catalogoServicio'],
    });

    if (!ciudadano) {
      throw new BadRequestException(
        `Ciudadano con ID ${ciudadanoId} no existe`,
      );
    }

    return ciudadano.services;
  }
}
