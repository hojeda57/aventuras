import { api } from "../core/api.js";
import { guardiaNina } from "../components/nina-guardia.js";
import { $, $$, esc, toast } from "../core/dom.js";
import { ANIMOS, CATEGORIAS_INGLES, ELOGIOS_INGLES, FIGURITAS, JUEGOS_ESCRIBIR, PASOS_CAMINO, PRUEBA_FINAL, frase, g } from "../core/constantes.js";
import { PRENDAS_PAR, hayDibujo, manchaSVG, prendaSVG } from "../components/prendas.js";
import { actualizarBarra, renderBarra } from "../components/nina-barra.js";
import { celebrar } from "../components/celebracion.js";
import { detener, hablar, hablarIngles } from "../utils/audio.js";
import { sonido } from "../utils/sonidos.js";
import { dibujoHTML, usaDibujoPrenda } from "../components/dibujo.js";

const POR_SESION = 6;
const POR_SESION_EVAL = 8;   // los temas de la evaluación tienen más palabras: rondas un poco más largas
const esEval = (cat) => !!CATEGORIAS_INGLES[cat]?.evaluacion;
const NIVELES_INGLES = {
  1: { titulo: "Escuchar y mirar", emoji: "🎧", tipos: ["escuchar", "ver"], opciones: 3 },
  2: { titulo: "¿Cómo se dice?", emoji: "💬", tipos: ["escuchar", "ver", "traducir"], opciones: 4 },
  3: { titulo: "Completar letras", emoji: "✏️", tipos: ["ver", "traducir", "completar"], opciones: 4 },
};
const FESTEJOS = ["globos", "cohetes", "estrellas", "confeti"];

const e = { perfil: null, progreso: null, vocab: [], nivel: 1, categoria: null, sesion: [], idx: 0, ej: null,
  intentos: 0, aciertos: 0, falladas: [], paso: null, tema: null, repaso: false, puntosInicio: 0, subio: false, ocupado: false };
const nombre = () => e.perfil?.nombre || "";
const azar = (lista) => lista[Math.floor(Math.random() * lista.length)];
const mezclar = (lista) => [...lista].sort(() => Math.random() - 0.5);

// ------------------------------------------------------------------ inicio
async function iniciar() {
  if (!(await guardiaNina("ingles"))) return;
  try { [e.perfil, e.progreso, e.vocab] = await Promise.all([api.perfil(), api.progreso(), api.listar("ingles")]); }
  catch (err) { toast(`No se pudo conectar: ${err.message}`, "error"); return; }
  renderBarra($("#barra"), { perfil: e.perfil, progreso: e.progreso });
  e.nivel = e.progreso.nivelIngles || 1;
  $("#app").classList.add("uppercase");   // imprenta mayúscula: más fácil para leer y escribir
  document.addEventListener("keydown", (ev) => {   // en la PC también se puede escribir con el teclado
    if (e.ej?.tipo !== "teclado" || !$("#teclado") || ev.ctrlKey || ev.altKey || ev.metaKey) return;
    if (/^[a-zñ]$/i.test(ev.key)) tecla(ev.key.toUpperCase());
    else if (ev.key === "Backspace") { ev.preventDefault(); tecla("borrar"); }
  });
  pantallaElegir();
}

function pantallaElegir() {
  detener();
  const desbloqueado = e.progreso.nivelIngles || 1;
  const contar = (cat) => e.vocab.filter((v) => v.categoria === cat).length;
  const temas = Object.entries(CATEGORIAS_INGLES).filter(([k]) => contar(k));
  const evaluacion = temas.filter(([k]) => esEval(k)), otros = temas.filter(([k]) => !esEval(k));
  const medalla = (cat) => (camino(cat).prueba || 0) > 0;
  const pasoActual = (cat) => Math.min(PASOS_CAMINO.findIndex((p) => !camino(cat)[p.id]) + 1 || PASOS_CAMINO.length, PASOS_CAMINO.length);
  const tarjetaTema = (k, c) => `
        <button type="button" data-cat="${k}" class="btn-tactil rounded-[2rem] p-space-md ${c.fondo} shadow-[0_6px_0_0_rgba(0,0,0,0.12)] text-center hover:-translate-y-1 transition-transform">
          <span class="block text-[64px] leading-none">${c.emoji}</span>
          <span class="block font-headline-sm text-headline-sm mt-2">${c.titulo}</span>
          <span class="block font-label-md text-label-md opacity-80">${c.en}</span>
          ${c.evaluacion ? `<span class="block mt-1 font-label-md text-label-md">${medalla(k) ? "🏅 ¡Medalla!" : `Paso ${pasoActual(k)} de ${PASOS_CAMINO.length}`}</span>` : ""}
        </button>`;
  const medallas = evaluacion.filter(([k]) => medalla(k)).length, finalAbierta = true;
  const estrellasJuego = (j) => camino("escribir")[j.id] || 0;
  $("#app").innerHTML = `
    <h1 class="font-headline-xl-mobile text-headline-xl-mobile sm:font-headline-xl sm:text-headline-xl text-center">🏰 Castillo del Inglés</h1>
    <p class="text-center font-body-lg text-body-lg text-on-surface-variant mb-space-lg">Let's play! ¿Qué querés aprender hoy?</p>

    <div class="flex justify-center gap-space-sm mb-space-lg flex-wrap" role="group" aria-label="Nivel">
      ${[1, 2, 3].map((n) => {
        const bloqueado = false, m = NIVELES_INGLES[n];
        return `<button type="button" data-nivel="${n}" ${bloqueado ? "disabled" : ""} aria-pressed="${e.nivel === n}"
          class="btn-tactil px-5 py-3 rounded-full font-label-lg text-label-lg shadow-[0_4px_0_0_rgba(0,0,0,0.1)]
          ${e.nivel === n ? "bg-[#8b5cf6] text-white" : "bg-white"} ${bloqueado ? "opacity-50 cursor-not-allowed" : ""}">
          ${bloqueado ? "🔒" : m.emoji} Nivel ${n}: ${m.titulo}</button>`;
      }).join("")}
    </div>

    ${evaluacion.length ? `
    <section class="rounded-[2.5rem] bg-[#fff8e1] border-4 border-[#fdd835] p-space-md sm:p-space-lg mb-space-lg">
      <h2 class="font-headline-md text-headline-md text-center">📝 Para mi evaluación</h2>
      <p class="text-center font-body-md text-body-md text-on-surface-variant mb-space-md">Elegí un tema y seguí su camino paso a paso. ¡Podés jugar todas las veces que quieras!</p>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-space-md">
        ${evaluacion.map(([k, c]) => tarjetaTema(k, c)).join("")}
        <button type="button" data-final="${finalAbierta ? "1" : ""}" class="btn-tactil rounded-[2rem] p-space-md text-center hover:-translate-y-1 transition-transform
          ${finalAbierta ? "bg-[#fdd835] shadow-[0_6px_0_0_#c6a700]" : "bg-white/70 border-4 border-dashed border-[#fdd835]"}">
          <span class="block text-[64px] leading-none ${finalAbierta ? "" : "grayscale opacity-50"}">🏆</span>
          <span class="block font-headline-sm text-headline-sm mt-2">Prueba final</span>
          <span class="block font-label-md text-label-md opacity-80">${camino("final").prueba ? "⭐".repeat(camino("final").prueba) : "Like the test!"} · 🏅 ${medallas}/${evaluacion.length}</span>
        </button>
      </div>
      <h3 class="font-headline-md text-headline-md text-center mt-space-lg">✏️ Juegos para escribir</h3>
      <p class="text-center font-body-md text-body-md text-on-surface-variant mb-space-md">Como en la prueba: mirá, contá y escribí en inglés.</p>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-space-md">
        ${JUEGOS_ESCRIBIR.map((j) => `
        <button type="button" data-escribir="${j.id}" class="btn-tactil rounded-[2rem] p-space-md bg-white border-4 border-[#c4b5fd] shadow-[0_6px_0_0_#ddd6fe] text-center hover:-translate-y-1 transition-transform">
          <span class="block text-[56px] leading-none">${j.emoji}</span>
          <span class="block font-headline-sm text-headline-sm mt-2">${j.titulo}</span>
          <span class="block font-label-md text-label-md text-on-surface-variant">${estrellasJuego(j) ? "⭐".repeat(estrellasJuego(j)) : j.desc}</span>
        </button>`).join("")}
      </div>
      <div class="text-center mt-space-md">
        <button id="sorpresa" type="button" class="btn-tactil px-8 py-4 rounded-full bg-[#8b5cf6] text-white font-headline-sm text-headline-sm shadow-[0_5px_0_0_#5b21b6]">🎲 ¡Juego sorpresa!</button>
      </div>
    </section>
    <h2 class="font-headline-md text-headline-md text-center mb-space-md">🌈 Más para aprender</h2>` : ""}
    <div class="grid grid-cols-2 md:grid-cols-4 gap-space-md">
      ${otros.map(([k, c]) => tarjetaTema(k, c)).join("")}
      <button type="button" data-cat="mezcla" class="btn-tactil rounded-[2rem] p-space-md bg-white shadow-[0_6px_0_0_rgba(0,0,0,0.08)] text-center hover:-translate-y-1 transition-transform">
        <span class="block text-[64px] leading-none">🎲</span>
        <span class="block font-headline-sm text-headline-sm mt-2">Todo mezclado</span>
        <span class="block font-label-md text-label-md opacity-80">Mix</span>
      </button>
    </div>
`;

  $$("[data-nivel]").forEach((b) => b.addEventListener("click", () => { sonido.tap(); e.nivel = Number(b.dataset.nivel); pantallaElegir(); }));
  $$("[data-cat]").forEach((b) => b.addEventListener("click", () => {
    sonido.tap();
    esEval(b.dataset.cat) ? pantallaCamino(b.dataset.cat) : empezar(b.dataset.cat);
  }));
  $("[data-final]")?.addEventListener("click", () => { sonido.tap(); empezar("evaluacion", null, PRUEBA_FINAL); });
  $$("[data-escribir]").forEach((b) => b.addEventListener("click", () => {
    sonido.tap();
    const j = JUEGOS_ESCRIBIR.find((x) => x.id === b.dataset.escribir);
    empezar(j.cat, null, j);
  }));
  $("#sorpresa")?.addEventListener("click", () => {   // cualquier juego de la evaluación, al azar
    sonido.tap();
    const temasEval = evaluacion.map(([k]) => k);
    const opciones = [...JUEGOS_ESCRIBIR.map((j) => () => empezar(j.cat, null, j)),
      ...temasEval.flatMap((t) => PASOS_CAMINO.filter((p) => p.tipos).map((p) => () => { e.tema = t; empezar(t, null, p); }))];
    azar(opciones)();
  });
}

