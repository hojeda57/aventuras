// Cálculos de plata para el kiosco (todo en pesos enteros).
export const azar = (lista) => lista[Math.floor(Math.random() * lista.length)];
export const mezclar = (lista) => [...lista].sort(() => Math.random() - 0.5);

/** Suma al azar de `cantidad` billetes (con repetición) sin pasarse de `maximo`. */
export function sumaDeBilletes(valores, cantidad, maximo) {
  for (let intento = 0; intento < 50; intento++) {
    const elegidos = Array.from({ length: cantidad }, () => azar(valores));
    const total = elegidos.reduce((a, b) => a + b, 0);
    if (total <= maximo) return { total, elegidos: elegidos.sort((a, b) => b - a) };
  }
  return { total: Math.min(...valores), elegidos: [Math.min(...valores)] };
}

/** Billetes para pagar justo, empezando por los más grandes. */
export function solucion(monto, valores) {
  const res = [];
  let resto = monto;
  for (const v of [...valores].sort((a, b) => b - a)) {
    while (resto >= v) { res.push(v); resto -= v; }
  }
  return resto === 0 ? res : null;
}
