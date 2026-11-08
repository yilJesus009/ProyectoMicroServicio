import { HttpErrorResponse } from '@angular/common/http';

/**
 * Traduce cualquier error de una llamada a un mensaje para la persona.
 *
 * Regla de docs/frontend.md: si el backend responde 409 o 422 (o cualquier
 * estado con sobre), se muestra SU `msg` en español; el frontend no inventa
 * textos de dominio.
 *
 * @param error error capturado en el componente
 * @param fallback texto cuando el backend no mandó ninguno
 */
export function mensajeDeError(error: unknown, fallback = 'No se pudo completar la operación'): string {
  if (error instanceof HttpErrorResponse) {
    // status 0 = el navegador no llegó al Gateway (contenedor apagado, CORS…)
    if (error.status === 0) return 'No hay conexión con el servidor';

    const msg = (error.error as { msg?: unknown } | null)?.msg;
    if (typeof msg === 'string' && msg.trim().length > 0) return msg.trim();

    return fallback;
  }

  if (error instanceof Error && error.message.trim().length > 0) return error.message;

  return fallback;
}
