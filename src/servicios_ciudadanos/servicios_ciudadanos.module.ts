import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiciosCiudadanosService } from './servicios_ciudadanos.service';
import { ServiciosCiudadanosController } from './servicios_ciudadanos.controller';
import { ServiciosCiudadano } from './entities/servicios_ciudadano.entity';
import { Ciudadanos } from 'src/ciudadanos/entities/ciudadano.entity';
import { CatalogoServicio } from 'src/catalogo_servicios/entities/catalogo_servicio.entity';
import { CiudadanosModule } from 'src/ciudadanos/ciudadanos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiciosCiudadano, Ciudadanos,CatalogoServicio]),  // Aquí registras los repositorios
    CiudadanosModule,
  ],
  controllers: [ServiciosCiudadanosController],
  providers: [ServiciosCiudadanosService],
  exports: [ServiciosCiudadanosService],
})
export class ServiciosCiudadanosModule {}
