import { api } from "../core/api.js";
import { guardiaNina } from "../components/nina-guardia.js";
import { $, $$, esc, toast } from "../core/dom.js";
import { ANIMOS, CATEGORIAS_INGLES, ELOGIOS_INGLES, FIGURITAS, frase } from "../core/constantes.js";
import { actualizarBarra, renderBarra } from "../components/nina-barra.js";
import { celebrar } from "../components/celebracion.js";
import { detener, hablar, hablarIngles } from "../utils/audio.js";
import { sonido } from "../utils/sonidos.js";
import { dibujoHTML } from "../components/dibujo.js";

const POR_SESION = 6;
const NIVELES_INGLES = {
  1: { titulo: "Escuchar y mirar", emoji: "🎧", tipos: ["escuchar", "ver"], opciones: 3 },
  2: { titulo: "¿Cómo se dice?", emoji: "💬", tipos: ["escuchar", "ver", "traducir"], opciones: 4 },
  3: { titulo: "Completar letras", emoji: "✏️", tipos: ["ver", "traducir", "completar"], opciones: 4 },
};
const FESTEJOS = ["globos", "cohetes", "estrellas", "confeti"];

const e = { perfil: null, progreso: null, vocab: [], nivel: 1, categoria: null, sesion: [], idx: 0, ej: null,
  intentos: 0, aciertos: 0, puntosInicio: 0, subio: false, ocupado: false };
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
  pantallaElegir();
}

function pantallaElegir() {
  detener();
  const desbloqueado = e.progreso.nivelIngles || 1;
  const contar = (cat) => e.vocab.filter((v) => v.categoria === cat).length;
  $("#app").innerHTML = `
    <h1 class="font-headline-xl-mobile text-headline-xl-mobile sm:font-headline-xl sm:text-headline-xl text-center">🏰 Castillo del Inglés</h1>
    <p class="text-center font-body-lg text-body-lg text-on-surface-variant mb-space-lg">Let's play! ¿Qué querés aprender hoy?</p>

    <div class="flex justify-center gap-space-sm mb-space-lg flex-wrap" role="group" aria-label="Nivel">
      ${[1, 2, 3].map((n) => {
        const bloqueado = n > desbloqueado, m = NIVELES_INGLES[n];
        return `<button type="button" data-nivel="${n}" ${bloqueado ? "disabled" : ""} aria-pressed="${e.nivel === n}"
          class="btn-tactil px-5 py-3 rounded-full font-label-lg text-label-lg shadow-[0_4px_0_0_rgba(0,0,0,0.1)]
          ${e.nivel === n ? "bg-[#8b5cf6] text-white" : "bg-white"} ${bloqueado ? "opacity-50 cursor-not-allowed" : ""}">
          ${bloqueado ? "🔒" : m.emoji} Nivel ${n}: ${m.titulo}</button>`;
      }).join("")}
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-space-md">
      ${Object.entries(CATEGORIAS_INGLES).filter(([k]) => contar(k)).map(([k, c]) => `
        <button type="button" data-cat="${k}" class="btn-tactil rounded-[2rem] p-space-md ${c.fondo} shadow-[0_6px_0_0_rgba(0,0,0,0.12)] text-center hover:-translate-y-1 transition-transform">
          <span class="block text-[64px] leading-none">${c.emoji}</span>
          <span class="block font-headline-sm text-headline-sm mt-2">${c.titulo}</span>
          <span class="block font-label-md text-label-md opacity-80">${c.en}</span>
        </button>`).join("")}
      <button type="button" data-cat="mezcla" class="btn-tactil rounded-[2rem] p-space-md bg-white shadow-[0_6px_0_0_rgba(0,0,0,0.08)] text-center hover:-translate-y-1 transition-transform">
        <span class="block text-[64px] leading-none">🎲</span>
        <span class="block font-headline-sm text-headline-sm mt-2">Todo mezclado</span>
        <span class="block font-label-md text-label-md opacity-80">Mix</span>
      </button>
    </div>
    ${desbloqueado < 3 ? `<p class="text-center mt-space-lg font-label-lg text-label-lg text-on-surface-variant">🔒 El nivel siguiente se abre con ${e.progreso.aciertosParaSubir} respuestas correctas en tu nivel.</p>` : ""}`;

  $$("[data-nivel]").forEach((b) => b.addEventListener("click", () => { sonido.tap(); e.nivel = Number(b.dataset.nivel); pantallaElegir(); }));
  $$("[data-cat]").forEach((b) => b.addEventListener("click", () => empezar(b.dataset.cat)));
}

