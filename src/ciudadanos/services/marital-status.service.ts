import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ciudadanos } from '../entities/ciudadano.entity';
import { MaritalStatus } from '../enums/marital-status.enum';

@Injectable()
export class MaritalStatusService {
  constructor(
    @InjectRepository(Ciudadanos)
    private readonly ciudadanosRepository: Repository<Ciudadanos>,
  ) { }
  
  async updateMaritalStatus(
    ciudadanoId: number,
    newMaritalStatus: MaritalStatus,
    partnerId?: number,
  ) {
    const ciudadano = await this.ciudadanosRepository.findOne({
      where: { id: ciudadanoId },
      relations: ['partner'],
    });

    if (!ciudadano) {
      throw new NotFoundException('Ciudadano no encontrado');
    }

    const currentPartner = ciudadano.partner;

    // ✅ NUEVO: Manejar divorcio - ya no sincronizar órdenes
    if (newMaritalStatus === MaritalStatus.SOLTERO && currentPartner) {
      // Divorciar ambos ciudadanos
      currentPartner.marital_status = MaritalStatus.SOLTERO;
      currentPartner.partner = null;
      await this.ciudadanosRepository.save(currentPartner);

      // ✅ Importante: Al divorciarse, cada uno conserva su orden actual
      // NO hay sincronización hacia atrás
    }

    // ✅ NUEVO: Manejar matrimonio - sincronizar órdenes
    if (newMaritalStatus === MaritalStatus.CASADO && partnerId) {
      const partner = await this.ciudadanosRepository.findOne({
        where: { id: partnerId },
      });

      if (!partner) {
        throw new NotFoundException('Pareja no encontrada');
      }

      // Sincronizar órdenes - ambos toman la orden más alta
      const maxOrden = Math.max(
        ciudadano.max_orden_desbloqueada,
        partner.max_orden_desbloqueada
      );

      ciudadano.max_orden_desbloqueada = maxOrden;
      partner.max_orden_desbloqueada = maxOrden;

      // Establecer matrimonio
      ciudadano.marital_status = MaritalStatus.CASADO;
      ciudadano.partner = partner;
      partner.marital_status = MaritalStatus.CASADO;
      partner.partner = ciudadano;

      await this.ciudadanosRepository.save([ciudadano, partner]);
    } else {
      // Solo actualizar estado civil sin pareja
      ciudadano.marital_status = newMaritalStatus;
      ciudadano.partner = null;
      await this.ciudadanosRepository.save(ciudadano);
    }

    return {
      message: 'Estado civil actualizado exitosamente',
      data: {
        ciudadano_id: ciudadano.id,
        nuevo_estado: newMaritalStatus,
        pareja_id: partnerId || null,
      },
    };
  }

  /**
   * Maneja el cambio de estado civil de un ciudadano
   */
  async handleMaritalStatusChange(
    ciudadano: Ciudadanos,
    newMaritalStatus: MaritalStatus,
    newPartnerId?: number,
  ): Promise<void> {
    const currentMaritalStatus = ciudadano.marital_status;

    // Si no hay cambio de estado civil, no hacer nada
    if (currentMaritalStatus === newMaritalStatus) {
      return;
    }

    // Determinar el tipo de cambio y ejecutar la lógica correspondiente
    if (this.isSingleToMarried(currentMaritalStatus, newMaritalStatus)) {
      await this.handleSingleToMarried(ciudadano, newPartnerId);
    } else if (this.isMarriedToSingle(currentMaritalStatus, newMaritalStatus)) {
      await this.handleMarriedToSingle(ciudadano);
    } else if (
      this.isPartnerChange(currentMaritalStatus, newMaritalStatus, newPartnerId)
    ) {
      await this.handlePartnerChange(ciudadano, newPartnerId);
    }
  }

  /**
   * Verifica si el cambio es de soltero a casado
   */
  private isSingleToMarried(
    currentStatus: MaritalStatus,
    newStatus: MaritalStatus,
  ): boolean {
    return (
      currentStatus === MaritalStatus.SOLTERO &&
      newStatus === MaritalStatus.CASADO
    );
  }

  /**
   * Verifica si el cambio es de casado a soltero
   */
  private isMarriedToSingle(
    currentStatus: MaritalStatus,
    newStatus: MaritalStatus,
  ): boolean {
    return (
      currentStatus === MaritalStatus.CASADO &&
      newStatus === MaritalStatus.SOLTERO
    );
  }

  /**
   * Verifica si es un cambio de pareja (permanece casado)
   */
  private isPartnerChange(
    currentStatus: MaritalStatus,
    newStatus: MaritalStatus,
    newPartnerId?: number,
  ): boolean {
    return (
      currentStatus === MaritalStatus.CASADO &&
      newStatus === MaritalStatus.CASADO &&
      !!newPartnerId
    );
  }

  /**
   * Maneja el cambio de soltero a casado
   */
  private async handleSingleToMarried(
    ciudadano: Ciudadanos,
    newPartnerId: number,
  ): Promise<void> {
    if (!newPartnerId) {
      throw new BadRequestException(
        'Si cambia a casado, debe especificar una pareja',
      );
    }

    const partner = await this.findAndValidatePartner(newPartnerId);
    this.validatePartnerEligibility(ciudadano, partner);

    // Establecer la relación bidireccional
    ciudadano.marital_status = MaritalStatus.CASADO;
    ciudadano.partner = partner;

    // Actualizar el estado civil de la pareja si es necesario
    await this.updatePartnerStatus(partner, ciudadano);
  }

