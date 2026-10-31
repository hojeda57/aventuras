import { api } from "../core/api.js";
import { guardiaNina } from "../components/nina-guardia.js";
import { $, $$, esc, toast } from "../core/dom.js";
import { ANIMOS, FIGURITAS, frase, g } from "../core/constantes.js";
import { actualizarBarra, renderBarra } from "../components/nina-barra.js";
import { celebrar } from "../components/celebracion.js";
import { detener, hablar } from "../utils/audio.js";
import { sonido } from "../utils/sonidos.js";

const NIVELES = {
  1: { titulo: "Pensar con dibujos", detalle: "Vocales, ¿cuál no va? y patrones", emoji: "🌱",
       juegos: ["letra-inicial", "no-va", "que-sigue", "buscar-letra"], fondo: "bg-[linear-gradient(160deg,#dcfce7,#86efac)]" },
  2: { titulo: "Detectives", detalle: "Todas las letras y patrones más largos", emoji: "🔎",
       juegos: ["letra-inicial", "buscar-letra", "no-va", "que-sigue"], fondo: "bg-[linear-gradient(160deg,#fef9c3,#fde047)]" },
  3: { titulo: "Grandes pensadores", detalle: "Ordenar letras, rimas y patrones difíciles", emoji: "🦉",
       juegos: ["ordenar", "rima", "que-sigue", "buscar-letra"], fondo: "bg-[linear-gradient(160deg,#e0e7ff,#a5b4fc)]" },
};
const POR_SESION = 6;
const VOCALES = ["A", "E", "I", "O", "U"];
const CONSONANTES = ["M", "P", "S", "L", "T", "C", "B", "R", "G"];
const CATEGORIA = { animales: "animales", frutas: "frutas", comida: "comidas", transporte: "medios de transporte", naturaleza: "cosas de la naturaleza", objetos: "cosas" };
const FIGURAS = ["🔴", "🔵", "🟡", "🟢", "🟣", "⭐", "❤️", "🌙", "🐱", "🐶", "🍎", "🍌"];
const ELOGIOS = ["¡Muy bien pensado, {n}!", "¡Sos {un} {genia}!", "¡Excelente, {n}! ¡Qué cabecita!", "¡Bravo! ¡Lo descubriste!", "¡Perfecto, {n}!"];
const FESTEJOS = ["globos", "cohetes", "estrellas", "confeti"];

const e = { perfil: null, progreso: null, juegos: [], palabras: [], nivel: 1, sesion: [], idx: 0, ej: null,
  intentos: 0, aciertos: 0, puntosInicio: 0, subio: false, ocupado: false };
const nombre = () => e.perfil?.nombre || "";
const azar = (l) => l[Math.floor(Math.random() * l.length)];
const mezclar = (l) => [...l].sort(() => Math.random() - 0.5);
const sinTilde = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace("Ñ", "N");
const inicial = (p) => sinTilde(p.palabra)[0];
const minus = (p) => p.palabra.toLowerCase();

// ------------------------------------------------------------------ inicio
async function iniciar() {
  if (!(await guardiaNina("pensar"))) return;
  try {
    [e.perfil, e.progreso, e.juegos, e.palabras] = await Promise.all([api.perfil(), api.progreso(), api.listar("juegos"), api.listar("palabras")]);
  } catch (err) { toast(`No se pudo conectar: ${err.message}`, "error"); return; }
  renderBarra($("#barra"), { perfil: e.perfil, progreso: e.progreso });
  e.nivel = e.progreso.nivelPensar || 1;
  pantallaElegir();
}