async function empezar(categoria) {
  try { e.vocab = await api.listar("ingles"); } catch (err) { toast(err.message, "error"); return; }
  e.categoria = categoria;
  const pool = e.vocab.filter((v) => categoria === "mezcla" || v.categoria === categoria)
    .sort((a, b) => (a.dominada || 0) - (b.dominada || 0) || Math.random() - 0.5);
  if (!pool.length) { toast("Todavía no hay palabras en este tema.", "error"); return; }
  Object.assign(e, { sesion: pool.slice(0, POR_SESION), idx: 0, aciertos: 0, puntosInicio: e.progreso.puntos, subio: false });
  pantallaJuego();
}

// ------------------------------------------------------------------ armado de ejercicios
function visual(v, grande = true) {
  if (v.categoria === "numeros") {
    return `<span class="block font-bold leading-none text-secondary ${grande ? "text-[110px]" : "text-[64px]"}">${v.orden}</span>
      ${grande ? `<span class="block text-[26px] mt-1">${"⭐".repeat(v.orden)}</span>` : ""}`;
  }
  if (v.color) {
    const t = grande ? 150 : 84;
    return `<span class="inline-block rounded-full shadow-md ring-4 ring-white" style="background:${esc(v.color)};width:${t}px;height:${t}px${v.color.toLowerCase() === "#ffffff" ? ";outline:2px solid #d8e3fb" : ""}"></span>`;
  }
  return dibujoHTML(v, { clases: grande ? "text-[130px]" : "text-[72px]", tamImg: grande ? "w-48 h-48" : "w-24 h-24" });
}

function distractores(v, n) {
  const mismos = e.vocab.filter((x) => x.categoria === v.categoria && x.id !== v.id);
  const otros = e.vocab.filter((x) => x.categoria !== v.categoria);
  return [...mezclar(mismos), ...mezclar(otros)].slice(0, n);
}

function armarEjercicio(v) {
  const cfg = NIVELES_INGLES[e.nivel];
  let tipos = [...cfg.tipos];
  if (v.categoria === "dias") {
    tipos = tipos.map((t) => (t === "ver" ? "traducir" : t));   // un color no alcanza para reconocer un día
    if (e.nivel >= 2) tipos.push("despues", "despues");
  }
  const tipo = azar(tipos);
  if (tipo === "completar") return { tipo, v, ...armarCompletar(v) };
  if (tipo === "despues") return armarDespues(v, cfg.opciones);
  return { tipo, v, opciones: mezclar([v, ...distractores(v, cfg.opciones - 1)]) };
}

function armarCompletar(v) {
  const letras = [...v.en];
  const candidatas = letras.map((c, i) => (i > 0 && /[a-z]/i.test(c) ? i : -1)).filter((i) => i >= 0);
  const cantidad = Math.min(3, Math.max(1, Math.round(candidatas.length / 3)));
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
  if (tipo === "ver") return { texto: "¿Cómo se dice en inglés?", voz: () => hablar("¿Cómo se dice en inglés?") };
  if (tipo === "traducir") return { texto: `¿Cómo se dice <b class="text-[#8b5cf6]">“${esc(v.es)}”</b> en inglés?`, voz: () => hablar(`¿Cómo se dice ${v.es} en inglés?`) };
  if (tipo === "completar") return { texto: "✏️ Completá la palabra", voz: () => hablarIngles(v.en) };
  const txt = ej.despues ? "¿Qué día viene después de" : "¿Qué día viene antes de";
  return { texto: `${txt} <b class="text-[#8b5cf6]">${esc(ej.ref.en)}</b>?`,
    voz: async () => { await hablar(txt); await hablarIngles(ej.ref.en, { encolar: true }); } };
}

