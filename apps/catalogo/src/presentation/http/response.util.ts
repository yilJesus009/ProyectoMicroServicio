/** Sobre de respuesta obligatorio (docs/convenciones.md §3). */
export function success<T>(data: T, msg = 'Operación exitosa', status = 200) {
  return { status, msg, data };
}