const camino = (tema) => (e.perfil.caminoIngles || {})[tema] || {};
const palabrasDe = (tema) => e.vocab.filter((v) => v.categoria === tema).sort((a, b) => (a.orden || 0) - (b.orden || 0));

async function guardarPaso(tema, pasoId, estrellas) {
  const antes = camino(tema)[pasoId] || 0;
  if (estrellas > antes) {
    const todo = { ...(e.perfil.caminoIngles || {}) };
    todo[tema] = { ...camino(tema), [pasoId]: estrellas };
    try { e.perfil = await api.actualizarPerfil({ caminoIngles: todo }); } catch (err) { toast(err.message, "error"); }
  }
  return antes;
}

// ------------------------------------------------------------------ camino de un tema
function pantallaCamino(tema) {
  detener();
  Object.assign(e, { tema, paso: null });
  const c = CATEGORIAS_INGLES[tema], hecho = camino(tema);
  let siguiente = null;
  const pasos = PASOS_CAMINO.map((p, i) => {
    const est = hecho[p.id] || 0, disponible = true, ahora = !est && !siguiente;   // sin candados: puede elegir cualquiera
    if (ahora) siguiente = p;
    return `
      <button type="button" data-paso="${p.id}" ${disponible ? "" : "disabled"}
        class="btn-tactil w-full flex items-center gap-space-md text-left rounded-[2rem] p-space-md border-4 transition-transform
        ${ahora ? "bg-white border-[#8b5cf6] shadow-[0_6px_0_0_#c4b5fd] hover:-translate-y-1" : est ? "bg-white border-tertiary-container shadow-[0_5px_0_0_#b5f2d5]" : "bg-white/50 border-dashed border-surface-container-high opacity-60"}">
        <span class="shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-headline-sm text-headline-sm ${est ? "bg-tertiary-container text-white" : "bg-surface-container"}">${est ? "✓" : i + 1}</span>
        <span class="shrink-0 text-[52px] leading-none ${ahora ? "latido" : ""}">${disponible ? p.emoji : "🔒"}</span>
        <span class="grow">
          <span class="block font-headline-sm text-headline-sm">${p.titulo}</span>
          <span class="block font-body-md text-body-md text-on-surface-variant">${p.desc}</span>
        </span>
        <span class="shrink-0 text-[26px] whitespace-nowrap">${est ? "⭐".repeat(est) + `<span class="opacity-25">${"⭐".repeat(3 - est)}</span>` : ahora ? `<span class="font-label-lg text-label-lg text-[#8b5cf6]">¡Ahora!</span>` : ""}</span>
      </button>
      ${i < PASOS_CAMINO.length - 1 ? `<div class="h-6 w-2 mx-auto rounded-full ${est ? "bg-tertiary-container" : "bg-surface-container-high"}"></div>` : ""}`;
  }).join("");

  $("#app").innerHTML = `
    <div class="flex items-center justify-between mb-space-md">
      <a href="ingles.html" class="font-label-lg text-label-lg text-secondary">← Todos los temas</a>
      <button id="libre" type="button" class="font-label-lg text-label-lg text-secondary">🎲 Práctica libre</button>
    </div>
    <section class="rounded-[2.5rem] ${c.fondo} p-space-md sm:p-space-lg text-center shadow-[0_6px_0_0_rgba(0,0,0,0.1)]">
      <p class="text-[80px] leading-none">${c.emoji}</p>
      <h1 class="font-headline-xl-mobile text-headline-xl-mobile">Camino de ${esc(c.titulo)}</h1>
      <p class="font-headline-sm text-headline-sm opacity-80">${esc(c.en)} · ${palabrasDe(tema).length} palabras</p>
      ${hecho.prueba ? `<p class="mt-2 inline-block px-5 py-2 rounded-full bg-white/80 font-headline-sm text-headline-sm">🏅 ¡Ganaste la medalla!</p>` : ""}
    </section>
    <div class="max-w-2xl mx-auto mt-space-lg">${pasos}</div>`;

  $$("[data-paso]").forEach((b) => b.addEventListener("click", () => {
    sonido.tap();
    const p = PASOS_CAMINO.find((x) => x.id === b.dataset.paso);
    p.id === "conocer" ? pantallaConocer(tema) : empezar(tema, null, p);
  }));
  $("#libre").addEventListener("click", () => { sonido.tap(); empezar(tema); });
  hablar(siguiente ? `Camino de ${c.titulo}. Elegí el juego que quieras. Te recomiendo: ${siguiente.titulo}.`
    : g(`¡Completaste todo el camino de ${c.titulo}! Podés jugar otra vez para sacar más estrellas.`));
}

