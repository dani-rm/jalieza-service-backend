import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      errorHttpStatusCode: 400,
      exceptionFactory: (errors) => {
        console.error(errors); // Esto imprime el detalle del error en consola
        return new BadRequestException(errors);
      },
    }),
  );

  app.use(cookieParser()); // ✅ Habilita cookies

  app.enableCors({
    origin: ['http://localhost:4200', 'https://registro-ciudadano.jalieza.com.mx'], // ⚠️ Cambia esto si usas otro frontend
    credentials: true, // ✅ Permite enviar cookies entre frontend y backend
  });

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
