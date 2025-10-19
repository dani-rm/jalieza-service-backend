import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CreateCiudadanoDto } from './dto/create-ciudadano.dto';
import { UpdateCiudadanoDto } from './dto/update-ciudadano.dto';
import { CheckDuplicateCiudadanoDto } from './dto/check-duplicate.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Ciudadanos } from './entities/ciudadano.entity';
import { Repository } from 'typeorm';
import { MaritalStatus } from './enums/marital-status.enum';
import { CiudadanoResponse, CiudadanoListResponse, CiudadanoCreateResponse,CiudadanoUpdateResponse } from './interfaces/ciudadano-response.interface';
import { calculateAge, formatDateOnly, validateBirthDate } from './utils/date-validator.util';
import { MaritalStatusService } from './services/marital-status.service';
import { CatalogoOrden } from 'src/catalogo_orden/entities/catalogo_orden.entity';
/* import { PointsManagementService } from './services/points-management.service'; */


@Injectable()
export class CiudadanosService {
  constructor(
    @InjectRepository(Ciudadanos)
    private readonly ciudadanosRepository: Repository<Ciudadanos>,
    private readonly maritalStatusService: MaritalStatusService,
    @InjectRepository(CatalogoOrden)
    private readonly catalogoOrdenRepository: Repository<CatalogoOrden>
    /* private readonly pointsManagementService: PointsManagementService, */
  ) {}

  //Valida si el ciudadano ya existe
  async checkDuplicate(checkDuplicateDto: CheckDuplicateCiudadanoDto) {
    const { name, last_name_father, last_name_mother } = checkDuplicateDto;

    const existingCiudadano = await this.ciudadanosRepository.findOne({
      where: {
        name,
        last_name_father,
        //la estructura ...(condición && { clave: valor }) agrega la clave solo si la condición es verdadera
        ...(last_name_mother && { last_name_mother}),
      },
      withDeleted: false,
    });

    const isDuplicate = Boolean(existingCiudadano);

    return {
      isDuplicate,
      existingCiudadano: isDuplicate 
      ? this.mapCiudadanoToBaseResponse(existingCiudadano)
      : null,
    };
  }

  //Obtiene los estados civiles
  getMaritalStatuses() {
    return [
    MaritalStatus.SOLTERO,
    MaritalStatus.CASADO,
  ];
  }

  //Busca ciudadanos por nombre, apellido paterno, apellido materno
  async searchCiudadanos(query: string, limit: number = 20) {
  const sanitizedQuery = this.sanitizeSearchQuery(query);
  if (!sanitizedQuery) return [];

  const ciudadanos = await this.ciudadanosRepository
    .createQueryBuilder('ciudadano')
    .where(
      'ciudadano.name ILIKE :query OR ciudadano.last_name_father ILIKE :query OR ciudadano.last_name_mother ILIKE :query',
      { query: `%${sanitizedQuery}%` },
    )
    .andWhere('ciudadano.deleted_at IS NULL')
    .select([
      'ciudadano.id',
      'ciudadano.name',
      'ciudadano.last_name_father',
      'ciudadano.last_name_mother',
      'ciudadano.marital_status',
      'ciudadano.birth_date',
      'ciudadano.phone',
      'ciudadano.comment',
    ])
    .limit(Math.min(limit, 50))
    .getMany();

  return ciudadanos.map((c) => ({
    ...this.mapCiudadanoToBaseResponse(c),
    full_name: this.buildFullName(c.name, c.last_name_father, c.last_name_mother),
  }));
}