// ------------------------------------------------------------------ paso 1: conocer (tarjetas)
function pantallaConocer(tema, idx = 0) {
  const lista = palabrasDe(tema), v = lista[idx], c = CATEGORIAS_INGLES[tema];
  const ultimo = idx === lista.length - 1;
  $("#app").innerHTML = `
    <div class="flex items-center justify-between mb-space-md">
      <button id="volver" type="button" class="font-label-lg text-label-lg text-secondary">← Volver al camino</button>
      <span class="font-headline-sm text-headline-sm">${idx + 1} / ${lista.length}</span>
    </div>
    <div class="h-4 rounded-full bg-white overflow-hidden max-w-3xl mx-auto mb-space-md"><div class="h-full bg-[#8b5cf6] transition-all" style="width:${((idx + 1) / lista.length) * 100}%"></div></div>
    <article class="bg-white rounded-[2.5rem] shadow-[0_8px_0_0_#ede9fe] p-space-lg sm:p-space-xl text-center max-w-3xl mx-auto">
      <p class="font-headline-sm text-headline-sm text-on-surface-variant">👀 ${esc(c.en)}</p>
      <div class="mt-space-md">${visual(v)}</div>
      <p class="font-bold text-[56px] sm:text-[72px] leading-tight mt-space-md text-[#5b21b6]">${esc(v.en)}</p>
      <p class="font-headline-md text-headline-md text-on-surface-variant">${esc(v.es)}</p>
      <p id="estado" class="font-headline-sm text-headline-sm min-h-[32px] mt-space-sm" aria-live="polite"></p>
      <div class="flex justify-center gap-space-md mt-space-md flex-wrap">
        ${idx > 0 ? `<button id="ant" type="button" class="btn-tactil w-16 h-16 rounded-full bg-[#ede9fe] text-[28px] shadow-[0_4px_0_0_#c4b5fd]" aria-label="Anterior">⬅️</button>` : ""}
        <button id="oir" type="button" class="btn-tactil px-7 py-4 rounded-full bg-[#ede9fe] text-[#4c1d95] font-headline-sm text-headline-sm shadow-[0_4px_0_0_#c4b5fd]">🔊 Escuchar</button>
        <button id="sig" type="button" class="btn-tactil px-8 py-4 rounded-full bg-[#8b5cf6] text-white font-headline-sm text-headline-sm shadow-[0_5px_0_0_#5b21b6]">${ultimo ? "🎉 ¡Terminé!" : "Siguiente ➡️"}</button>
      </div>
    </article>`;
  const decir = async () => { await hablarIngles(v.en); await hablar(v.es, { encolar: true }); await hablarIngles(v.en, { encolar: true }); };
  $("#volver").addEventListener("click", () => pantallaCamino(tema));
  $("#oir").addEventListener("click", () => { sonido.tap(); decir(); });
  $("#ant")?.addEventListener("click", () => { sonido.tap(); pantallaConocer(tema, idx - 1); });
  $("#sig").addEventListener("click", async () => {
    if (!ultimo) { sonido.tap(); return pantallaConocer(tema, idx + 1); }
    await terminarConocer(tema);
  });
  if ((idx + 1) % 5 === 0 && !ultimo) {   // un festejito cada 5 palabras
    sonido.exito();
    $("#estado").textContent = `⭐ ¡Ya conocés ${idx + 1} palabras!`;
  }
  setTimeout(decir, 250);
}

async function terminarConocer(tema) {
  detener();
  sonido.nivel();
  await guardarPaso(tema, "conocer", 3);
  hablar(`¡Muy bien, ${nombre()}! Ya conocés todas las palabras. Ahora vamos a escuchar.`);
  await celebrar({ tipo: azar(FESTEJOS), titulo: `¡Muy bien, ${nombre()}!`, subtitulo: "Ya conocés todas las palabras ⭐⭐⭐", duracion: 3500 });
  pantallaCamino(tema);
}

async function empezar(categoria, soloIds = null, paso = null) {
  try { e.vocab = await api.listar("ingles"); } catch (err) { toast(err.message, "error"); return; }
  Object.assign(e, { categoria, paso: paso || (soloIds ? e.paso : null), repaso: !!soloIds });
  if (e.paso?.grupo === "escribir") e.tema = "escribir";
  const filtro = e.paso?.grupo === "escribir" ? FILTROS_ESCRIBIR[e.paso.id] : null;
  const entra = (v) => soloIds ? soloIds.includes(v.id) : filtro ? filtro(v)
    : categoria === "mezcla" || (categoria === "evaluacion" ? esEval(v.categoria) : v.categoria === categoria);
  // primero las que menos sabe, así cada ronda repasa palabras distintas
  const pool = e.vocab.filter(entra).sort((a, b) => (a.dominada || 0) - (b.dominada || 0) || Math.random() - 0.5);
  if (!pool.length) { toast("Todavía no hay palabras en este tema.", "error"); return; }
  const cuantas = soloIds ? soloIds.length : e.paso ? e.paso.preguntas : esEval(categoria) ? POR_SESION_EVAL : POR_SESION;
  Object.assign(e, { sesion: mezclar(pool.slice(0, cuantas)), idx: 0, aciertos: 0, falladas: [], puntosInicio: e.progreso.puntos, subio: false });
  pantallaJuego();
}

// ------------------------------------------------------------------ armado de ejercicios
function visual(v, grande = true) {
  if (conDibujo(v)) return prendaSVG(v.dibujo, colorDe(v), grande ? 190 : 92, esc(v.en));
  if (v.categoria === "numeros") {
    return `<span class="block font-bold leading-none text-secondary ${grande ? "text-[110px]" : "text-[64px]"}">${v.orden}</span>
      ${grande ? `<span class="block text-[26px] leading-tight mt-1">${"⭐".repeat(Math.min(v.orden, 10))}${v.orden > 10 ? `<br>${"⭐".repeat(v.orden - 10)}` : ""}</span>` : ""}`;
  }
  if (v.color) {
    const t = grande ? 150 : 84;
    return `<span class="inline-block rounded-full shadow-md ring-4 ring-white" style="background:${esc(v.color)};width:${t}px;height:${t}px${v.color.toLowerCase() === "#ffffff" ? ";outline:2px solid #d8e3fb" : ""}"></span>`;
  }
  return dibujoHTML(v, { clases: grande ? "text-[130px]" : "text-[72px]", tamImg: grande ? "w-48 h-48" : "w-24 h-24" });
}

