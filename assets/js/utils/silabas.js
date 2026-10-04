// Separación silábica del español (reglas de imprenta, suficiente para lectura inicial).
const VOCALES = "aeiouáéíóúü";
const FUERTES = "aeoáéóíú"; // í/ú acentuadas rompen el diptongo (hiato)
const INSEPARABLES = new Set(["pr","br","tr","dr","cr","gr","fr","pl","bl","cl","gl","fl","kr","kl"]);

function unidades(palabra) {
  const w = palabra.toLowerCase();
  const u = [];
  for (let i = 0; i < w.length; ) {
    const dos = w.slice(i, i + 2), sig = w[i + 2];
    if (["ch", "ll", "rr"].includes(dos) ||
        ((dos === "qu" || dos === "gu") && sig && "eéií".includes(sig))) {
      u.push({ t: dos, ini: i, vocal: false }); i += 2; continue;
    }
    const c = w[i];
    let vocal = VOCALES.includes(c);
    if (c === "y") { const n = w[i + 1]; vocal = i > 0 && (!n || !VOCALES.includes(n)); }
    u.push({ t: c, ini: i, vocal }); i++;
  }
  return u;
}

const hiato = (a, b) => FUERTES.includes(a) && FUERTES.includes(b);

/** "TORTUGA" → ["TOR", "TU", "GA"] */
export function silabear(palabra) {
  const limpia = palabra.trim();
  if (!limpia) return [];
  const u = unidades(limpia);
  const nucleos = [];
  u.forEach((x, i) => {
    if (!x.vocal) return;
    const ult = nucleos.at(-1);
    if (ult && ult[1] === i - 1 && !hiato(u[i - 1].t, x.t)) ult[1] = i;
    else nucleos.push([i, i]);
  });
  if (nucleos.length < 2) return [limpia];

  const par = (k) => INSEPARABLES.has(u[k].t + u[k + 1].t);
  const cortes = [];
  for (let k = 0; k < nucleos.length - 1; k++) {
    const a = nucleos[k][1] + 1, n = nucleos[k + 1][0] - a;
    if (n <= 1) cortes.push(a);
    else if (n === 2) cortes.push(par(a) ? a : a + 1);
    else if (n === 3) cortes.push(par(a + 1) ? a + 1 : a + 2);
    else cortes.push(a + 2);
  }
  const posiciones = [0, ...cortes.map((k) => u[k].ini), limpia.length];
  return posiciones.slice(0, -1).map((p, i) => limpia.slice(p, posiciones[i + 1]));
}

/** Frases: separa cada palabra y las une con " / ". */
export function silabearTexto(texto) {
  return texto.trim().split(/\s+/).filter(Boolean).map((p) => silabear(p.replace(/[.,;:¡!¿?"“”]/g, "")).join(" • ")).join("  /  ");
}