  //Registra un nuevo ciudadano
  async createCiudadano(dto: CreateCiudadanoDto): Promise<CiudadanoCreateResponse> {
    const {
      name,
      last_name_father,
      last_name_mother,
      comment,
      birth_date,
      phone,
      marital_status,
      partner: partnerId,
    } = dto;

    // Verificar duplicados antes de registrar
    const duplicateCheck = await this.checkDuplicate({
      name,
      last_name_father,
      last_name_mother: last_name_mother || '',
    });

    if (duplicateCheck.isDuplicate) {
      throw new ConflictException({
        message: 'Ya existe un ciudadano con estos datos',
        existingCiudadano: duplicateCheck.existingCiudadano,
      });
    }

    // Validar estado civil y pareja usando el servicio especializado
    const partnerEntity = await this.maritalStatusService.validateCiudadanoCreation(
      marital_status,
      partnerId,
    );

    let localDate: Date | null = null;

    if (birth_date) {
      try {
        // Usar la función de validación que incluye límites de edad
        localDate = validateBirthDate(new Date(birth_date));
      } catch (error) {
        // Si la validación falla, lanzar el error
        throw error;
      }
    }

    const nuevoCiudadano = this.ciudadanosRepository.create({
      name,
      last_name_father,
      last_name_mother,
      comment,
      birth_date: localDate, // null si no hay fecha válida
      phone,
      marital_status,
      partner: partnerEntity,
    });

    const saved = await this.ciudadanosRepository.save(nuevoCiudadano);

    //Si está casado, actualizar el estado civil de la pareja
    if (marital_status === MaritalStatus.CASADO && partnerEntity) {
      partnerEntity.marital_status = MaritalStatus.CASADO;
      partnerEntity.partner = saved; // Establecer la relación bidireccional
      await this.ciudadanosRepository.save(partnerEntity);
    }

    return {
      message: 'Ciudadano registrado exitosamente',
      data: {
      ...this.mapCiudadanoToBaseResponse(saved),
      partner: this.mapPartnerInfo(saved.partner),
    },
    };
  }

  //Obtiene todos los ciudadanos
  async findAll(includeDeleted: boolean = false): Promise<CiudadanoListResponse[]> {
    const ciudadanos = await this.ciudadanosRepository.find({
      relations: ['partner', 'services', 'services.catalogoServicio'],
      withDeleted: includeDeleted,
    });

    return ciudadanos.map(c => this.mapCiudadanoToFullResponse(c, includeDeleted));
  }

  //Obtiene un ciudadano por id
  async findOne(id: number, includeDeleted: boolean = false): Promise<CiudadanoListResponse> {
    const ciudadano = await this.ciudadanosRepository.findOne({
      where: { id },
      relations: ['partner', 'services', 'services.catalogoServicio'],
      withDeleted: includeDeleted,
    });

    if (!ciudadano) {
      throw new NotFoundException(`Citizen with id ${id} not found`);
    }

     return this.mapCiudadanoToFullResponse(ciudadano, includeDeleted);
  }

  //Actualiza un ciudadano
  async update(id: number, updateCiudadanoDto: UpdateCiudadanoDto): Promise<CiudadanoUpdateResponse> {
    const ciudadano = await this.ciudadanosRepository.findOne({
      where: { id },
      relations: ['partner'],
      withDeleted: false,
    });

    if (!ciudadano) {
      throw new NotFoundException(`Citizen with id ${id} not found`);
    }

    const {
      marital_status: newMaritalStatus,
      partner: newPartnerId,
      ...otherFields
    } = updateCiudadanoDto;

    // Manejar cambios de estado civil usando el MaritalStatusService
    if (newMaritalStatus !== undefined) {
      // ✅ VALIDAR antes del cambio
      this.maritalStatusService.validateMaritalStatusUpdate(newMaritalStatus, newPartnerId);
      
      await this.maritalStatusService.handleMaritalStatusChange(
        ciudadano,
        newMaritalStatus,
        newPartnerId,
      );
    }

    // Actualizar otros campos
    Object.assign(ciudadano, otherFields);

    const saved = await this.ciudadanosRepository.save(ciudadano);

    const response: CiudadanoResponse = {
    ...this.mapCiudadanoToBaseResponse(saved),
    partner: this.mapPartnerInfo(saved.partner),
  };

  return {
    message: 'Ciudadano actualizado exitosamente',
    data: response,
  };
  }

