import { Controller, Get } from '@nestjs/common';

/** Fuera del prefijo /api/v1 (main.ts): el Gateway consulta /health directo. */
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { service: 'catalogo', status: 'OK' };
  }
}
