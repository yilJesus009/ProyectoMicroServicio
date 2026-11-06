import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { Response } from 'express';
import { CategoryNotFoundError } from '../../domain/errors/category-not-found.error';

/** Traduce cualquier error a HTTP con el sobre {status, msg, data} (docs/convenciones.md). */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof CategoryNotFoundError) {
      res.status(404).json({ status: 404, msg: exception.message, data: null });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const msg = typeof body === 'string' ? body : (body as { message?: string }).message ?? exception.message;
      res.status(status).json({ status, msg, data: null });
      return;
    }

    this.logger.error(exception);
    res.status(500).json({ status: 500, msg: 'Error interno del servidor', data: null });
  }
}
