import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './presentation/http/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // docs/docs-json: público y sin JWT (igual que health), solo en la red
  // interna de Docker (este servicio no expone puerto al host).
  app.setGlobalPrefix('api/v1', { exclude: ['health', 'docs', 'docs-json'] });
  app.useGlobalFilters(new HttpExceptionFilter());
  // whitelist: true descarta del body cualquier campo que no este en el DTO
  // (p.ej. que alguien intente mandar owner_id a mano).
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Catálogo — RepuestosYa')
    .setDescription('Categorías de repuestos y vehículos de cada usuario.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  const port = Number(process.env.CATALOGO_PORT ?? 4004);
  await app.listen(port);
}
bootstrap();
