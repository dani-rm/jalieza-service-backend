import { Module } from '@nestjs/common';
import { CatalogoServiciosService } from './catalogo_servicios.service';
import { CatalogoServiciosController } from './catalogo_servicios.controller';
import { CatalogoServicio } from '../catalogo_servicios/entities/catalogo_servicio.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogoOrden } from '../catalogo_orden/entities/catalogo_orden.entity';

@Module({
    imports: [TypeOrmModule.forFeature([CatalogoServicio, CatalogoOrden ])],

  controllers: [CatalogoServiciosController],
  providers: [CatalogoServiciosService],
})
export class CatalogoServiciosModule {}