function pantallaElegir() {
  detener();
  const desbloqueado = e.progreso.nivelPensar || 1;
  $("#app").onclick = null;
  $("#app").innerHTML = `
    <h1 class="font-headline-xl-mobile text-headline-xl-mobile sm:font-headline-xl sm:text-headline-xl text-center">🧠 Bosque de los Acertijos</h1>
    <p class="text-center font-body-lg text-body-lg text-on-surface-variant mb-space-lg">¡Juegos para pensar y descubrir!</p>
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-space-lg">
      ${[1, 2, 3].map((n) => {
        const m = NIVELES[n], bloqueado = n > desbloqueado;
        return `<button type="button" data-nivel="${n}" ${bloqueado ? "disabled" : ""}
          class="btn-tactil rounded-[2.5rem] p-space-lg ${m.fondo} shadow-[0_6px_0_0_rgba(0,0,0,0.12)] text-center ${bloqueado ? "opacity-50 grayscale cursor-not-allowed" : "hover:-translate-y-1 transition-transform"}">
          <span class="block text-[80px] leading-none">${bloqueado ? "🔒" : m.emoji}</span>
          <span class="block font-label-lg text-label-lg mt-space-sm">${"⭐".repeat(n)} Nivel ${n}</span>
          <span class="block font-headline-md text-headline-md">${m.titulo}</span>
          <span class="block font-body-md text-body-md">${m.detalle}</span>
          <span class="block text-[28px] mt-2">${m.juegos.map((j) => e.juegos.find((x) => x.id === j)?.emoji || "").join(" ")}</span>
        </button>`;
      }).join("")}
    </div>
    ${desbloqueado < 3 ? `<p class="text-center mt-space-lg font-label-lg text-label-lg text-on-surface-variant">🔒 El nivel siguiente se abre con ${e.progreso.aciertosParaSubir} acertijos resueltos en tu nivel.</p>` : ""}`;
  $$("[data-nivel]").forEach((b) => b.addEventListener("click", () => { e.nivel = Number(b.dataset.nivel); empezar(); }));
}

function empezar() {
  const tipos = NIVELES[e.nivel].juegos;
  const orden = mezclar(tipos).sort((a, b) => (e.juegos.find((x) => x.id === a)?.dominada || 0) - (e.juegos.find((x) => x.id === b)?.dominada || 0));
  e.sesion = Array.from({ length: POR_SESION }, (_, k) => orden[k % orden.length]);
  e.sesion = mezclar(e.sesion);
  Object.assign(e, { idx: 0, aciertos: 0, puntosInicio: e.progreso.puntos, subio: false });
  pantallaJuego();
}

// ------------------------------------------------------------------ armado de cada acertijo
function armar(tipo) {
  const P = e.palabras;
  const n = e.nivel;
  if (tipo === "letra-inicial") {
    const letras = n === 1 ? VOCALES : [...new Set(P.map(inicial))];
    const pool = P.filter((p) => letras.includes(inicial(p)));
    const p = azar(pool), ok = inicial(p);
    const otras = mezclar(letras.filter((l) => l !== ok)).slice(0, n === 1 ? 2 : 3);
    return { tipo, p, ok, opciones: mezclar([ok, ...otras]), voz: `¿Con qué letra empieza ${minus(p)}?` };
  }
  if (tipo === "buscar-letra") {
    const candidatas = (n === 1 ? ["A", "O", "E"] : CONSONANTES).filter((l) => P.filter((p) => inicial(p) === l).length >= 2);
    const letra = azar(candidatas);
    const buenas = mezclar(P.filter((p) => inicial(p) === letra)).slice(0, n === 3 ? 3 : 2);
    const malas = mezclar(P.filter((p) => inicial(p) !== letra)).slice(0, (n === 3 ? 8 : 6) - buenas.length);
    return { tipo, letra, cartas: mezclar([...buenas, ...malas]), buenas: new Set(buenas.map((b) => b.id)),
      voz: `Tocá todos los dibujos que empiezan con la letra ${letra}. Cuando termines, tocá listo.` };
  }
  if (tipo === "no-va") {
    const cats = ["animales", "frutas", "comida", "transporte", "naturaleza"].filter((c) => P.filter((p) => p.categoria === c).length >= 3);
    const cat = azar(cats);
    const parecidas = { frutas: "comida", comida: "frutas" };  // una fruta también es comida: no se mezclan
    const otrasCats = n === 1 ? (cat === "animales" ? ["frutas", "transporte"] : ["animales"])
      : Object.keys(CATEGORIA).filter((c) => c !== cat && c !== parecidas[cat]);
    const intruso = azar(P.filter((p) => otrasCats.includes(p.categoria)));
    const grupo = mezclar(P.filter((p) => p.categoria === cat)).slice(0, 3);
    return { tipo, cat, intruso, cartas: mezclar([...grupo, intruso]), voz: "¿Cuál no va con los demás?" };
  }
  if (tipo === "que-sigue") {
    const figs = mezclar(FIGURAS);
    const molde = n === 1 ? [0, 1] : n === 2 ? azar([[0, 1, 2], [0, 0, 1]]) : azar([[0, 1, 1], [0, 1, 2, 3], [0, 0, 1, 1]]);
    const largo = molde.length * (n === 1 ? 3 : 2) + 1;
    const serie = Array.from({ length: largo }, (_, i) => figs[molde[i % molde.length]]);
    const ok = serie.pop();
    const usados = [...new Set(serie)];
    const opciones = mezclar([ok, ...mezclar([...usados.filter((f) => f !== ok), figs[5]]).slice(0, 2)]);
    return { tipo, serie, ok, opciones, voz: "Mirá bien la fila. ¿Qué dibujo sigue?" };
  }
  if (tipo === "ordenar") {
    const cortas = P.filter((p) => p.palabra.length >= 3 && p.palabra.length <= 5 && sinTilde(p.palabra) === p.palabra && !p.palabra.includes("LL"));
    const p = azar(cortas);
    let fichas;
    do { fichas = mezclar([...p.palabra]); } while (fichas.join("") === p.palabra);
    return { tipo, p, fichas, puestas: 0, voz: `Ordená las letras para escribir ${minus(p)}.` };
  }
  // rima
  const conRima = P.filter((p) => p.rima && P.filter((q) => q.rima === p.rima).length >= 2);
  const p = azar(conRima);
  const ok = azar(P.filter((q) => q.rima === p.rima && q.id !== p.id));
  const malas = mezclar(P.filter((q) => q.rima !== p.rima)).slice(0, 2);
  const opciones = mezclar([ok, ...malas]);
  return { tipo, p, ok, opciones, voz: `¿Qué palabra rima con ${minus(p)}? ¿${opciones.map(minus).join(", ")}?` };
}