  //Elimina un ciudadano
  async remove(id: number) {
    const ciudadano = await this.ciudadanosRepository.findOne({ 
      where: { id },
      relations: ['partner'] // Incluir relación de pareja
    });
    
    if (!ciudadano) {
      throw new NotFoundException(`Citizen with id ${id} not found`);
    }

    // Si el ciudadano tiene pareja, actualizar su estado civil antes de borrarlo
    if (ciudadano.partner) {
      // Cambiar el estado civil del ciudadano a soltero
      await this.maritalStatusService.handleMaritalStatusChange(
        ciudadano,
        MaritalStatus.SOLTERO,
        undefined // Sin nueva pareja
      );
      
      // También actualizar el estado civil de la pareja que queda
      const pareja = ciudadano.partner;
      if (pareja && pareja.marital_status === MaritalStatus.CASADO) {
        pareja.marital_status = MaritalStatus.SOLTERO;
        pareja.partner = null;
        await this.ciudadanosRepository.save(pareja);
      }
    }

    return await this.ciudadanosRepository.softRemove(ciudadano);
  }
  
  // ✅ NUEVO: Promover ciudadano a siguiente orden
  async promoverOrden(ciudadanoId: number) {
    const ciudadano = await this.ciudadanosRepository.findOne({
      where: { id: ciudadanoId },
      relations: ['partner'],
    });

    if (!ciudadano) {
      throw new NotFoundException('Ciudadano no encontrado');
    }

    // Validar que no exceda el máximo
    if (ciudadano.max_orden_desbloqueada >= 6) {
      throw new BadRequestException('El ciudadano ya tiene la máxima orden desbloqueada');
    }

    // Promover ciudadano
    ciudadano.max_orden_desbloqueada += 1;
    await this.ciudadanosRepository.save(ciudadano);

    // ✅ Si está casado, promover también a la pareja
    if (ciudadano.marital_status === MaritalStatus.CASADO && ciudadano.partner) {
      ciudadano.partner.max_orden_desbloqueada = ciudadano.max_orden_desbloqueada;
      await this.ciudadanosRepository.save(ciudadano.partner);
    }

    return {
      message: 'Orden desbloqueada exitosamente',
      data: {
        ciudadano_id: ciudadano.id,
        nueva_orden_maxima: ciudadano.max_orden_desbloqueada,
        pareja_actualizada: ciudadano.partner ? true : false,
      },
    };
  }

  // ✅ NUEVO: Retroceder ciudadano a orden anterior
  async retrocederOrden(ciudadanoId: number) {
    const ciudadano = await this.ciudadanosRepository.findOne({
      where: { id: ciudadanoId },
      relations: ['partner'],
    });

    if (!ciudadano) {
      throw new NotFoundException('Ciudadano no encontrado');
    }

    // Validar que no baje del mínimo
    if (ciudadano.max_orden_desbloqueada <= 1) {
      throw new BadRequestException('El ciudadano ya tiene la mínima orden');
    }

    // Retroceder ciudadano
    ciudadano.max_orden_desbloqueada -= 1;
    await this.ciudadanosRepository.save(ciudadano);

    // ✅ Si está casado, retroceder también a la pareja
    if (ciudadano.marital_status === MaritalStatus.CASADO && ciudadano.partner) {
      ciudadano.partner.max_orden_desbloqueada = ciudadano.max_orden_desbloqueada;
      await this.ciudadanosRepository.save(ciudadano.partner);
    }

    return {
      message: 'Orden bloqueada exitosamente',
      data: {
        ciudadano_id: ciudadano.id,
        nueva_orden_maxima: ciudadano.max_orden_desbloqueada,
        pareja_actualizada: ciudadano.partner ? true : false,
      },
    };
  }

  // ✅ NUEVO: Método simple para obtener órdenes disponibles
  async getOrdenesDisponiblesSimple(ciudadanoId: number) {
    const ciudadano = await this.ciudadanosRepository.findOne({
      where: { id: ciudadanoId },
    });

    if (!ciudadano) {
      throw new NotFoundException('Ciudadano no encontrado');
    }

    // Obtener todas las órdenes del catálogo
    const todasLasOrdenes = await this.catalogoOrdenRepository.find({
      order: { id: 'ASC' },
    });

    // Filtrar solo las que puede acceder
    const ordenesDisponibles = todasLasOrdenes.filter(
      orden => orden.id <= ciudadano.max_orden_desbloqueada
    );

    return {
      ciudadano_id: ciudadano.id,
      max_orden_desbloqueada: ciudadano.max_orden_desbloqueada,
      ordenes_disponibles: ordenesDisponibles,
    };
  }