function distractores(v, n) {
  const mismos = e.vocab.filter((x) => x.categoria === v.categoria && x.id !== v.id && !(x.dibujo && x.dibujo === v.dibujo));
  const otros = e.vocab.filter((x) => x.categoria !== v.categoria);
  return [...mezclar(mismos), ...mezclar(otros)].slice(0, n);
}

function armarEjercicio(v) {
  const cfg = e.paso ? { opciones: 3, ...e.paso } : NIVELES_INGLES[e.nivel];
  let tipos = [...cfg.tipos];
  if (v.categoria === "dias" && !e.paso) {
    tipos = tipos.map((t) => (t === "ver" ? "traducir" : t));   // un color no alcanza para reconocer un día
    if (e.nivel >= 2) tipos.push("despues", "despues");
  }
  const tipo = azar(tipos);
  if (TIPOS_TECLADO.includes(tipo)) return armarEscritura(v, tipo);
  if (tipo === "completar" || tipo === "escribir") return { tipo: "completar", v, ...armarCompletar(v, tipo === "escribir") };
  if (tipo === "despues") return armarDespues(v, cfg.opciones);
  return { tipo, v, opciones: mezclar([v, ...distractores(v, cfg.opciones - 1)]) };
}

function armarCompletar(v, mas = false) {
  const letras = [...v.en];
  const candidatas = letras.map((c, i) => (i > 0 && /[a-z]/i.test(c) ? i : -1)).filter((i) => i >= 0);
  const cantidad = mas ? Math.min(4, candidatas.length, Math.max(2, Math.ceil(candidatas.length / 2)))   // escribir: faltan más letras
    : Math.min(3, Math.max(1, Math.round(candidatas.length / 3)));
  const huecos = mezclar(candidatas).slice(0, cantidad).sort((a, b) => a - b);
  const faltan = huecos.map((i) => letras[i].toLowerCase());
  const abc = "abcdefghijklmnopqrstuvwxyz".split("").filter((c) => !faltan.includes(c));
  return { letras, huecos, llenos: 0, fichas: mezclar([...faltan, ...mezclar(abc).slice(0, 2)]) };
}

function armarDespues(v, n) {
  const dias = e.vocab.filter((x) => x.categoria === "dias").sort((a, b) => a.orden - b.orden);
  const i = dias.findIndex((d) => d.id === v.id);
  const despues = Math.random() < 0.6;
  const ref = dias[(i + (despues ? -1 : 1) + 7) % 7];
  const otros = dias.filter((d) => d.id !== v.id && d.id !== ref.id); // sin repetir el día de la pregunta
  return { tipo: "despues", v, ref, despues, opciones: mezclar([v, ...mezclar(otros).slice(0, n - 1)]) };
}

// ------------------------------------------------------------------ pantalla
function consigna(ej) {
  const { tipo, v } = ej;
  if (tipo === "escuchar") return { texto: "🎧 Escuchá y tocá el correcto", voz: () => hablarIngles(v.en) };
  if (tipo === "leer") return { texto: "📖 Leé la palabra y tocá el dibujo", voz: () => hablar("Leé la palabra y tocá el dibujo") };
  if (tipo === "ver") return { texto: "¿Cómo se dice en inglés?", voz: () => hablar("¿Cómo se dice en inglés?") };
  if (tipo === "traducir") return { texto: `¿Cómo se dice <b class="text-[#8b5cf6]">“${esc(v.es)}”</b> en inglés?`, voz: () => hablar(`¿Cómo se dice ${v.es} en inglés?`) };
  if (tipo === "completar") return { texto: "✏️ Completá la palabra", voz: () => hablarIngles(v.en) };
  if (tipo === "teclado") return CONSIGNAS_TECLADO[ej.sub];
  const txt = ej.despues ? "¿Qué día viene después de" : "¿Qué día viene antes de";
  return { texto: `${txt} <b class="text-[#8b5cf6]">${esc(ej.ref.en)}</b>?`,
    voz: async () => { await hablar(txt); await hablarIngles(ej.ref.en, { encolar: true }); } };
}

function opcionesHTML(ej) {
  const ilustradas = ["escuchar", "leer"].includes(ej.tipo) && ej.v.categoria !== "dias";
  return `<div class="grid ${ej.opciones.length === 4 ? "grid-cols-2" : "grid-cols-3"} gap-space-md mt-space-lg">
    ${ej.opciones.map((o) => `<button type="button" data-op="${esc(o.id)}"
      class="btn-tactil min-h-[110px] rounded-[1.75rem] bg-white border-4 border-surface-container-high shadow-[0_5px_0_0_#dee8ff] p-space-sm flex items-center justify-center text-center transition-colors">
      ${ilustradas ? visual(o, false)
        : ej.tipo === "escuchar" ? `<span class="font-headline-md text-headline-md uppercase">${esc(o.es)}</span>`
        : `<span class="font-bold text-[32px] sm:text-[38px] leading-tight">${esc(o.en)}</span>`}
    </button>`).join("")}
  </div>`;
}

function cajasHTML(ej) {
  const cajas = ej.letras.map((c, i) => {
    if (c === " ") return `<span class="w-4"></span>`;
    const hueco = ej.huecos.indexOf(i);
    if (hueco === -1 || hueco < ej.llenos)
      return `<span class="w-12 sm:w-14 h-16 rounded-[1rem] bg-surface-container-low flex items-center justify-center text-[40px] font-bold ${hueco !== -1 ? "text-tertiary" : ""}">${esc(c)}</span>`;
    return `<span class="w-12 sm:w-14 h-16 rounded-[1rem] border-4 border-dashed ${hueco === ej.llenos ? "border-[#8b5cf6] latido" : "border-surface-container-high"}"></span>`;
  }).join("");
  return `<div id="cajas" class="flex justify-center flex-wrap gap-2 mt-space-md" aria-label="Palabra para completar">${cajas}</div>`;
}

function completarHTML(ej) {
  return `${cajasHTML(ej)}
    <p class="font-body-lg text-body-lg text-on-surface-variant mt-2">(${esc(ej.v.es)})</p>
    <div id="fichas" class="flex justify-center flex-wrap gap-space-sm mt-space-lg">
      ${ej.fichas.map((f, i) => `<button type="button" data-ficha="${i}" class="btn-tactil w-16 h-16 rounded-[1.25rem] bg-[#ede9fe] text-[#4c1d95] text-[36px] font-bold shadow-[0_4px_0_0_#c4b5fd]">${f}</button>`).join("")}
    </div>`;
}

