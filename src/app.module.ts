import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CiudadanosModule } from './ciudadanos/ciudadanos.module';
import { ServiciosCiudadanosModule } from './servicios_ciudadanos/servicios_ciudadanos.module';
import { CatalogoServiciosModule } from './catalogo_servicios/catalogo_servicios.module';
import { CatalogoOrdenModule } from './catalogo_orden/catalogo_orden.module';
import { RolModule } from './rol/rol.module';
import { SeedingModule } from './seeding/seeding.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // hace que esté disponible en toda la app
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get('DB_HOST'),
        port: parseInt(config.get('DB_PORT'), 10),
        username: config.get('DB_USERNAME'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
      }),
    }),
    AuthModule,
    UsersModule,
    CiudadanosModule,
    ServiciosCiudadanosModule,
    CatalogoServiciosModule,
    CatalogoOrdenModule,
    RolModule,
    SeedingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
