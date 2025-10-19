import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rol } from '../rol/entities/rol.entity';
import { Usuarios } from '../users/entities/user.entity';
import { CatalogoOrden } from 'src/catalogo_orden/entities/catalogo_orden.entity';
import * as bcryptjs from 'bcryptjs';

@Injectable()
export class SeedingService implements OnModuleInit {
  private readonly logger = new Logger(SeedingService.name);
  
  // ✅ Configuración centralizada de órdenes
  private readonly ORDENES_CONFIG = {
    1: { 
      name: 'PRIMER ORDEN', 
/*       required_points: 0, 
      puntos_por_servicio: 10  */
    },
    2: { 
      name: 'SEGUNDO ORDEN', 
/*       required_points: 20, 
      puntos_por_servicio: 10  */
    },
    3: { 
      name: 'TERCER ORDEN', 
/*       required_points: 40, 
      puntos_por_servicio: 10  */
    },
    4: { 
      name: 'CUARTO ORDEN', 
 /*      required_points: 60, 
      puntos_por_servicio: 10 */
    },
    5: { 
      name: 'QUINTO ORDEN', 
/*       required_points: 80, 
      puntos_por_servicio: 10  */
    },
    6: { 
      name: 'SEXTO ORDEN', 
/*       required_points: 100, 
      puntos_por_servicio: 10  */
    }
  };
  
  constructor(
    @InjectRepository(Rol)
    private readonly rolRepository: Repository<Rol>,
    @InjectRepository(Usuarios)
    private readonly usuariosRepository: Repository<Usuarios>,
    @InjectRepository(CatalogoOrden)
    private readonly catalogoOrdenRepository: Repository<CatalogoOrden>,
  ) {}

  async onModuleInit() {
    this.logger.log('🌱 Iniciando proceso de seeding automatico...');

    // Esperar un poco para que la conexión a BD esté lista
    await this.delay(2000);

    await this.seedDatabase();
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async seedDatabase() {
    try {
      // Verificar conexión a la base de datos
      await this.checkDatabaseConnection();
      this.logger.log('✅ Conexión a base de datos establecida');
      
      // Verificar si ya hay datos
      const existingRoles = await this.rolRepository.count();
      const existingUsers = await this.usuariosRepository.count();
      const existingOrders = await this.catalogoOrdenRepository.count();

      this.logger.log(`📊 Estado actual: ${existingRoles} roles, ${existingUsers} usuarios, ${existingOrders} órdenes`);

      if (existingRoles === 0) {
        console.log('📝 Creando roles por defecto...');
        await this.createDefaultRoles();
      }else {
        this.logger.log('✅ Roles ya existen, omitiendo creación');
      }

      if (existingUsers === 0) {
        console.log('👤 Creando usuario administrador por defecto...');
        await this.createDefaultAdmin();
      }else {
        this.logger.log('✅ Usuarios ya existen, omitiendo creación');
      }

      if (existingOrders === 0) {
        console.log('📋 Creando órdenes por defecto...');
        await this.createDefaultOrders();
      }else {
        this.logger.log('✅ Órdenes ya existen, omitiendo creación');
      }

      this.logger.log('✅ Seeding completado exitosamente');
    } catch (error) {
      console.error('❌ Error durante el seeding:', error.message);

      // Si es error de conexión, reintentar después
      if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        this.logger.warn('🔄 Reintentando seeding en 5 segundos...');
        setTimeout(() => this.seedDatabase(), 5000);
      }
    }
  }

  private async checkDatabaseConnection(): Promise<void> {
    try {
      // Intentar una consulta simple para verificar la conexión
      await this.rolRepository.query('SELECT 1');
    } catch (error) {
      throw new Error(`No se pudo conectar a la base de datos: ${error.message}`);
    }
  }

  private async createDefaultRoles() {
    const roles = [{ role_name: 'Administrador' }];

    for (const roleData of roles) {
      const existingRole = await this.rolRepository.findOne({
        where: { role_name: roleData.role_name }
      });

      if(!existingRole) {
      const role = this.rolRepository.create(roleData);
        await this.rolRepository.save(role);
        this.logger.log(`   ✅ Rol creado: ${roleData.role_name}`);
      } else {
        this.logger.log(`   ⏭️  Rol ya existe: ${roleData.role_name}`);
      }
    }
  }

  private async createDefaultAdmin() {
    // Verificar si ya existe un admin
    const existingAdmin = await this.usuariosRepository.findOne({
      where: { email: 'admin@admin.com' }
    });

    if(existingAdmin) {
      this.logger.log('   ⏭️  Usuario admin ya existe');
      return;
    }

    // Obtener el rol de administrador
    const adminRole = await this.rolRepository.findOne({
      where: { role_name: 'Administrador' },
    });

    if (!adminRole) {
      throw new Error('Rol de administrador no encontrado');
    }

    // Crear usuario administrador (la entidad hasheará automáticamente)
    const adminUser = this.usuariosRepository.create({
      username: 'admin',
      email: 'admin@admin.com',
      password: 'admin123', // ✅ La entidad lo hasheará automáticamente
      role: adminRole,
    });

    await this.usuariosRepository.save(adminUser);
    this.logger.log('   ✅ Usuario admin creado: admin@admin.com / admin123');
  }
  private async createDefaultOrders() {
    for (const [ordenId, config] of Object.entries(this.ORDENES_CONFIG)) {
      const existingOrder = await this.catalogoOrdenRepository.findOne({
        where: { order_name: config.name }
      });
      
      if (!existingOrder) {
        const order = this.catalogoOrdenRepository.create({
          order_name: config.name,
          /* required_points: config.required_points */
        });
        await this.catalogoOrdenRepository.save(order);
        this.logger.log(`   ✅ Orden creada: ${config.name}` /* (${config.required_points} puntos requeridos) */);
      } else {
        this.logger.log(`   ⏭️  Orden ya existe: ${config.name}`);
      }
    }
  }

  // Método público para ejecutar seeding manualmente
  async runSeeding() {
    this.logger.log('🔄 Ejecutando seeding manual...');
    await this.seedDatabase();
  }

  // ✅ Método para obtener la configuración de puntos
  getOrdenesConfig() {
    return this.ORDENES_CONFIG;
  }
}