function pantallaJuego() {
  const ej = (e.ej = armarEjercicio(e.sesion[e.idx]));
  e.intentos = 0;
  const c = consigna(ej);
  const muestraVisual = ["ver", "traducir", "completar"].includes(ej.tipo) && ej.tipo !== "teclado" && !(ej.v.categoria === "dias" && ej.tipo !== "completar");
  const puntos = e.sesion.map((_, i) => `<span class="w-4 h-4 rounded-full ${i < e.idx ? "bg-tertiary-container" : i === e.idx ? "bg-[#8b5cf6] scale-125" : "bg-white"}"></span>`).join("");

  $("#app").innerHTML = `
    <div class="flex items-center justify-between mb-space-md">
      ${e.paso && e.paso.id !== "final" ? `<button id="volver" type="button" class="font-label-lg text-label-lg text-secondary">← ${e.tema === "escribir" ? "Volver al castillo" : "Volver al camino"}</button>`
        : `<a href="ingles.html" class="font-label-lg text-label-lg text-secondary">← Cambiar tema</a>`}
      <div class="flex gap-2 items-center" aria-label="Progreso">${puntos}</div>
    </div>
    <article id="tarjeta" class="bg-white rounded-[2.5rem] shadow-[0_8px_0_0_#ede9fe] p-space-lg sm:p-space-xl text-center max-w-3xl mx-auto">
      <div class="flex items-center justify-center gap-space-sm flex-wrap">
        <p class="font-headline-md text-headline-md">${c.texto}</p>
        <button id="btnOir" type="button" aria-label="Escuchar" class="btn-tactil w-14 h-14 rounded-full bg-[#ede9fe] text-[26px] shadow-[0_3px_0_0_#c4b5fd]">🔊</button>
      </div>
      ${ej.tipo === "escuchar" ? `<button id="btnOirGrande" type="button" class="btn-tactil mt-space-md px-8 py-4 rounded-full bg-[#8b5cf6] text-white font-headline-sm text-headline-sm shadow-[0_5px_0_0_#5b21b6]">🎧 Escuchar otra vez</button>` : ""}
      ${muestraVisual ? `<div class="mt-space-md">${visual(ej.v)}</div>` : ""}
      ${ej.tipo === "leer" ? `<p class="mt-space-md inline-block px-8 py-3 rounded-[1.5rem] bg-[#ede9fe] font-bold text-[56px] sm:text-[68px] leading-tight text-[#4c1d95]">${esc(ej.v.en)}</p>` : ""}
      ${ej.tipo === "teclado" ? tecladoHTML(ej) : ej.tipo === "completar" ? completarHTML(ej) : opcionesHTML(ej)}
      <p id="estado" class="font-headline-sm text-headline-sm min-h-[32px] mt-space-md" aria-live="polite"></p>
    </article>`;

  $("#btnOir").addEventListener("click", () => { sonido.tap(); c.voz(); });
  $("#volver")?.addEventListener("click", () => (e.tema === "escribir" ? pantallaElegir() : pantallaCamino(e.tema)));
  $("#ayuda")?.addEventListener("click", ayudaTeclado);
  $("#btnOirGrande")?.addEventListener("click", () => { sonido.tap(); hablarIngles(ej.v.en); });
  $("#tarjeta").addEventListener("click", alTocar);
  setTimeout(c.voz, 300);
}

// ------------------------------------------------------------------ respuestas
async function alTocar(ev) {
  if (e.ocupado) return;
  const t = ev.target.closest("[data-tecla]");
  if (t) return tecla(t.dataset.tecla);
  const op = ev.target.closest("[data-op]");
  if (op && !op.disabled) {
    if (op.dataset.op === e.ej.v.id) {
      op.classList.add("bg-tertiary-fixed", "border-tertiary-container");
      return acierto();
    }
    op.disabled = true;
    op.classList.add("opacity-40", "sacudir");
    return fallo();
  }
  const ficha = ev.target.closest("[data-ficha]");
  if (ficha && !ficha.disabled) {
    const ej = e.ej, esperada = ej.letras[ej.huecos[ej.llenos]].toLowerCase();
    if (ficha.textContent === esperada) {
      sonido.tap();
      ficha.disabled = true; ficha.classList.add("opacity-30");
      ej.llenos++;
      $("#cajas").outerHTML = cajasHTML(ej);
      if (ej.llenos === ej.huecos.length) return acierto();
    } else {
      ficha.classList.remove("sacudir"); void ficha.offsetWidth; ficha.classList.add("sacudir");
      return fallo();
    }
  }
}

async function fallo() {
  e.ocupado = true;
  e.intentos++;
  if (!e.falladas.includes(e.ej.v.id)) e.falladas.push(e.ej.v.id);   // aunque después acierte, conviene repasarla
  sonido.error();
  const ej = e.ej, max = ej.tipo === "completar" ? 3 : 2;
  if (e.intentos >= max) {
    $(`[data-op="${ej.v.id}"]`)?.classList.add("bg-tertiary-fixed", "border-tertiary-container", "latido");
    $("#estado").innerHTML = `Era <b>${esc(ej.v.en)}</b> = ${esc(ej.v.es)} 💜`;
    await hablar("Era");
    await hablarIngles(ej.v.en, { encolar: true });
    api.registrar("ingles", ej.v.id, false, e.nivel).catch(() => {});
    await new Promise((r) => setTimeout(r, 900));
    e.ocupado = false;
    return siguiente();
  }
  const animo = frase(ANIMOS, nombre());
  $("#estado").textContent = `🧡 ${animo}`;
  await hablar(animo);
  if (["escuchar", "completar"].includes(ej.tipo)) await hablarIngles(ej.v.en, { encolar: true });
  e.ocupado = false;
}

async function acierto() {
  e.ocupado = true;
  const v = e.ej.v, texto = e.ej.frase || v.en;
  let res;
  try { res = await api.registrar("ingles", v.id, true, e.nivel); }
  catch (err) { toast(err.message, "error"); e.ocupado = false; return; }
  e.progreso = res.progreso;
  e.aciertos++;
  e.subio ||= res.subioNivel;
  actualizarBarra(e.progreso);
  sonido.exito();
  const elogio = azar(ELOGIOS_INGLES);
  const voz = (async () => {
    await hablarIngles(texto);
    await hablarIngles(`${elogio}, ${nombre()}!`, { encolar: true, lento: false });
    await hablar("¡Muy bien!", { encolar: true });
  })();
  await Promise.all([voz, celebrar({ tipo: azar(FESTEJOS), titulo: `${elogio}, ${nombre()}!`, subtitulo: e.ej.frase ? texto.toUpperCase() : `${v.en} = ${v.es}`.toUpperCase(), puntos: res.puntosGanados })]);
  e.ocupado = false;
  siguiente();
}

function siguiente() {
  e.idx++;
  e.idx < e.sesion.length ? pantallaJuego() : pantallaFin();
}