// ------------------------------------------------------------------ pantalla
const carta = (p, attrs = "", extra = "") => `<button type="button" ${attrs} class="btn-tactil rounded-[1.5rem] bg-white border-4 border-surface-container-high shadow-[0_5px_0_0_#dee8ff] p-space-sm flex flex-col items-center justify-center min-h-[120px] transition-colors ${extra}">
  <span class="text-[60px] leading-none">${esc(p.emoji)}</span></button>`;

function contenido(ej) {
  switch (ej.tipo) {
    case "letra-inicial": return `
      <div class="text-[130px] leading-none my-space-sm">${esc(ej.p.emoji)}</div>
      <p id="palabra" class="text-[44px] font-bold tracking-widest min-h-[56px]">_ ${esc(ej.p.palabra.slice(1).replace(/./g, "_ "))}</p>
      <div class="flex justify-center gap-space-md mt-space-md">${ej.opciones.map((l) => `<button type="button" data-op="${l}" class="btn-tactil w-24 h-24 rounded-[1.75rem] bg-[#dcfce7] text-[#14532d] text-[56px] font-bold shadow-[0_5px_0_0_#86efac]">${l}</button>`).join("")}</div>`;
    case "buscar-letra": return `
      <div class="inline-flex items-center justify-center w-28 h-28 rounded-[2rem] bg-[#fde047] text-[80px] font-bold shadow-[0_5px_0_0_#ca8a04] mb-space-md">${ej.letra}</div>
      <div class="grid grid-cols-2 sm:grid-cols-${ej.cartas.length > 6 ? 4 : 3} gap-space-sm">${ej.cartas.map((p) => carta(p, `data-carta="${p.id}" aria-pressed="false"`)).join("")}</div>
      <button type="button" id="btnListo" class="btn-tactil mt-space-lg px-10 py-4 rounded-full bg-tertiary text-on-tertiary font-headline-md text-headline-md shadow-[0_5px_0_0_#004e34]">✅ ¡Listo!</button>`;
    case "no-va": return `
      <div class="grid grid-cols-2 gap-space-md max-w-md mx-auto">${ej.cartas.map((p) => carta(p, `data-op="${p.id}"`)).join("")}</div>`;
    case "que-sigue": return `
      <div class="flex flex-wrap justify-center items-center gap-2 p-space-md rounded-[1.75rem] bg-surface-container-low">
        ${ej.serie.map((f) => `<span class="text-[46px] leading-none">${f}</span>`).join("")}
        <span id="hueco" class="w-16 h-16 rounded-[1rem] border-4 border-dashed border-[#8b5cf6] latido flex items-center justify-center text-[40px]">?</span>
      </div>
      <div class="flex justify-center gap-space-md mt-space-lg">${ej.opciones.map((f) => `<button type="button" data-op="${f}" class="btn-tactil w-24 h-24 rounded-[1.75rem] bg-white border-4 border-surface-container-high text-[56px] shadow-[0_5px_0_0_#dee8ff]">${f}</button>`).join("")}</div>`;
    case "ordenar": return `
      <div class="text-[110px] leading-none my-space-sm">${esc(ej.p.emoji)}</div>
      <div id="cajas" class="flex justify-center gap-2 my-space-md">${cajas(ej)}</div>
      <div id="fichas" class="flex justify-center flex-wrap gap-space-sm">${ej.fichas.map((l, i) => `<button type="button" data-ficha="${i}" class="btn-tactil w-20 h-20 rounded-[1.25rem] bg-[#e0e7ff] text-[#312e81] text-[44px] font-bold shadow-[0_4px_0_0_#a5b4fc]">${l}</button>`).join("")}</div>`;
    default: return `
      <div class="inline-flex items-center gap-space-sm px-space-lg py-space-sm rounded-[1.75rem] bg-[#e0e7ff] mb-space-md">
        <span class="text-[70px] leading-none">${esc(ej.p.emoji)}</span><span class="text-[44px] font-bold">${esc(ej.p.palabra)}</span></div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-space-md">${ej.opciones.map((p) => `<button type="button" data-op="${p.id}" class="btn-tactil rounded-[1.5rem] bg-white border-4 border-surface-container-high shadow-[0_5px_0_0_#dee8ff] p-space-sm flex sm:flex-col items-center justify-center gap-2">
        <span class="text-[52px] leading-none">${esc(p.emoji)}</span><span class="text-[28px] font-bold">${esc(p.palabra)}</span></button>`).join("")}</div>`;
  }
}

