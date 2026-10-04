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

/**
 * Abre el micrófono y escucha.
 *  - manual: true  → escucha SIN límite de pausas hasta que se llame a terminar() (botón "¡Terminé!").
 *                    Si el navegador corta solo (Chrome lo hace tras un silencio), se vuelve a abrir sin perder lo leído.
 *  - manual: false → termina solo tras una pausa de 2,5 s (palabras sueltas).
 * alParcial(texto) se llama mientras habla, con todo lo reconocido hasta ese momento (para pintar en vivo).
 * Devuelve { terminar(), resultado } — resultado es una promesa con las alternativas de texto.
 */
export function escuchar({ manual = true, palabras = 1, alEmpezar, alParcial } = {}) {
  const finales = [], alternativas = [];
  let parcial = "", terminado = false, actual = null, silencio = null, reinicios = 0, empezo = false;
  let resolver, rechazar;
  const resultado = new Promise((ok, mal) => { resolver = ok; rechazar = mal; });

  const terminar = () => {
    if (terminado) return;
    terminado = true;
    clearTimeout(silencio); clearTimeout(limite);
    try { actual?.stop(); } catch { /* ya estaba cerrado */ }
    // pequeña espera para recibir el último resultado que el navegador tenga en camino
    setTimeout(() => resolver([[...finales, parcial].join(" ").trim(), ...alternativas, parcial].filter(Boolean)), 400);
  };

  const abrir = () => {
    const r = (actual = new SR());
    r.lang = "es-AR";
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 5;
    r.onstart = () => { if (!empezo) { empezo = true; alEmpezar?.(); } };
    r.onresult = (e) => {
      parcial = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) {
          finales.push(res[0].transcript);
          for (const alt of res) alternativas.push(alt.transcript);
        } else parcial += res[0].transcript + " ";
      }
      alParcial?.([...finales, parcial].join(" "));
      if (!manual) { clearTimeout(silencio); silencio = setTimeout(terminar, 2500); }
    };
    r.onerror = (e) => {
      if (["not-allowed", "service-not-allowed"].includes(e.error)) {
        terminado = true; clearTimeout(limite); rechazar(e);
      } // "no-speech", "aborted", "network": se resuelven en onend
    };
    r.onend = () => {
      if (terminado) return;
      if (!manual) return terminar();
      if (++reinicios > 200) return terminar(); // seguridad
      setTimeout(() => { if (!terminado) { try { abrir(); } catch { terminar(); } } }, 250);
    };
    r.start();
  };

  // Límite de seguridad: 5 minutos leyendo (manual) o lo que dure una palabra (automático)
  const limite = setTimeout(terminar, manual ? 5 * 60 * 1000 : 6000 + palabras * 1500);
  try { abrir(); } catch (err) { terminado = true; clearTimeout(limite); rechazar(err); }
  return { terminar, resultado };
}