  /**
   * Maneja el cambio de casado a soltero
   */
  private async handleMarriedToSingle(ciudadano: Ciudadanos): Promise<void> {
    const currentPartner = ciudadano.partner;

    // Remover la relación del ciudadano actual
    ciudadano.marital_status = MaritalStatus.SOLTERO;
    ciudadano.partner = null;

    // Actualizar la pareja anterior si existe
    if (currentPartner) {
      await this.removePartnerRelationship(currentPartner);
    }
  }

  /**
   * Maneja el cambio de pareja (permanece casado)
   */
  private async handlePartnerChange(
    ciudadano: Ciudadanos,
    newPartnerId: number,
  ): Promise<void> {
    const currentPartner = ciudadano.partner;
    const newPartner = await this.findAndValidatePartner(newPartnerId, true);

    this.validatePartnerEligibility(ciudadano, newPartner);

    // Remover relación anterior
    if (currentPartner) {
      await this.removePartnerRelationship(currentPartner);
    }

    // Establecer nueva relación
    ciudadano.partner = newPartner;
    await this.updatePartnerStatus(newPartner, ciudadano);
  }

  /**
   * Busca y valida que la pareja existe
   */
  private async findAndValidatePartner(
    partnerId: number,
    includeRelations: boolean = false,
  ): Promise<Ciudadanos> {
    const query = includeRelations
      ? this.ciudadanosRepository.findOne({
          where: { id: partnerId },
          relations: ['partner'],
        })
      : this.ciudadanosRepository.findOneBy({ id: partnerId });

    const partner = await query;

    if (!partner) {
      throw new BadRequestException(`Pareja con id ${partnerId} no encontrada`);
    }

    return partner;
  }

  /**
   * Valida que la pareja es elegible para casarse
   */
  private validatePartnerEligibility(
    ciudadano: Ciudadanos,
    partner: Ciudadanos,
  ): void {
    // Verificar que no sea el mismo ciudadano
    if (partner.id === ciudadano.id) {
      throw new BadRequestException(
        'Un ciudadano no puede ser pareja de sí mismo',
      );
    }

    // Verificar que la pareja no esté ya casada
    if (partner.marital_status === MaritalStatus.CASADO) {
      throw new BadRequestException(
        'La persona seleccionada ya está casada y no puede ser pareja de otra persona',
      );
    }
  }

  /**
   * Actualiza el estado civil de la pareja
   */
  private async updatePartnerStatus(
    partner: Ciudadanos,
    ciudadano: Ciudadanos,
  ): Promise<void> {
    if (partner.marital_status !== MaritalStatus.CASADO) {
      partner.marital_status = MaritalStatus.CASADO;
      partner.partner = ciudadano;
      await this.ciudadanosRepository.save(partner);
    }
  }

  /**
   * Remueve la relación de pareja
   */
  private async removePartnerRelationship(partner: Ciudadanos): Promise<void> {
    partner.partner = null;

    // Solo cambiar a soltero si no tiene otra pareja
    if (partner.marital_status === MaritalStatus.CASADO) {
      partner.marital_status = MaritalStatus.SOLTERO;
    }

    await this.ciudadanosRepository.save(partner);
  }

  /**
   * Valida la creación de un ciudadano con estado civil y pareja
   */
  async validateCiudadanoCreation(
    maritalStatus: MaritalStatus,
    partnerId?: number,
  ): Promise<Ciudadanos | null> {
    // ✅ VALIDACIÓN PRINCIPAL: Consistencia entre estado civil y pareja
    if (maritalStatus === MaritalStatus.SOLTERO && partnerId) {
      partnerId = null;
    }

    if (maritalStatus === MaritalStatus.CASADO && !partnerId) {
      throw new BadRequestException('Una persona casada debe tener pareja');
    }

    let partnerEntity: Ciudadanos = null;

    if (partnerId) {
      partnerEntity = await this.ciudadanosRepository.findOne({
        where: { id: partnerId },
        relations: ['partner'],
      });
      
      if (!partnerEntity) {
        throw new BadRequestException(`Partner with id ${partnerId} not found`);
      }

      // Verificar que la pareja no esté ya casada
      if (partnerEntity.marital_status === MaritalStatus.CASADO) {
        throw new BadRequestException(
          'La persona seleccionada ya está casada y no puede ser pareja de otra persona',
        );
      }
    }

    return partnerEntity;
  }

  /**
   * Valida la actualización de estado civil y pareja
   */
  validateMaritalStatusUpdate(
    newMaritalStatus: MaritalStatus,
    newPartnerId?: number,
  ): void {
    // ✅ VALIDACIÓN: Consistencia entre estado civil y pareja
    if (newMaritalStatus === MaritalStatus.SOLTERO && newPartnerId) {
      newPartnerId = null;
    }

    if (newMaritalStatus === MaritalStatus.CASADO && !newPartnerId) {
      throw new BadRequestException('Una persona casada debe tener pareja');
    }
  }
}
