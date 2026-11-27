import { MonedaPipe } from './moneda.pipe';

describe('MonedaPipe', () => {
  const pipe = new MonedaPipe();

  it('monto entero: sin decimales', () => {
    expect(pipe.transform(620, 'BOB')).toBe('Bs 620');
  });

  it('monto con centavos: siempre dos decimales', () => {
    expect(pipe.transform(620.5, 'BOB')).toBe('Bs 620.50');
  });

  it('moneda distinta de BOB: muestra el código tal cual', () => {
    expect(pipe.transform(100, 'USD')).toBe('USD 100');
  });
});
