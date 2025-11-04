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
import { MaritalStatus } from 'src/ciudadanos/enums/marital-status.enum';

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
  // Cargar ciudadano con su pareja (si existe) para aplicar regla de matrimonio
  const ciudadano = await this.ciudadanosRepository.findOne({
    where: { id: createDto.ciudadano_id },
    relations: ['partner'],
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

  // ✅ Validación de acceso por orden (ciudadano)
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

  // 🚨 VALIDACIÓN para impedir más de un cargo "EnCurso" (ciudadano)
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
  /* let restPeriodEnd: Date | null = null;

  if (createDto.service_status === ServiceStatus.completed) {
    restPeriodEnd = new Date(endDate);
    restPeriodEnd.setFullYear(restPeriodEnd.getFullYear() + 2); // +2 años
  } */

  // Preparar creación del servicio para el ciudadano (principal)
  const nuevoServicio = this.serviciosRepository.create({
    citizen: ciudadano,
    catalogoServicio: catalogo,
    start_date: startDate,
    end_date: endDate,
    service_status: createDto.service_status,
    observations: createDto.observations || '',
    /* rest_period_end: restPeriodEnd, */
  });

  // 🤝 Regla: si el ciudadano está casado, también asignar a la pareja
  const debeAsignarAPareja =
    ciudadano.marital_status === MaritalStatus.CASADO && !!ciudadano.partner;

  if (!debeAsignarAPareja) {
    // Caso simple: guardar solo el servicio del ciudadano
    return await this.serviciosRepository.save(nuevoServicio);
  }

  // Validaciones específicas para la pareja
  const pareja = ciudadano.partner!;

  // Impedir más de un cargo en curso (pareja)
  if (createDto.service_status === ServiceStatus.in_progress) {
    const cargosEnCursoPareja = await this.serviciosRepository.find({
      where: {
        citizen: { id: pareja.id },
        service_status: ServiceStatus.in_progress,
      },
    });

    if (cargosEnCursoPareja.length > 0) {
      throw new BadRequestException(
        `La pareja (ID ${pareja.id}) ya tiene un cargo en curso y no puede registrar otro.`
      );
    }
  }

  // Guardar ambos servicios en una transacción para consistencia
  const resultado = await this.serviciosRepository.manager.transaction(async (trx) => {
    const repo = trx.getRepository(ServiciosCiudadano);
    const ciudadanosRepo = trx.getRepository(Ciudadanos);

    // 🔓 Auto-desbloqueo de orden para la pareja si es necesario
    if (catalogo.order && pareja.max_orden_desbloqueada < catalogo.order.id) {
      pareja.max_orden_desbloqueada = catalogo.order.id;
      await ciudadanosRepo.save(pareja);
    }

    const creadoCiudadano = await repo.save(nuevoServicio);

    const servicioPareja = repo.create({
      citizen: pareja,
      catalogoServicio: catalogo,
      start_date: startDate,
      end_date: endDate,
      service_status: createDto.service_status,
      observations: createDto.observations || '',
    });

    // Parear: el servicio de la pareja apunta al servicio del ciudadano
    servicioPareja.pairedWith = creadoCiudadano;
    const creadoPareja = await repo.save(servicioPareja);
    return { creadoCiudadano, creadoPareja };
  });

  // Por compatibilidad, devolvemos el servicio del ciudadano (principal)
  return resultado.creadoCiudadano;
}

  // 🟡 OBTENER TODOS (opcional, aún sin implementar)
  findAll() {
    return `This action returns all serviciosCiudadanos`;
  }

  // 🟡 OBTENER UNO POR ID (opcional)
  findOne(id: number) {
    return `This action returns a #${id} serviciosCiudadano`;
  }

  // ACTUALIZAR SERVICIO
  async update(id: number, updateDto: UpdateServiciosCiudadanoDto) {
  const cargo = await this.serviciosRepository.findOne({
    where: { id },
    relations: ['catalogoServicio', 'pairedWith'],
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
  
  // VALIDACIÓN: Si se cambia a "completado", la fecha de finalización es obligatoria
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
  
  // Guardar cambios y (si aplica) propagar a la pareja en una transacción
  await this.serviciosRepository.manager.transaction(async (trx) => {
    const repo = trx.getRepository(ServiciosCiudadano);

    // Guardar el servicio actual
    cargo.service_status = nuevoStatus;
    cargo.observations = updateDto.observations ?? cargo.observations;
    await repo.save(cargo);

    // Propagar estado a la pareja si existe el vínculo (todos los estados)
    {
      // Encontrar el servicio pareado (si existiera)
      let contraparte: ServiciosCiudadano | null = null;

      if (cargo.pairedWith?.id) {
        contraparte = await repo.findOne({ where: { id: cargo.pairedWith.id }, relations: ['citizen'] });
      } else {
        // Buscar si alguien nos tiene pareados a nosotros
        contraparte = await repo
          .createQueryBuilder('s')
          .leftJoin('s.pairedWith', 'p')
          .leftJoinAndSelect('s.citizen', 'c')
          .where('p.id = :id', { id: cargo.id })
          .getOne();
      }

      if (contraparte) {
        // Si se va a poner en "en_curso", validar que la pareja no tenga otro en curso
        if (nuevoStatus === ServiceStatus.in_progress) {
          const otrosEnCurso = await repo
            .createQueryBuilder('x')
            .leftJoin('x.citizen', 'xc')
            .where('xc.id = :cid', { cid: (contraparte as any).citizen.id })
            .andWhere('x.service_status = :st', { st: ServiceStatus.in_progress })
            .andWhere('x.id <> :self', { self: contraparte.id })
            .getCount();

          if (otrosEnCurso > 0) {
            throw new BadRequestException('La pareja ya tiene un cargo en curso y no puede registrar otro.');
          }
        }

        contraparte.service_status = nuevoStatus;

        if (updateDto.start_date) {
          contraparte.start_date = new Date(updateDto.start_date);
        }
        if (updateDto.end_date) {
          contraparte.end_date = new Date(updateDto.end_date);
        } else if (nuevoStatus === ServiceStatus.completed) {
          // Si completamos y no vino end_date, alinear con el actual
          contraparte.end_date = cargo.end_date ?? contraparte.end_date;
        }

        if (updateDto.observations) {
          contraparte.observations = updateDto.observations;
        }

        await repo.save(contraparte);
      }
    }
  });

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