  //Restaura un ciudadano
  /* async restaurarCiudadano(id: number) {
    return await this.ciudadanosRepository.restore(id);
  } */ 

  // Obtener órdenes disponibles para un ciudadano ----------------------------------------------------------------------------------
/*   async getOrdenesDisponibles(ciudadanoId: number) {
    return await this.pointsManagementService.getOrdenesDisponibles(ciudadanoId);
  }
 */
  // Obtener puntos de un ciudadano (INCLUYE puntos de la pareja si está casado)
  /* async getPuntosCiudadano(ciudadanoId: number) {
    const [puntos, totalPuntos, ciudadano] = await Promise.all([
      this.pointsManagementService.getPuntosByCiudadano(ciudadanoId),
      this.pointsManagementService.getTotalPuntos(ciudadanoId),
      this.ciudadanosRepository.findOne({
        where: { id: ciudadanoId },
        relations: ['partner']
      })
    ]);
    
    const response = {
      totalPuntos,
      puntosPorOrden: puntos.map(p => ({
        orden: p.orden.order_name,
        puntos: p.puntos
      })),
      // ✅ NUEVO: Información sobre si está casado y comparte puntos
      esCasado: ciudadano?.marital_status === MaritalStatus.CASADO,
      pareja: ciudadano?.partner ? {
        id: ciudadano.partner.id,
        nombre: `${ciudadano.partner.name} ${ciudadano.partner.last_name_father}`
      } : null,
      mensaje: ciudadano?.marital_status === MaritalStatus.CASADO && ciudadano?.partner 
        ? 'Los puntos mostrados incluyen los de tu pareja' 
        : 'Puntos individuales'
    };

    return response;
  } */

  //HELPERS DE MAPEADO
  /**
   * Mapea un ciudadano a la respuesta base
   */
  private mapCiudadanoToBaseResponse(ciudadano: Ciudadanos): any {
    return {
      id: ciudadano.id,
      name: ciudadano.name,
      last_name_father: ciudadano.last_name_father,
      last_name_mother: ciudadano.last_name_mother,
      comment: ciudadano.comment,
      birth_date: formatDateOnly(ciudadano.birth_date),
      age: calculateAge(ciudadano.birth_date),
      phone: ciudadano.phone,
      marital_status: ciudadano.marital_status,
    };
  }

  /**
   * Mapea información de la pareja
   */
  private mapPartnerInfo(partner: Ciudadanos | null): any {
    if (!partner) return null;
    
    return {
      id: partner.id,
      name: partner.name,
      last_name_father: partner.last_name_father,
      last_name_mother: partner.last_name_mother,
    };
  }

  /**
   * Mapea información de servicios
   */
  private mapServicesInfo(services: any[]): any[] {
    return services?.map((s) => ({
      id: s.id,
      service_name: s.catalogoServicio?.service_name || 'Sin nombre',
      start_date: s.start_date,
      end_date: s.end_date,
      service_status: s.service_status,
      observations: s.observations,
    })) || [];
  }

  /**
   * Construye el nombre completo
   */
  private buildFullName(name: string, lastName1: string, lastName2?: string): string {
    return `${name} ${lastName1} ${lastName2 || ''}`.trim();
  }

  /**
   * Sanitiza y valida query de búsqueda
   */
  private sanitizeSearchQuery(query: string): string | null {
    if (!query?.trim() || query.trim().length < 2) {
      return null;
    }
    
    // Escapar caracteres especiales de LIKE
    return query.trim().replace(/[%_]/g, '\\$&');
  }

  /**
   * Mapea ciudadano completo con todas las relaciones
   */
  private mapCiudadanoToFullResponse(
    ciudadano: Ciudadanos, 
    includeDeleted: boolean = false
  ): CiudadanoListResponse {
    return {
      ...this.mapCiudadanoToBaseResponse(ciudadano),
      partner: this.mapPartnerInfo(ciudadano.partner),
      services: this.mapServicesInfo(ciudadano.services),
      candidatoACargo: null,
      ...(includeDeleted && {
        visible: !ciudadano.deleted_at,
        deleted_at: ciudadano.deleted_at,
      }),
    };
  }
}
