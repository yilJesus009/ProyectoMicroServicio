/**
 * Ícono propio de una categoría, por nombre (DISEÑO.md sección 10): si el
 * nombre normalizado coincide con uno de los 6 PNG entregados, se usa ese
 * ícono; si no (categorías nuevas que crea el admin), no hay PNG y quien
 * llama cae al ícono `build` de Material.
 *
 * Puramente de presentación: no toca la API ni el modelo de Categoria.
 */

/** Categorías con ícono propio (sección 10). */
export const CATEGORIAS_CON_ICONO = [
  'frenos',
  'motor',
  'suspension',
  'electrico',
  'carroceria',
  'neumaticos',
] as const;

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Slug del ícono propio para `nombre`, o null si no hay uno. */
export function iconoCategoriaPorNombre(nombre: string | null | undefined): string | null {
  const normalizado = normalizar(nombre ?? '');
  return (CATEGORIAS_CON_ICONO as readonly string[]).includes(normalizado) ? normalizado : null;
}
