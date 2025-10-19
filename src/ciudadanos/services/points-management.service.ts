// import { Injectable, NotFoundException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { ServiciosCiudadano } from '../../servicios_ciudadanos/entities/servicios_ciudadano.entity';
// import { CatalogoOrden } from '../../catalogo_orden/entities/catalogo_orden.entity';
// import { ServiceStatus } from '../../servicios_ciudadanos/enums/service-status.enum';
// import { SeedingService } from '../../seeding/seeding.service';
// import { Ciudadanos } from '../entities/ciudadano.entity';
// import { MaritalStatus } from '../enums/marital-status.enum';

// @Injectable()
// export class PointsManagementService {
//   constructor(
//     @InjectRepository(ServiciosCiudadano)
//     private readonly serviciosRepository: Repository<ServiciosCiudadano>,
//     @InjectRepository(CatalogoOrden)
//     private readonly catalogoOrdenRepository: Repository<CatalogoOrden>,
//     @InjectRepository(Ciudadanos)
//     private readonly ciudadanosRepository: Repository<Ciudadanos>,
//     private readonly seedingService: SeedingService,
//   ) {}

//   // ✅ Método para obtener puntos por orden desde configuración centralizada
//   private getPuntosPorOrden(ordenId: number): number {
//     const config = this.seedingService.getOrdenesConfig();
//     return config[ordenId]?.puntos_por_servicio || 0;
//   }

//   // ✅ Método privado centralizado para obtener servicios completados
//   private async getServiciosCompletados(ciudadanoId: number): Promise<ServiciosCiudadano[]> {
//     return await this.serviciosRepository.find({
//       where: {
//         citizen: { id: ciudadanoId },
//         service_status: ServiceStatus.completed
//       },
//       relations: ['catalogoServicio', 'catalogoServicio.order']
//     });
//   }


//   /**
//    * Obtiene los puntos de un ciudadano por orden (calculados dinámicamente)
//    * INCLUYE puntos de la pareja si está casado
//    */
//   async getPuntosByCiudadano(ciudadanoId: number): Promise<Array<{orden: CatalogoOrden, puntos: number}>> {
//     const [ciudadano, serviciosCompletados] = await Promise.all([
//       this.ciudadanosRepository.findOne({
//         where: { id: ciudadanoId },
//         relations: ['partner']
//       }),
//       this.getServiciosCompletados(ciudadanoId)
//     ]);

//     if (!ciudadano) {
//       throw new NotFoundException(`Ciudadano con id ${ciudadanoId} no encontrado`);
//     }

//     // Obtener puntos del ciudadano
//     const puntosPorOrden = new Map<number, {orden: CatalogoOrden, puntos: number}>();
    
//     for (const servicio of serviciosCompletados) {
//       const ordenId = servicio.catalogoServicio.order.id;
//       const puntosPorServicio = this.getPuntosPorOrden(ordenId);
      
//       if (puntosPorOrden.has(ordenId)) {
//         puntosPorOrden.get(ordenId).puntos += puntosPorServicio;
//       } else {
//         puntosPorOrden.set(ordenId, {
//           orden: servicio.catalogoServicio.order,
//           puntos: puntosPorServicio
//         });
//       }
//     }

//     // ✅ NUEVO: Si está casado, agregar puntos de la pareja
//     if (ciudadano.marital_status === MaritalStatus.CASADO && ciudadano.partner) {
//       const serviciosPareja = await this.getServiciosCompletados(ciudadano.partner.id);
      
//       for (const servicio of serviciosPareja) {
//         const ordenId = servicio.catalogoServicio.order.id;
//         const puntosPorServicio = this.getPuntosPorOrden(ordenId);
        
//         if (puntosPorOrden.has(ordenId)) {
//           puntosPorOrden.get(ordenId).puntos += puntosPorServicio;
//         } else {
//           puntosPorOrden.set(ordenId, {
//             orden: servicio.catalogoServicio.order,
//             puntos: puntosPorServicio
//           });
//         }
//       }
//     }

//     return Array.from(puntosPorOrden.values());
//   }

//   /**
//    * Obtiene el total de puntos acumulados de un ciudadano
//    * INCLUYE puntos de la pareja si está casado
//    */
//   async getTotalPuntos(ciudadanoId: number): Promise<number> {
//     const [ciudadano, serviciosCompletados] = await Promise.all([
//       this.ciudadanosRepository.findOne({
//         where: { id: ciudadanoId },
//         relations: ['partner']
//       }),
//       this.getServiciosCompletados(ciudadanoId)
//     ]);

//     if (!ciudadano) {
//       throw new NotFoundException(`Ciudadano con id ${ciudadanoId} no encontrado`);
//     }

//     let totalPuntos = serviciosCompletados.reduce((total, servicio) => {
//       const puntosPorOrden = this.getPuntosPorOrden(servicio.catalogoServicio.order.id);
//       return total + puntosPorOrden;
//     }, 0);

//     // ✅ NUEVO: Si está casado, agregar puntos de la pareja
//     if (ciudadano.marital_status === MaritalStatus.CASADO && ciudadano.partner) {
//       const serviciosPareja = await this.getServiciosCompletados(ciudadano.partner.id);
//       totalPuntos += serviciosPareja.reduce((total, servicio) => {
//         const puntosPorOrden = this.getPuntosPorOrden(servicio.catalogoServicio.order.id);
//         return total + puntosPorOrden;
//       }, 0);
//     }

//     return totalPuntos;
//   }

//   /**
//    * Obtiene las órdenes disponibles para un ciudadano
//    * INCLUYE puntos de la pareja si está casado
//    */
//   async getOrdenesDisponibles(ciudadanoId: number): Promise<CatalogoOrden[]> {
//     const totalPuntos = await this.getTotalPuntos(ciudadanoId);

//     return await this.catalogoOrdenRepository
//       .createQueryBuilder('orden')
//       .leftJoinAndSelect('orden.services', 'services')
//       .where('orden.required_points <= :totalPuntos', { totalPuntos })
//       .orderBy('orden.required_points', 'ASC')
//       .getMany();
//   }

//   /**
//    * Verifica si un ciudadano puede acceder a una orden
//    * INCLUYE puntos de la pareja si está casado
//    */
//   async canAccessOrden(ciudadanoId: number, ordenId: number): Promise<boolean> {
//     // ✅ Optimización: Hacer ambas consultas en paralelo
//     const [totalPuntos, orden] = await Promise.all([
//       this.getTotalPuntos(ciudadanoId),
//       this.catalogoOrdenRepository.findOneBy({ id: ordenId })
//     ]);
    
//     if (!orden) return false;
//     return totalPuntos >= orden.required_points;
//   }
// }