const cajas = (ej) => [...ej.p.palabra].map((l, i) => i < ej.puestas
  ? `<span class="w-16 h-20 rounded-[1rem] bg-tertiary-fixed flex items-center justify-center text-[44px] font-bold">${l}</span>`
  : `<span class="w-16 h-20 rounded-[1rem] border-4 border-dashed ${i === ej.puestas ? "border-[#6366f1] latido" : "border-surface-container-high"}"></span>`).join("");

function pantallaJuego() {
  const ej = (e.ej = armar(e.sesion[e.idx]));
  e.intentos = 0;
  const info = e.juegos.find((j) => j.id === ej.tipo) || { titulo: "", emoji: "🧠" };
  const titulo = ej.tipo === "buscar-letra" ? `Buscá los que empiezan con ${ej.letra}` : info.titulo;
  const puntos = e.sesion.map((_, i) => `<span class="w-4 h-4 rounded-full ${i < e.idx ? "bg-tertiary-container" : i === e.idx ? "bg-[#16a34a] scale-125" : "bg-white"}"></span>`).join("");
  $("#app").innerHTML = `
    <div class="flex items-center justify-between mb-space-md">
      <a href="pensar.html" class="font-label-lg text-label-lg text-secondary">← Cambiar nivel</a>
      <div class="flex gap-2 items-center" aria-label="Progreso">${puntos}</div>
    </div>
    <article id="caja" class="bg-white rounded-[2.5rem] shadow-[0_8px_0_0_#dee8ff] p-space-lg sm:p-space-xl text-center max-w-3xl mx-auto">
      <div class="flex items-center justify-center gap-space-sm mb-space-md">
        <span class="text-[34px]">${info.emoji}</span>
        <p class="font-headline-md text-headline-md">${esc(titulo)}</p>
        <button id="btnOir" type="button" aria-label="Escuchar" class="shrink-0 w-12 h-12 rounded-full bg-secondary-fixed text-[22px]">🔊</button>
      </div>
      ${contenido(ej)}
      <p id="estado" class="font-headline-sm text-headline-sm min-h-[32px] mt-space-md" aria-live="polite"></p>
    </article>`;
  $("#btnOir").onclick = () => hablar(ej.voz);
  $("#app").onclick = alTocar;
  hablar(ej.voz);
}

