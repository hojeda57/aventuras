export function resultado(r) {
  if (r.operacion === "suma") return r.a + r.b;
  if (r.operacion === "resta") return r.a - r.b;
  return r.a;
}

/** Nivel según el número más grande involucrado: ≤5 → 1, ≤10 → 2, resto → 3 */
export function nivelDe(r) {
  if (r.nivel) return r.nivel;
  const max = Math.max(r.a, r.operacion === "contar" ? 0 : r.b, resultado(r));
  return max <= 5 ? 1 : max <= 10 ? 2 : 3;
}

export const repetir = (emoji, n) => Array.from({ length: n }, () => emoji).join("");