async function pantallaFin() {
  if (e.paso) return pantallaFinPaso();
  const nuevas = FIGURITAS.filter((f) => f.puntos > e.puntosInicio && f.puntos <= e.progreso.puntos);
  $("#app").innerHTML = `
    <section class="text-center bg-white rounded-[2.5rem] shadow-[0_8px_0_0_#ede9fe] p-space-xl max-w-3xl mx-auto">
      <p class="text-[96px] leading-none">🏰</p>
      <h1 class="font-headline-xl-mobile text-headline-xl-mobile sm:font-headline-xl sm:text-headline-xl mt-space-sm">Well done!</h1>
      <p class="font-body-lg text-body-lg text-on-surface-variant mt-1">Acertaste ${e.aciertos} de ${e.sesion.length}</p>
      <p class="inline-block mt-space-md px-6 py-3 rounded-full bg-primary-fixed text-on-primary-fixed font-headline-md text-headline-md">+${e.progreso.puntos - e.puntosInicio} ⭐</p>
      ${nuevas.length ? `<div class="mt-space-lg p-space-md rounded-[2rem] bg-surface-container-low">
        <p class="font-headline-sm text-headline-sm">¡Figurita nueva en el cofre!</p>
        <p class="text-[72px] leading-tight">${nuevas.map((f) => f.emoji).join(" ")}</p></div>` : ""}
      ${e.falladas.length ? `<div class="mt-space-lg p-space-md rounded-[2rem] bg-[#fff8e1]">
        <p class="font-headline-sm text-headline-sm">Para practicar un poquito más:</p>
        <p class="font-body-lg text-body-lg mt-1">${e.falladas.map((id) => e.vocab.find((v) => v.id === id)).filter(Boolean).map((v) => `<b>${esc(v.en)}</b> = ${esc(v.es)}`).join(" · ")}</p>
        <button id="repasar" type="button" class="btn-tactil mt-space-md px-7 py-4 rounded-full bg-[#fdd835] font-headline-sm text-headline-sm shadow-[0_4px_0_0_#c6a700]">🎯 Practicar las que me costaron</button>
      </div>` : `<p class="mt-space-md font-headline-sm text-headline-sm">🌟 ¡Todas bien al primer intento!</p>`}
      <div class="flex flex-col sm:flex-row justify-center gap-space-md mt-space-lg">
        <button id="otra" type="button" class="btn-tactil px-7 py-4 rounded-full bg-[#8b5cf6] text-white font-headline-sm text-headline-sm shadow-[0_4px_0_0_#5b21b6]">🔁 Otra vez</button>
        <a href="ingles.html" class="btn-tactil px-7 py-4 rounded-full bg-[#ede9fe] text-[#4c1d95] font-headline-sm text-headline-sm shadow-[0_4px_0_0_#c4b5fd]">🎨 Otro tema</a>
        <a href="index.html" class="btn-tactil px-7 py-4 rounded-full bg-white border-2 border-surface-container-high font-headline-sm text-headline-sm">🏠 Mapa</a>
      </div>
    </section>`;
  const falladas = [...e.falladas];
  $("#otra").addEventListener("click", () => empezar(e.categoria));
  $("#repasar")?.addEventListener("click", () => empezar(e.categoria, falladas));
  if (e.subio) {
    sonido.nivel();
    hablar(`¡Felicitaciones, ${nombre()}! ¡Subiste al nivel ${e.progreso.nivelIngles} de inglés!`);
    await celebrar({ tipo: "confeti", titulo: `¡Subiste al nivel ${e.progreso.nivelIngles}!`, subtitulo: "Se abrieron ejercicios nuevos", duracion: 4500 });
    e.nivel = e.progreso.nivelIngles;
  } else {
    await hablarIngles(`Well done, ${nombre()}!`);
    hablar(nuevas.length ? "¡Ganaste una figurita nueva!" : "¡Muy bien!", { encolar: true });
  }
}

// ------------------------------------------------------------------ juegos para escribir (teclado de letras)
const TIPOS_TECLADO = ["contar", "eprenda", "ecolor", "enumero"];
const COLORES_DIBUJO = ["#e53935", "#1e88e5", "#43a047", "#fdd835", "#fb8c00", "#8e24aa", "#f48fb1", "#6d4c41", "#81d4fa"];
const NUMEROS_EN = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
  "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
const ACEPTA = { GRAY: ["GREY"], GREY: ["GRAY"] };   // otras formas válidas del mismo largo
const SIN_COLOR_PLENO = new Set(["glasses", "sunglasses", "sandals"]);   // el color no se ve bien entero
const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function conDibujo(v) { return v.categoria === "ropa" && usaDibujoPrenda(v); }
function colorDe(v) { return COLORES_DIBUJO[[...v.id].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORES_DIBUJO.length]; }
const coloresVocab = () => e.vocab.filter((x) => x.categoria === "colores" && x.color);
const palabraNumero = (n) => e.vocab.find((x) => x.categoria === "numeros" && x.orden === n)?.en || NUMEROS_EN[n];
const pluralDe = (v, n) => (n === 1 || PRENDAS_PAR.has(v.dibujo) ? v.en : v.plural || `${v.en}s`);
const letrasDe = (s) => [...s].filter((c) => /[A-ZÑ]/.test(c));
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const FILTROS_ESCRIBIR = {
  contar: conDibujo,
  prenda: conDibujo,
  color: (v) => v.categoria === "colores" && !!v.color,
  numero: (v) => v.categoria === "numeros" && v.orden >= 1 && v.orden <= 20,
};

const CONSIGNAS_TECLADO = {
  eprenda: { texto: "✏️ ¿Qué prenda es? Escribila en inglés", voz: () => hablar("¿Qué prenda es? Escribila en inglés") },
  ecolor:  { texto: "🎨 ¿De qué color es? Escribilo en inglés", voz: () => hablar("¿De qué color es? Escribilo en inglés") },
  enumero: { texto: "🔢 ¿Cuántas hay? Escribí el número en inglés", voz: () => hablar("Contá cuántas hay y escribí el número en inglés") },
  contar:  { texto: "🧮 Contá, mirá el color y escribí todo en inglés", voz: () => hablar("Contá cuántas hay, mirá el color y escribí todo en inglés") },
};

function grupoPrendas(dibujo, color, n) {
  const tam = n === 1 ? 170 : n <= 5 ? 96 : n <= 10 ? 76 : 60;
  // en filas de 5 (como un cuadro de diez): así es más fácil contar
  return `<div class="inline-grid gap-x-3 gap-y-2 sm:gap-x-4 sm:gap-y-3 justify-center" style="grid-template-columns:repeat(${Math.min(n, 5)},auto)">
    ${Array.from({ length: n }, () => prendaSVG(dibujo, color, n === 1 ? tam : `min(${tam}px, 14vw)`)).join("")}</div>`;
}

const campo = (respuesta, etiqueta) => ({ respuesta: respuesta.toUpperCase(), etiqueta, valor: [], marcas: {}, errores: 0, ok: false });

function armarEscritura(v, tipo) {
  const base = { tipo: "teclado", sub: tipo, v, actual: 0 };
  const prendas = e.vocab.filter(conDibujo), colores = coloresVocab();
  if (tipo === "eprenda") {
    return { ...base, escena: prendaSVG(v.dibujo, azar(colores)?.color || colorDe(v), 190), campos: [campo(v.en, "")] };
  }
  if (tipo === "ecolor") {
    const conColor = prendas.filter((p) => !SIN_COLOR_PLENO.has(p.dibujo));
    const p = Math.random() < 0.5 && conColor.length ? azar(conColor) : null;
    return { ...base, escena: p ? prendaSVG(p.dibujo, v.color, 180) : manchaSVG(v.color, 190), campos: [campo(v.en, "")] };
  }
  if (tipo === "enumero") {
    const p = azar(prendas);
    return { ...base, escena: grupoPrendas(p.dibujo, azar(colores)?.color || colorDe(p), v.orden), campos: [campo(v.en, "")] };
  }
  // contar: número + color + prenda (en plural si hay más de una)
  const minimo = PRENDAS_PAR.has(v.dibujo) ? 2 : 1;
  const n = minimo + Math.floor(Math.random() * (11 - minimo));
  const c = azar(colores.filter((x) => !(SIN_COLOR_PLENO.has(v.dibujo) && x.en === "black"))) || { en: "red", color: "#e53935" };
  const num = palabraNumero(n), prenda = pluralDe(v, n);
  return { ...base, escena: grupoPrendas(v.dibujo, c.color, n), frase: `${num} ${c.en} ${prenda}`,
    campos: [campo(num, "¿Cuántas?"), campo(c.en, "¿Color?"), campo(prenda, "¿Prenda?")] };
}