// ------------------------------------------------------------------ respuestas
function alTocar(ev) {
  if (e.ocupado) return;
  const ej = e.ej;
  const c = ev.target.closest("[data-carta]");
  if (c) {   // buscar-letra: marcar / desmarcar, y decir el nombre como ayuda
    const marcada = c.getAttribute("aria-pressed") !== "true";
    c.setAttribute("aria-pressed", String(marcada));
    c.classList.toggle("border-[#ca8a04]", marcada); c.classList.toggle("bg-[#fef9c3]", marcada);
    sonido.tap(); hablar(minus(e.palabras.find((p) => p.id === c.dataset.carta)));
    return;
  }
  if (ev.target.closest("#btnListo")) return comprobarBusqueda();
  const f = ev.target.closest("[data-ficha]");
  if (f && !f.disabled) {
    if (f.textContent === ej.p.palabra[ej.puestas]) {
      sonido.tap(); f.disabled = true; f.classList.add("opacity-30");
      ej.puestas++; $("#cajas").innerHTML = cajas(ej);
      if (ej.puestas === ej.p.palabra.length) acierto();
    } else { f.classList.remove("sacudir"); void f.offsetWidth; f.classList.add("sacudir"); fallo(); }
    return;
  }
  const op = ev.target.closest("[data-op]");
  if (!op || op.disabled) return;
  const v = op.dataset.op;
  const correcto = ej.tipo === "letra-inicial" || ej.tipo === "que-sigue" ? v === ej.ok
    : ej.tipo === "no-va" ? v === ej.intruso.id : v === ej.ok.id;
  if (correcto) {
    op.classList.add("bg-tertiary-fixed", "border-tertiary-container");
    if (ej.tipo === "letra-inicial") $("#palabra").innerHTML = `<span class="text-[#16a34a]">${esc(ej.p.palabra[0])}</span>${esc(ej.p.palabra.slice(1))}`;
    if (ej.tipo === "que-sigue") $("#hueco").outerHTML = `<span class="text-[46px] leading-none">${ej.ok}</span>`;
    return acierto();
  }
  op.disabled = true; op.classList.add("opacity-40", "sacudir");
  fallo();
}

function comprobarBusqueda() {
  const ej = e.ej;
  const marcadas = new Set($$("[data-carta][aria-pressed='true']").map((c) => c.dataset.carta));
  const exacto = marcadas.size === ej.buenas.size && [...marcadas].every((id) => ej.buenas.has(id));
  if (exacto) return acierto();
  $$("[data-carta]").forEach((c) => {
    const buena = ej.buenas.has(c.dataset.carta), marcada = marcadas.has(c.dataset.carta);
    if (marcada && !buena) { c.classList.add("sacudir"); c.setAttribute("aria-pressed", "false"); c.classList.remove("border-[#ca8a04]", "bg-[#fef9c3]"); }
  });
  const faltan = [...ej.buenas].filter((id) => !marcadas.has(id)).length;
  const sobran = [...marcadas].filter((id) => !ej.buenas.has(id)).map((id) => e.palabras.find((p) => p.id === id));
  fallo(sobran.length ? `${minus(sobran[0])} empieza con ${inicial(sobran[0])}, no con ${ej.letra}.` : `¡Te ${faltan === 1 ? "falta uno" : `faltan ${faltan}`}! Buscá bien.`);
}

function explicacion(ej) {
  switch (ej.tipo) {
    case "letra-inicial": return `${ej.p.palabra.toLowerCase()} empieza con ${ej.ok}.`;
    case "buscar-letra": return `Empiezan con ${ej.letra}: ${ej.cartas.filter((p) => ej.buenas.has(p.id)).map(minus).join(", ")}.`;
    case "no-va": return `${ej.intruso.palabra.toLowerCase()} no va, porque los demás son ${CATEGORIA[ej.cat]}.`;
    case "que-sigue": return "Mirá cómo se repiten los dibujos.";
    case "ordenar": return `Se escribe ${ej.p.palabra.split("").join(", ")}.`;
    default: return `${minus(ej.p)} rima con ${minus(ej.ok)}: terminan igual.`;
  }
}

async function fallo(mensaje) {
  e.ocupado = true;
  e.intentos++;
  sonido.error();
  const ej = e.ej;
  const max = ej.tipo === "ordenar" ? 3 : 2;
  if (e.intentos >= max) {
    const exp = explicacion(ej);
    // mostrar la respuesta
    if (ej.tipo === "buscar-letra") $$("[data-carta]").forEach((c) => ej.buenas.has(c.dataset.carta) && c.classList.add("bg-tertiary-fixed", "latido"));
    else if (ej.tipo === "ordenar") { ej.puestas = ej.p.palabra.length; $("#cajas").innerHTML = cajas(ej); }
    else $(`[data-op="${ej.tipo === "no-va" ? ej.intruso.id : ej.tipo === "rima" ? ej.ok.id : ej.ok}"]`)?.classList.add("bg-tertiary-fixed", "latido");
    $("#estado").textContent = `💜 ${exp}`;
    await hablar(`${exp} ¡Muy bien por intentarlo, ${nombre()}!`);
    api.registrar("pensar", ej.tipo, false, e.nivel).catch(() => {});
    await new Promise((r) => setTimeout(r, 1000));
    e.ocupado = false;
    return siguiente();
  }
  const animo = mensaje || frase(ANIMOS, nombre());
  $("#estado").textContent = `🧡 ${animo}`;
  await hablar(animo);
  e.ocupado = false;
}

