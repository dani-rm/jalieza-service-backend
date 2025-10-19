import { Module } from '@nestjs/common';
import { CiudadanosService } from './ciudadanos.service';
import { CiudadanosController } from './ciudadanos.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ciudadanos } from './entities/ciudadano.entity';
import { MaritalStatusService } from './services/marital-status.service';
// import { PointsManagementService } from './services/points-management.service';
import { CatalogoOrden } from 'src/catalogo_orden/entities/catalogo_orden.entity';
import { ServiciosCiudadano } from 'src/servicios_ciudadanos/entities/servicios_ciudadano.entity';
import { SeedingModule } from 'src/seeding/seeding.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ciudadanos, CatalogoOrden, ServiciosCiudadano]),
    SeedingModule
  ],
  controllers: [CiudadanosController],
  providers: [CiudadanosService, MaritalStatusService, /* PointsManagementService */],
  exports: [CiudadanosService,/*  PointsManagementService */],
})
export class CiudadanosModule {}
