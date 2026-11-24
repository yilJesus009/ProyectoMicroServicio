import { Pipe, PipeTransform } from '@angular/core';

/**
 * "Bs 620" si el monto es entero, "Bs 620.50" si tiene centavos
 * (DISENO.md sección 11: decimales solo si el dato los tiene).
 * Si la moneda no es BOB, muestra su código tal cual en vez de "Bs".
 */
@Pipe({ name: 'moneda' })
export class MonedaPipe implements PipeTransform {
  transform(monto: number | null | undefined, currency: string | null | undefined): string {
    if (monto == null) return '';

    const decimales = Number.isInteger(monto) ? 0 : 2;
    const numero = monto.toLocaleString('en-US', {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    });
    const simbolo = currency === 'BOB' ? 'Bs' : (currency ?? '');

    return simbolo ? `${simbolo} ${numero}` : numero;
  }
}
