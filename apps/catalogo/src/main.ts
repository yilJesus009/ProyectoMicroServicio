import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './presentation/http/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  app.useGlobalFilters(new HttpExceptionFilter());
  // whitelist: true descarta del body cualquier campo que no este en el DTO
  // (p.ej. que alguien intente mandar owner_id a mano).
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  const port = Number(process.env.CATALOGO_PORT ?? 4004);
  await app.listen(port);
}
bootstrap();
