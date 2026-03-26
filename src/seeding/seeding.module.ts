import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedingService } from './seeding.service';
import { Rol } from '../rol/entities/rol.entity';
import { Usuarios } from '../users/entities/user.entity';
import { CatalogoOrden } from 'src/catalogo_orden/entities/catalogo_orden.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Rol, Usuarios, CatalogoOrden])],
  providers: [SeedingService],
  exports: [SeedingService],
})
export class SeedingModule {}