function opcionesHTML(ej) {
  const ilustradas = ej.tipo === "escuchar" && ej.v.categoria !== "dias";
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
  const muestraVisual = ["ver", "traducir", "completar"].includes(ej.tipo) && !(ej.v.categoria === "dias" && ej.tipo !== "completar");
  const puntos = e.sesion.map((_, i) => `<span class="w-4 h-4 rounded-full ${i < e.idx ? "bg-tertiary-container" : i === e.idx ? "bg-[#8b5cf6] scale-125" : "bg-white"}"></span>`).join("");

  $("#app").innerHTML = `
    <div class="flex items-center justify-between mb-space-md">
      <a href="ingles.html" class="font-label-lg text-label-lg text-secondary">← Cambiar tema</a>
      <div class="flex gap-2 items-center" aria-label="Progreso">${puntos}</div>
    </div>
    <article id="tarjeta" class="bg-white rounded-[2.5rem] shadow-[0_8px_0_0_#ede9fe] p-space-lg sm:p-space-xl text-center max-w-3xl mx-auto">
      <div class="flex items-center justify-center gap-space-sm flex-wrap">
        <p class="font-headline-md text-headline-md">${c.texto}</p>
        <button id="btnOir" type="button" aria-label="Escuchar" class="btn-tactil w-14 h-14 rounded-full bg-[#ede9fe] text-[26px] shadow-[0_3px_0_0_#c4b5fd]">🔊</button>
      </div>
      ${ej.tipo === "escuchar" ? `<button id="btnOirGrande" type="button" class="btn-tactil mt-space-md px-8 py-4 rounded-full bg-[#8b5cf6] text-white font-headline-sm text-headline-sm shadow-[0_5px_0_0_#5b21b6]">🎧 Escuchar otra vez</button>` : ""}
      ${muestraVisual ? `<div class="mt-space-md">${visual(ej.v)}</div>` : ""}
      ${ej.tipo === "completar" ? completarHTML(ej) : opcionesHTML(ej)}
      <p id="estado" class="font-headline-sm text-headline-sm min-h-[32px] mt-space-md" aria-live="polite"></p>
    </article>`;

  $("#btnOir").addEventListener("click", () => { sonido.tap(); c.voz(); });
  $("#btnOirGrande")?.addEventListener("click", () => { sonido.tap(); hablarIngles(ej.v.en); });
  $("#tarjeta").addEventListener("click", alTocar);
  setTimeout(c.voz, 300);
}

// ------------------------------------------------------------------ respuestas
async function alTocar(ev) {
  if (e.ocupado) return;
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
  const v = e.ej.v;
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
    await hablarIngles(v.en);
    await hablarIngles(`${elogio}, ${nombre()}!`, { encolar: true, lento: false });
    await hablar("¡Muy bien!", { encolar: true });
  })();
  await Promise.all([voz, celebrar({ tipo: azar(FESTEJOS), titulo: `${elogio}, ${nombre()}!`, subtitulo: `${v.en} = ${v.es}`, puntos: res.puntosGanados })]);
  e.ocupado = false;
  siguiente();
}

function siguiente() {
  e.idx++;
  e.idx < e.sesion.length ? pantallaJuego() : pantallaFin();
}

async function pantallaFin() {
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
      <div class="flex flex-col sm:flex-row justify-center gap-space-md mt-space-lg">
        <button id="otra" type="button" class="btn-tactil px-7 py-4 rounded-full bg-[#8b5cf6] text-white font-headline-sm text-headline-sm shadow-[0_4px_0_0_#5b21b6]">🔁 Otra vez</button>
        <a href="ingles.html" class="btn-tactil px-7 py-4 rounded-full bg-[#ede9fe] text-[#4c1d95] font-headline-sm text-headline-sm shadow-[0_4px_0_0_#c4b5fd]">🎨 Otro tema</a>
        <a href="index.html" class="btn-tactil px-7 py-4 rounded-full bg-white border-2 border-surface-container-high font-headline-sm text-headline-sm">🏠 Mapa</a>
      </div>
    </section>`;
  $("#otra").addEventListener("click", () => empezar(e.categoria));
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

iniciar();