async function acierto() {
  e.ocupado = true;
  const ej = e.ej;
  let res;
  try { res = await api.registrar("pensar", ej.tipo, true, e.nivel); }
  catch (err) { toast(err.message, "error"); e.ocupado = false; return; }
  e.progreso = res.progreso; e.aciertos++; e.subio ||= res.subioNivel;
  actualizarBarra(e.progreso);
  sonido.exito();
  const elogio = frase(ELOGIOS, nombre());
  await Promise.all([
    hablar(`${explicacion(ej)} ${elogio}`),
    celebrar({ tipo: azar(FESTEJOS), titulo: elogio, subtitulo: explicacion(ej), puntos: res.puntosGanados }),
  ]);
  e.ocupado = false;
  siguiente();
}

function siguiente() {
  e.idx++;
  e.idx < e.sesion.length ? pantallaJuego() : pantallaFin();
}

async function pantallaFin() {
  const nuevas = FIGURITAS.filter((f) => f.puntos > e.puntosInicio && f.puntos <= e.progreso.puntos);
  $("#app").onclick = null;
  $("#app").innerHTML = `
    <section class="text-center bg-white rounded-[2.5rem] shadow-[0_8px_0_0_#dee8ff] p-space-xl max-w-3xl mx-auto">
      <p class="text-[96px] leading-none">🦉</p>
      <h1 class="font-headline-xl-mobile text-headline-xl-mobile sm:font-headline-xl sm:text-headline-xl mt-space-sm">¡Qué gran pensadora!</h1>
      <p class="font-body-lg text-body-lg text-on-surface-variant mt-1">Resolviste ${e.aciertos} de ${e.sesion.length} acertijos</p>
      <p class="inline-block mt-space-md px-6 py-3 rounded-full bg-primary-fixed text-on-primary-fixed font-headline-md text-headline-md">+${e.progreso.puntos - e.puntosInicio} ⭐</p>
      ${nuevas.length ? `<div class="mt-space-lg p-space-md rounded-[2rem] bg-surface-container-low">
        <p class="font-headline-sm text-headline-sm">¡Figurita nueva en el cofre!</p>
        <p class="text-[72px] leading-tight">${nuevas.map((f) => f.emoji).join(" ")}</p></div>` : ""}
      <div class="flex flex-col sm:flex-row justify-center gap-space-md mt-space-lg">
        <button id="otra" type="button" class="btn-tactil px-7 py-4 rounded-full bg-[#16a34a] text-white font-headline-sm text-headline-sm shadow-[0_4px_0_0_#14532d]">🔁 Otra vez</button>
        <a href="pensar.html" class="btn-tactil px-7 py-4 rounded-full bg-[#dcfce7] text-[#14532d] font-headline-sm text-headline-sm shadow-[0_4px_0_0_#86efac]">🧠 Elegir nivel</a>
        <a href="index.html" class="btn-tactil px-7 py-4 rounded-full bg-white border-2 border-surface-container-high font-headline-sm text-headline-sm">🏠 Mapa</a>
      </div>
    </section>`;
  $("h1").textContent = g("¡Qué {gran} {pensadora}!");
  $("#otra").addEventListener("click", empezar);
  if (e.subio) {
    sonido.nivel();
    hablar(`¡Felicitaciones, ${nombre()}! ¡Subiste al nivel ${e.progreso.nivelPensar} de los acertijos!`);
    await celebrar({ tipo: "confeti", titulo: `¡Subiste al nivel ${e.progreso.nivelPensar}!`, subtitulo: "Se abrieron acertijos nuevos", duracion: 4500 });
    e.nivel = e.progreso.nivelPensar;
  } else {
    hablar(nuevas.length ? "¡Ganaste una figurita nueva!" : g(`¡Muy bien, ${nombre()}! ¡Sos {un} {genia}!`));
  }
}

iniciar();
