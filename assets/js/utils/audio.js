// Reproducción de voces grabadas y voz automática (síntesis del navegador).
let actual = null;

export function detener() {
  if (actual) { actual.pause(); actual = null; }
  if ("speechSynthesis" in window) speechSynthesis.cancel();
}

export function reproducir(url) {
  detener();
  const a = (actual = new Audio(url));
  return new Promise((resolver) => {
    a.onended = a.onerror = resolver;
    a.play().catch(resolver);
  });
}

/** Lee un texto en voz alta. Con encolar:true no corta lo que se está diciendo. Devuelve promesa al terminar. */
export function hablar(texto, { lento = false, encolar = false, idioma = "es" } = {}) {
  if (!encolar) detener();
  if (!("speechSynthesis" in window)) return Promise.resolve();
  if (!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(texto);
  const voces = speechSynthesis.getVoices();
  u.voice = idioma === "en"
    ? voces.find((v) => v.lang === "en-US") || voces.find((v) => v.lang.startsWith("en")) || null
    : voces.find((v) => v.lang === "es-AR") || voces.find((v) => v.lang.startsWith("es")) || null;
  u.lang = u.voice?.lang || (idioma === "en" ? "en-US" : "es-AR");
  u.rate = lento ? 0.7 : 0.95;
  u.pitch = 1.1;
  return new Promise((resolver) => {
    u.onend = u.onerror = resolver;
    speechSynthesis.speak(u);
    setTimeout(resolver, 1500 + texto.length * 120); // por si el navegador no dispara onend
  });
}

/** Usa la voz de la familia si existe; si no, la voz automática. */
export function escuchar(audioUrl, texto) {
  return audioUrl ? reproducir(audioUrl) : hablar(texto, { lento: true });
}

/** Palabra en inglés, clara y un poco lenta. */
export const hablarIngles = (texto, opciones = {}) => hablar(texto, { lento: true, idioma: "en", ...opciones });
