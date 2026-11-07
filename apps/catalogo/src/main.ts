import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './presentation/http/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = Number(process.env.CATALOGO_PORT ?? 4004);
  await app.listen(port);
}
bootstrap();
