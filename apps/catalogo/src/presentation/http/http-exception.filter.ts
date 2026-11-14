import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { Response } from 'express';
import { CategoryNotFoundError } from '../../domain/errors/category-not-found.error';
import { CategoryNameConflictError } from '../../domain/errors/category-name-conflict.error';
import { VehicleNotFoundError } from '../../domain/errors/vehicle-not-found.error';
import { VehicleForbiddenError } from '../../domain/errors/vehicle-forbidden.error';

/** Traduce cualquier error a HTTP con el sobre {status, msg, data} (docs/convenciones.md). */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof CategoryNotFoundError || exception instanceof VehicleNotFoundError) {
      res.status(404).json({ status: 404, msg: exception.message, data: null });
      return;
    }

    if (exception instanceof CategoryNameConflictError) {
      res.status(409).json({ status: 409, msg: exception.message, data: null });
      return;
    }

    if (exception instanceof VehicleForbiddenError) {
      res.status(403).json({ status: 403, msg: exception.message, data: null });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const msg = HttpExceptionFilter.extractMessage(body, exception.message);
      res.status(status).json({ status, msg, data: null });
      return;
    }

    // Un 4xx que viene de una librería (p. ej. el `SyntaxError` de
    // body-parser ante un JSON mal formado, con `status: 400`) antes que
    // el 500 genérico (revisión fase 5, hallazgo 2).
    const status = HttpExceptionFilter.libraryStatus(exception);
    if (status !== undefined) {
      res.status(status).json({ status, msg: 'El cuerpo de la petición no es JSON válido', data: null });
      return;
    }

    this.logger.error(exception);
    res.status(500).json({ status: 500, msg: 'Error interno del servidor', data: null });
  }

  /**
   * El `message` del body de un `HttpException` puede ser un string, o un
   * array (el `ValidationPipe`, cuando class-validator reporta varios
   * errores). Un array nunca debe llegar tal cual al `msg` del sobre
   * (revisión fase 5, hallazgo 3): se une en un solo texto legible.
   */
  private static extractMessage(body: unknown, fallback: string): string {
    if (typeof body === 'string') return body;
    const message = (body as { message?: unknown })?.message;
    if (Array.isArray(message)) {
      return message.length > 0 ? message.join('; ') : fallback;
    }
    return typeof message === 'string' ? message : fallback;
  }

  private static libraryStatus(exception: unknown): number | undefined {
    const err = exception as { status?: unknown; statusCode?: unknown };
    for (const candidate of [err?.status, err?.statusCode]) {
      if (typeof candidate === 'number' && candidate >= 400 && candidate < 500) {
        return candidate;
      }
    }
    return undefined;
  }
}
