// Reconocimiento de voz (Web Speech API). Funciona en Chrome/Edge; requiere HTTPS o localhost.
// En Chrome el audio se procesa en línea (servicio de Google), por eso necesita internet.
const SR = globalThis.window?.SpeechRecognition || globalThis.window?.webkitSpeechRecognition;
export const reconocimientoDisponible = Boolean(SR);

const NUMEROS = ["cero","uno","dos","tres","cuatro","cinco","seis","siete","ocho","nueve","diez",
  "once","doce","trece","catorce","quince","dieciseis","diecisiete","dieciocho","diecinueve","veinte"];
const FUNCION = new Set(["el","la","los","las","un","una","en","de","y","a","e","o","mi","me","se","es","que","al","del","con","su"]);

export function normalizar(texto) {
  return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\d+/g, (d) => NUMEROS[Number(d)] ?? d)
    .replace(/[^a-zñ\s]/g, " ").replace(/\s+/g, " ").trim();
}

function distancia(a, b) {
  const f = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = f[0]; f[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = f[j];
      f[j] = Math.min(f[j] + 1, f[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return f[b.length];
}

function parecida(objetivo, dicha) {
  if (objetivo === dicha) return true;
  if (objetivo.length <= 4) return false;          // cortas: exactas (PATO ≠ GATO)
  const umbral = objetivo.length <= 6 ? 0.8 : 0.7;  // medianas: 1 letra de tolerancia
  return 1 - distancia(objetivo, dicha) / Math.max(objetivo.length, dicha.length) >= umbral;
}

/**
 * Compara lo que dijo con el texto esperado. Es generoso a propósito: son chicos de 4 a 8 años.
 * Devuelve { ok, ratio, palabras: [{ texto, leida }] } para pintar qué palabras reconoció.
 */
export function comparar(textoEsperado, candidatos, umbral = 0.75) {
  const dichas = new Set();
  candidatos.forEach((c) => {
    const ws = normalizar(c).split(" ").filter(Boolean);
    ws.forEach((w, i) => { dichas.add(w); if (ws[i + 1]) dichas.add(w + ws[i + 1]); }); // "mari posa" → "mariposa"
    dichas.add(ws.join(""));
  });
  const originales = textoEsperado.split(/\s+/).filter(Boolean);
  const palabras = originales.map((t) => {
    const n = normalizar(t);
    return { texto: t, norm: n, leida: !n || [...dichas].some((d) => parecida(n, d)) };
  });
  const contenido = palabras.filter((p) => p.norm && !FUNCION.has(p.norm));
  const base = contenido.length ? contenido : palabras;
  const ratio = base.length ? base.filter((p) => p.leida).length / base.length : 0;
  return { ok: ratio >= umbral, ratio, palabras };
}

/** Escucha hasta que el chico hace una pausa larga o se termina el tiempo. Devuelve alternativas de texto. */
export function escucharVoz({ palabras = 1, alEmpezar } = {}) {
  return new Promise((resolver, rechazar) => {
    const r = new SR();
    r.lang = "es-AR";
    r.continuous = palabras > 1;
    r.interimResults = false;
    r.maxAlternatives = 5;
    const candidatos = [];
    let silencio, terminado = false;
    const limite = setTimeout(() => r.stop(), 4000 + palabras * 900);
    const fin = () => { if (!terminado) { terminado = true; clearTimeout(limite); clearTimeout(silencio); resolver(candidatos); } };

    r.onstart = () => alEmpezar?.();
    r.onresult = (e) => {
      const partes = [];
      for (let i = 0; i < e.results.length; i++) {
        partes.push(e.results[i][0].transcript);
        for (const alt of e.results[i]) candidatos.push(alt.transcript);
      }
      candidatos.push(partes.join(" "));
      clearTimeout(silencio);
      silencio = setTimeout(() => r.stop(), 2200); // pausa larga = terminó de leer
    };
    r.onerror = (e) => {
      if (["no-speech", "aborted"].includes(e.error)) return fin();
      terminado = true; clearTimeout(limite); rechazar(e);
    };
    r.onend = fin;
    r.start();
    escucharVoz.detener = () => r.stop();
  });
}