function casillasHTML(cp, activo) {
  let k = 0;
  return [...cp.respuesta].map((ch) => {
    if (!/[A-ZÑ]/.test(ch)) return `<span class="text-[30px] sm:text-[36px] font-bold self-center">${ch === " " ? "&nbsp;" : esc(ch)}</span>`;
    const i = k++, letra = cp.valor[i], marca = cp.marcas[i];
    const estilo = letra
      ? cp.ok ? "bg-tertiary-fixed border-tertiary-container text-tertiary"
        : marca === "mal" ? "bg-[#ffdad6] border-[#ba1a1a] text-[#ba1a1a] sacudir"
        : marca === "pista" ? "bg-[#fff8e1] border-[#fdd835]" : "bg-white border-[#8b5cf6]"
      : activo && i === cp.valor.length ? "border-dashed border-[#8b5cf6] latido" : "border-dashed border-surface-container-high";
    return `<span class="w-9 h-12 sm:w-12 sm:h-16 rounded-[0.8rem] border-[3px] ${estilo} flex items-center justify-center text-[26px] sm:text-[38px] font-bold">${letra || ""}</span>`;
  }).join("");
}

function camposHTML(ej) {
  return ej.campos.map((cp, i) => `
    <div class="flex items-center justify-center gap-2 flex-wrap ${i === ej.actual || cp.ok ? "" : "opacity-50"}">
      ${cp.etiqueta ? `<span class="w-full sm:w-auto font-label-lg text-label-lg ${i === ej.actual ? "text-[#8b5cf6]" : "text-on-surface-variant"}">${cp.etiqueta}</span>` : ""}
      <span class="flex gap-1 flex-wrap justify-center">${casillasHTML(cp, i === ej.actual)}</span>
      ${cp.ok ? `<span class="text-[28px]">✅</span>` : ""}
    </div>`).join("");
}

function tecladoHTML(ej) {
  return `<div class="mt-space-md">${ej.escena}</div>
    <div id="campos" class="mt-space-md flex flex-col gap-space-sm">${camposHTML(ej)}</div>
    <div id="teclado" class="mt-space-lg grid grid-cols-7 gap-1.5 sm:gap-2 max-w-xl mx-auto" aria-label="Teclado">
      ${LETRAS.map((l) => `<button type="button" data-tecla="${l}" class="btn-tactil h-12 sm:h-14 rounded-[0.9rem] bg-[#ede9fe] text-[#4c1d95] text-[24px] sm:text-[28px] font-bold shadow-[0_3px_0_0_#c4b5fd]">${l}</button>`).join("")}
      <button type="button" data-tecla="borrar" aria-label="Borrar" class="btn-tactil h-12 sm:h-14 rounded-[0.9rem] bg-[#ffdad6] text-[24px] shadow-[0_3px_0_0_#ffb4ab]">⌫</button>
    </div>
    <button id="ayuda" type="button" class="btn-tactil mt-space-md px-6 py-3 rounded-full bg-[#fff8e1] border-2 border-[#fdd835] font-label-lg text-label-lg">💡 Ayuda</button>`;
}

const redibujarCampos = () => { const c = $("#campos"); if (c) c.innerHTML = camposHTML(e.ej); };

async function tecla(t) {
  const ej = e.ej;
  if (e.ocupado || ej?.tipo !== "teclado") return;
  const cp = ej.campos[ej.actual];
  if (!cp) return;
  if (t === "borrar") { cp.valor.pop(); cp.marcas = {}; return redibujarCampos(); }
  if (cp.valor.length >= letrasDe(cp.respuesta).length) return;
  sonido.tap();
  cp.valor.push(t);
  cp.marcas = {};
  redibujarCampos();
  if (cp.valor.length === letrasDe(cp.respuesta).length) await comprobarCampo();
}

function marcarFallada() { if (!e.falladas.includes(e.ej.v.id)) e.falladas.push(e.ej.v.id); }

async function ayudaTeclado() {
  const ej = e.ej, cp = ej?.campos?.[ej.actual];
  if (e.ocupado || !cp) return;
  const correcta = letrasDe(cp.respuesta);
  let bien = 0;
  while (bien < cp.valor.length && cp.valor[bien] === correcta[bien]) bien++;
  cp.valor = cp.valor.slice(0, bien);
  cp.valor.push(correcta[bien]);
  cp.marcas = { [bien]: "pista" };
  marcarFallada();
  sonido.tap();
  redibujarCampos();
  hablarIngles(cp.respuesta.toLowerCase());
  if (cp.valor.length === correcta.length) await comprobarCampo();
}

async function comprobarCampo() {
  const ej = e.ej, cp = ej.campos[ej.actual];
  const correcta = letrasDe(cp.respuesta), escrito = cp.valor.join("");
  if ([correcta.join(""), ...(ACEPTA[correcta.join("")] || [])].includes(escrito)) {
    cp.ok = true;
    ej.actual++;
    redibujarCampos();
    if (ej.actual < ej.campos.length) {
      sonido.exito();
      $("#estado").textContent = "⭐ ¡Muy bien! Ahora la que sigue";
      hablarIngles(cp.respuesta.toLowerCase());
      return;
    }
    return terminarEscritura();
  }
  // algo está mal: marcamos las letras equivocadas y dejamos las buenas
  e.ocupado = true;
  cp.errores++;
  marcarFallada();
  sonido.error();
  let primera = cp.valor.findIndex((l, i) => l !== correcta[i]);
  cp.marcas = Object.fromEntries(cp.valor.map((l, i) => [i, l !== correcta[i] ? "mal" : ""]));
  redibujarCampos();
  const animo = frase(ANIMOS, nombre());
  $("#estado").textContent = `🧡 ${animo} Fijate las letras rojas`;
  await Promise.all([hablar(animo), esperar(900)]);
  cp.valor = cp.valor.slice(0, primera);
  cp.marcas = {};
  if (cp.errores >= 4) {   // se lo mostramos completo para que lo aprenda y seguimos
    cp.valor = [...correcta];
    cp.ok = true;
    ej.revelado = true;
    ej.actual++;
    redibujarCampos();
    $("#estado").innerHTML = `Se escribe <b>${esc(cp.respuesta)}</b> 💜`;
    await hablar("Se escribe así");
    await hablarIngles(cp.respuesta.toLowerCase(), { encolar: true });
    await esperar(1200);
    e.ocupado = false;
    if (ej.actual >= ej.campos.length) return terminarEscritura();
    $("#estado").textContent = "";
    return redibujarCampos();
  }
  if (cp.errores >= 2) {   // una letra de regalo
    cp.valor.push(correcta[cp.valor.length]);
    cp.marcas = { [cp.valor.length - 1]: "pista" };
  }
  redibujarCampos();
  e.ocupado = false;
  if (cp.valor.length === correcta.length) await comprobarCampo();
}

async function terminarEscritura() {
  if (!e.ej.revelado) return acierto();
  e.ocupado = true;   // lo terminó con ayuda: igual la felicitamos, pero cuenta para repasar
  api.registrar("ingles", e.ej.v.id, false, e.nivel).catch(() => {});
  sonido.exito();
  hablar(`¡Muy bien, ${nombre()}! Seguimos practicando.`);
  await celebrar({ tipo: "estrellas", titulo: "¡Lo lograste!", subtitulo: (e.ej.frase || e.ej.v.en).toUpperCase(), duracion: 2200 });
  e.ocupado = false;
  siguiente();
}

// ------------------------------------------------------------------ fin de un paso del camino
const estrellasDe = (fallas) => (fallas === 0 ? 3 : fallas <= 2 ? 2 : 1);

async function pantallaFinPaso() {
  const paso = e.paso, final = paso.id === "final", tema = final ? "final" : e.tema;
  const estrellas = estrellasDe(e.falladas.length);
  const antes = e.repaso ? 1 : await guardarPaso(tema, final ? "prueba" : paso.id, estrellas);
  const primeraVez = !e.repaso && !antes;
  const escribir = paso.grupo === "escribir", lista = escribir ? JUEGOS_ESCRIBIR : PASOS_CAMINO;
  const i = lista.findIndex((p) => p.id === paso.id), sig = final || i < 0 ? null : lista[i + 1];
  const nuevas = FIGURITAS.filter((f) => f.puntos > e.puntosInicio && f.puntos <= e.progreso.puntos);
  const c = CATEGORIAS_INGLES[e.tema] || {};
  const titulo = e.repaso ? "¡Muy bien practicado!" : estrellas === 3 ? "¡Perfecto!" : estrellas === 2 ? "¡Muy bien!" : "¡Lo lograste!";

  $("#app").innerHTML = `
    <section class="text-center bg-white rounded-[2.5rem] shadow-[0_8px_0_0_#ede9fe] p-space-xl max-w-3xl mx-auto">
      <p class="text-[96px] leading-none">${final ? "🏆" : paso.id === "prueba" ? "🏅" : paso.emoji}</p>
      <h1 class="font-headline-xl-mobile text-headline-xl-mobile sm:font-headline-xl sm:text-headline-xl mt-space-sm">${titulo}</h1>
      ${e.repaso ? "" : `<p class="text-[56px] leading-tight mt-1">${"⭐".repeat(estrellas)}<span class="opacity-20">${"⭐".repeat(3 - estrellas)}</span></p>`}
      <p class="font-body-lg text-body-lg text-on-surface-variant mt-1">Acertaste ${e.aciertos} de ${e.sesion.length}</p>
      <p class="inline-block mt-space-md px-6 py-3 rounded-full bg-primary-fixed text-on-primary-fixed font-headline-md text-headline-md">+${e.progreso.puntos - e.puntosInicio} ⭐</p>
      ${nuevas.length ? `<div class="mt-space-lg p-space-md rounded-[2rem] bg-surface-container-low">
        <p class="font-headline-sm text-headline-sm">¡Figurita nueva en el cofre!</p>
        <p class="text-[72px] leading-tight">${nuevas.map((f) => f.emoji).join(" ")}</p></div>` : ""}
      ${e.falladas.length ? `<div class="mt-space-lg p-space-md rounded-[2rem] bg-[#fff8e1]">
        <p class="font-headline-sm text-headline-sm">Para practicar un poquito más:</p>
        <p class="font-body-lg text-body-lg mt-1">${e.falladas.map((id) => e.vocab.find((v) => v.id === id)).filter(Boolean).map((v) => `<b>${esc(v.en)}</b> = ${esc(v.es)}`).join(" · ")}</p>
        <button id="repasar" type="button" class="btn-tactil mt-space-md px-7 py-4 rounded-full bg-[#fdd835] font-headline-sm text-headline-sm shadow-[0_4px_0_0_#c6a700]">🎯 Practicar las que me costaron</button>
      </div>` : ""}
      <div class="flex flex-col sm:flex-row flex-wrap justify-center gap-space-md mt-space-lg">
        ${sig && !e.repaso ? `<button id="seguir" type="button" class="btn-tactil px-7 py-4 rounded-full bg-tertiary-container text-white font-headline-sm text-headline-sm shadow-[0_4px_0_0_#00714d]">${sig.emoji} Siguiente: ${sig.titulo} ➡️</button>` : ""}
        <button id="otra" type="button" class="btn-tactil px-7 py-4 rounded-full bg-[#8b5cf6] text-white font-headline-sm text-headline-sm shadow-[0_4px_0_0_#5b21b6]">🔁 Otra vez</button>
        ${final || escribir ? `<a href="ingles.html" class="btn-tactil px-7 py-4 rounded-full bg-[#ede9fe] text-[#4c1d95] font-headline-sm text-headline-sm shadow-[0_4px_0_0_#c4b5fd]">🏰 Volver al castillo</a>`
          : `<button id="camino" type="button" class="btn-tactil px-7 py-4 rounded-full bg-[#ede9fe] text-[#4c1d95] font-headline-sm text-headline-sm shadow-[0_4px_0_0_#c4b5fd]">🗺️ Volver al camino</button>`}
      </div>
    </section>`;
  const falladas = [...e.falladas];
  $("#seguir")?.addEventListener("click", () => { sonido.tap(); empezar(e.tema, null, sig); });
  $("#otra").addEventListener("click", () => { sonido.tap(); empezar(e.categoria, null, paso); });
  $("#camino")?.addEventListener("click", () => pantallaCamino(e.tema));
  $("#repasar")?.addEventListener("click", () => empezar(e.categoria, falladas));

  // festejos y premios
  if (primeraVez && final) {
    sonido.nivel();
    hablar(g(`¡Felicitaciones, ${nombre()}! ¡Terminaste la prueba final! ¡Estás {lista} para la evaluación de inglés!`));
    await celebrar({ tipo: "confeti", titulo: g(`¡Estás {lista} para la evaluación! 🏆`), subtitulo: "Ropa · Colores · Números", duracion: 5000 });
  } else if (primeraVez && paso.id === "prueba") {
    sonido.nivel();
    hablar(`¡Ganaste la medalla de ${c.titulo}, ${nombre()}!`);
    await celebrar({ tipo: "cohetes", titulo: `¡Medalla de ${c.titulo}! 🏅`, subtitulo: "Ya la podés ver en tu cofre de premios", duracion: 4500 });
  } else if (e.subio) {
    sonido.nivel();
    hablar(`¡Felicitaciones, ${nombre()}! ¡Subiste al nivel ${e.progreso.nivelIngles} de inglés!`);
    await celebrar({ tipo: "confeti", titulo: `¡Subiste al nivel ${e.progreso.nivelIngles}!`, subtitulo: "Se abrieron ejercicios nuevos", duracion: 4000 });
  } else {
    sonido.exito();
    await hablarIngles(`Well done, ${nombre()}!`);
    hablar(sig && !e.repaso ? `¡Muy bien! Ahora podés seguir con: ${sig.titulo}.` : nuevas.length ? "¡Ganaste una figurita nueva!" : "¡Muy bien!", { encolar: true });
  }
  if (e.subio) e.nivel = e.progreso.nivelIngles;
}

iniciar();
