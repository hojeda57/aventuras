import { api } from "../core/api.js";
import { guardiaNina } from "../components/nina-guardia.js";
import { $, $$, esc, toast } from "../core/dom.js";
import { ANIMOS_MATE, FIGURITAS, frase, g } from "../core/constantes.js";
import { actualizarBarra, renderBarra } from "../components/nina-barra.js";
import { celebrar } from "../components/celebracion.js";
import { detener, hablar } from "../utils/audio.js";
import { sonido } from "../utils/sonidos.js";

const NIVELES = {
  1: { titulo: "Grupos iguales", detalle: "Tablas del 1, 2, 5 y 10", emoji: "🧺", tablas: [1, 2, 5, 10], maxA: 5,
       fondo: "bg-[linear-gradient(160deg,#ffe0f0,#f9a8d4)]" },
  2: { titulo: "Tarjetas mágicas", detalle: "Tablas del 2 al 5 y el 10", emoji: "🃏", tablas: [2, 3, 4, 5, 10], maxA: 10,
       fondo: "bg-[linear-gradient(160deg,#ede9fe,#c4b5fd)]" },
  3: { titulo: "Desafío de las tablas", detalle: "Todas las tablas y problemas", emoji: "🏆", tablas: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], maxA: 10,
       fondo: "bg-[linear-gradient(160deg,#ffddb8,#ffb95f)]" },
};
const POR_SESION = 6;
const ELOGIOS = ["¡Muy bien, {n}! ¡Es correcto!", "¡Sos {un} {genia} de las tablas!", "¡Excelente, {n}!", "¡Bravo! ¡Lo sabías!", "¡Perfecto, {n}!"];
const FESTEJOS = ["globos", "cohetes", "estrellas", "confeti"];
const PROBLEMAS = [
  (a, b) => `Hay ${a} cajas con ${b} lápices cada una. ¿Cuántos lápices hay en total?`,
  (a, b) => `${a} amigas tienen ${b} figuritas cada una. ¿Cuántas figuritas tienen entre todas?`,
  (a, b) => `En el jardín hay ${a} macetas con ${b} flores cada una. ¿Cuántas flores hay?`,
  (a, b) => `Mamá compró ${a} paquetes con ${b} galletitas cada uno. ¿Cuántas galletitas son?`,
];

const e = { perfil: null, progreso: null, tablas: [], nivel: 1, sesion: [], idx: 0, ej: null, intentos: 0,
  aciertos: 0, respuesta: "", puntosInicio: 0, subio: false, ocupado: false, contado: 0 };
const nombre = () => e.perfil?.nombre || "";
const azar = (l) => l[Math.floor(Math.random() * l.length)];
const mezclar = (l) => [...l].sort(() => Math.random() - 0.5);
const entre = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const tabla = (n) => e.tablas.find((t) => t.tabla === n) || { tabla: n, emoji: "⭐", color: "#8b5cf6", id: `t${n}` };

// ------------------------------------------------------------------ inicio
async function iniciar() {
  if (!(await guardiaNina("multi"))) return;
  try { [e.perfil, e.progreso, e.tablas] = await Promise.all([api.perfil(), api.progreso(), api.listar("tablas")]); }
  catch (err) { toast(`No se pudo conectar: ${err.message}`, "error"); return; }
  renderBarra($("#barra"), { perfil: e.perfil, progreso: e.progreso });
  e.nivel = e.progreso.nivelMulti || 1;
  pantallaElegir();
}

function pantallaElegir() {
  detener();
  const desbloqueado = e.progreso.nivelMulti || 1;
  $("#app").innerHTML = `
    <h1 class="font-headline-xl-mobile text-headline-xl-mobile sm:font-headline-xl sm:text-headline-xl text-center">🗼 Torre de las Tablas</h1>
    <p class="text-center font-body-lg text-body-lg text-on-surface-variant mb-space-lg">¡Aprendé a multiplicar jugando!</p>
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-space-lg">
      ${[1, 2, 3].map((n) => {
        const m = NIVELES[n], bloqueado = n > desbloqueado;
        return `<button type="button" data-nivel="${n}" ${bloqueado ? "disabled" : ""}
          class="btn-tactil rounded-[2.5rem] p-space-lg ${m.fondo} shadow-[0_6px_0_0_rgba(0,0,0,0.12)] text-center ${bloqueado ? "opacity-50 grayscale cursor-not-allowed" : "hover:-translate-y-1 transition-transform"}">
          <span class="block text-[80px] leading-none">${bloqueado ? "🔒" : m.emoji}</span>
          <span class="block font-label-lg text-label-lg mt-space-sm">${"⭐".repeat(n)} Nivel ${n}</span>
          <span class="block font-headline-md text-headline-md">${m.titulo}</span>
          <span class="block font-body-md text-body-md">${m.detalle}</span>
        </button>`;
      }).join("")}
    </div>
    <button type="button" id="btnEstudiar" class="btn-tactil mt-space-lg w-full rounded-[2rem] p-space-md bg-white shadow-[0_6px_0_0_#dee8ff] flex items-center justify-center gap-space-sm">
      <span class="text-[48px] leading-none">📚</span>
      <span class="text-left"><span class="block font-headline-md text-headline-md">Tarjetas para estudiar</span>
      <span class="block font-body-md text-body-md text-on-surface-variant">Mirá cada tabla y dá vuelta las tarjetas</span></span>
    </button>
    ${desbloqueado < 3 ? `<p class="text-center mt-space-lg font-label-lg text-label-lg text-on-surface-variant">🔒 El nivel siguiente se abre con ${e.progreso.aciertosParaSubir} respuestas correctas en tu nivel.</p>` : ""}`;
  $$("[data-nivel]").forEach((b) => b.addEventListener("click", () => { e.nivel = Number(b.dataset.nivel); empezar(); }));
  $("#btnEstudiar").addEventListener("click", () => { sonido.tap(); pantallaEstudiar(); });
}

// ------------------------------------------------------------------ modo estudio (sin puntos)
function pantallaEstudiar(n = null) {
  detener();
  const activas = e.tablas.filter((t) => t.activo !== false).sort((a, b) => a.tabla - b.tabla);
  if (!n) {
    $("#app").innerHTML = `
      <div class="flex items-center justify-between mb-space-md"><button id="volver" class="font-label-lg text-label-lg text-secondary">← Volver</button></div>
      <h1 class="font-headline-lg-mobile text-headline-lg-mobile sm:font-headline-lg sm:text-headline-lg text-center mb-space-lg">📚 ¿Qué tabla querés mirar?</h1>
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-space-md">
        ${activas.map((t) => `<button type="button" data-tabla="${t.tabla}" class="btn-tactil aspect-square rounded-[2rem] shadow-[0_5px_0_0_rgba(0,0,0,0.1)] flex flex-col items-center justify-center text-white" style="background:${esc(t.color)}">
          <span class="text-[44px] leading-none">${esc(t.emoji)}</span><span class="font-label-lg text-label-lg mt-1">Tabla del</span>
          <span class="text-[48px] font-bold leading-none">${t.tabla}</span></button>`).join("")}
      </div>`;
    $("#volver").onclick = pantallaElegir;
    $$("[data-tabla]").forEach((b) => b.addEventListener("click", () => { sonido.tap(); pantallaEstudiar(Number(b.dataset.tabla)); }));
    return;
  }
  const t = tabla(n);
  let i = 1;
  const dibujar = () => {
    $("#app").innerHTML = `
      <div class="flex items-center justify-between mb-space-md">
        <button id="volver" class="font-label-lg text-label-lg text-secondary">← Otras tablas</button>
        <span class="font-label-lg text-label-lg">${i} de 10</span>
      </div>
      <h1 class="font-headline-md text-headline-md text-center mb-space-md">${esc(t.emoji)} Tabla del ${n}</h1>
      <button type="button" id="tarjeta" class="tarjeta-flip block mx-auto w-full max-w-md h-72" aria-label="Dar vuelta la tarjeta">
        <div class="cara-interna">
          <div class="cara text-white shadow-[0_8px_0_0_rgba(0,0,0,0.15)]" style="background:${esc(t.color)}">
            <span class="text-[88px] font-bold leading-none">${i} × ${n}</span>
            <span class="font-label-lg text-label-lg mt-space-md opacity-90">👆 Tocá para ver el resultado</span>
          </div>
          <div class="cara cara-atras bg-white border-8 shadow-[0_8px_0_0_#dee8ff]" style="border-color:${esc(t.color)}">
            <span class="text-[40px] font-bold text-on-surface-variant leading-none">${i} × ${n} =</span>
            <span class="text-[100px] font-bold leading-none" style="color:${esc(t.color)}">${i * n}</span>
            <span class="text-[22px] mt-2 px-4 text-center leading-snug">${esc(t.emoji).repeat(Math.min(i * n, 20))}${i * n > 20 ? "…" : ""}</span>
          </div>
        </div>
      </button>
      <div class="flex justify-center gap-space-md mt-space-lg">
        <button id="ant" ${i === 1 ? "disabled" : ""} class="btn-tactil w-20 h-20 rounded-full bg-white shadow-[0_4px_0_0_#dee8ff] text-[36px] disabled:opacity-30" aria-label="Anterior">⬅️</button>
        <button id="oir" class="btn-tactil px-7 h-20 rounded-full bg-secondary-fixed text-on-secondary-fixed font-headline-sm text-headline-sm shadow-[0_4px_0_0_#89ceff]">🔊 Escuchar</button>
        <button id="sig" ${i === 10 ? "disabled" : ""} class="btn-tactil w-20 h-20 rounded-full bg-white shadow-[0_4px_0_0_#dee8ff] text-[36px] disabled:opacity-30" aria-label="Siguiente">➡️</button>
      </div>
      <div class="mt-space-lg flex flex-wrap justify-center gap-2">
        ${Array.from({ length: 10 }, (_, k) => `<span class="px-3 py-1 rounded-full font-label-md text-label-md ${k + 1 === i ? "text-white" : "bg-white"}" ${k + 1 === i ? `style="background:${esc(t.color)}"` : ""}>${k + 1}×${n}=${(k + 1) * n}</span>`).join("")}
      </div>`;
    $("#volver").onclick = () => pantallaEstudiar();
    $("#tarjeta").onclick = () => {
      const c = $("#tarjeta"); c.classList.toggle("dada-vuelta"); sonido.pagina();
      if (c.classList.contains("dada-vuelta")) hablar(`${i} por ${n}, ${i * n}`);
    };
    $("#oir").onclick = () => hablar(`${i} por ${n}, es igual a ${i * n}`);
    $("#ant").onclick = () => { i--; dibujar(); };
    $("#sig").onclick = () => { i++; dibujar(); };
  };
  dibujar();
}

// ------------------------------------------------------------------ juego
function empezar() {
  const cfg = NIVELES[e.nivel];
  const disponibles = e.tablas.filter((t) => t.activo !== false && cfg.tablas.includes(t.tabla))
    .sort((a, b) => (a.dominada || 0) - (b.dominada || 0) || Math.random() - 0.5);
  if (!disponibles.length) { toast("No hay tablas activas para este nivel (Zona de papás → Tablas).", "error"); return; }
  e.sesion = Array.from({ length: POR_SESION }, (_, k) => armar(disponibles[k % disponibles.length]));
  Object.assign(e, { idx: 0, aciertos: 0, puntosInicio: e.progreso.puntos, subio: false });
  pantallaJuego();
}

function armar(t) {
  const cfg = NIVELES[e.nivel];
  const a = entre(1, cfg.maxA), b = t.tabla, res = a * b;
  if (e.nivel === 1) return { tipo: "grupos", t, a, b, res };
  if (e.nivel === 2) {
    const op = new Set([res]);
    for (const x of mezclar([res + b, res - b, a * (b + 1), res + 1, res + 2])) { if (op.size === 3) break; if (x > 0) op.add(x); }
    return { tipo: "tarjeta", t, a, b, res, opciones: mezclar([...op]) };
  }
  const tipo = azar(["cuenta", "cuenta", "falta", "problema"]);
  if (tipo === "falta") return { tipo, t, a, b, res, respuesta: a };
  if (tipo === "problema") return { tipo, t, a, b, res, texto: azar(PROBLEMAS)(a, b) };
  return { tipo, t, a, b, res };
}

const correcta = (ej) => (ej.tipo === "falta" ? ej.respuesta : ej.res);

function pregunta(ej) {
  if (ej.tipo === "grupos") return `Hay ${ej.a} ${ej.a === 1 ? "grupo" : "grupos"} de ${ej.b}. ¿Cuántos hay en total?`;
  if (ej.tipo === "falta") return `¿Qué número por ${ej.b} da ${ej.res}?`;
  if (ej.tipo === "problema") return ej.texto;
  return `¿Cuánto es ${ej.a} por ${ej.b}?`;
}

function gruposHTML(ej) {
  return `<div id="grupos" class="flex flex-wrap justify-center gap-space-sm">
    ${Array.from({ length: ej.a }, (_, k) => `<button type="button" data-grupo="${k}" class="grupo btn-tactil rounded-[1.25rem] bg-surface-container-low p-3 max-w-[230px] flex flex-wrap justify-center gap-1 text-[36px] leading-none">${esc(ej.t.emoji).repeat(ej.b)}</button>`).join("")}
  </div>`;
}

function tecladoHTML() {
  return `<div class="bg-white rounded-[2.5rem] shadow-[0_8px_0_0_#dee8ff] p-space-lg">
    <div id="respuesta" class="h-24 rounded-[1.5rem] bg-surface-container-low flex items-center justify-center text-[64px] font-bold text-secondary mb-space-md" aria-live="polite">?</div>
    <div id="teclado" class="grid grid-cols-3 gap-space-sm">
      ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button type="button" data-num="${n}" class="btn-tactil h-20 rounded-[1.5rem] bg-secondary-fixed text-on-secondary-fixed text-[40px] font-bold shadow-[0_4px_0_0_#89ceff]">${n}</button>`).join("")}
      <button type="button" data-borrar aria-label="Borrar" class="btn-tactil h-20 rounded-[1.5rem] bg-surface-container text-[32px] shadow-[0_4px_0_0_#d8e3fb]">⌫</button>
      <button type="button" data-num="0" class="btn-tactil h-20 rounded-[1.5rem] bg-secondary-fixed text-on-secondary-fixed text-[40px] font-bold shadow-[0_4px_0_0_#89ceff]">0</button>
      <button type="button" data-ok aria-label="Listo" class="btn-tactil h-20 rounded-[1.5rem] bg-tertiary text-on-tertiary text-[36px] shadow-[0_4px_0_0_#004e34]">✔</button>
    </div></div>`;
}

function pantallaJuego() {
  const ej = (e.ej = e.sesion[e.idx]);
  e.intentos = 0; e.respuesta = ""; e.contado = 0;
  const puntos = e.sesion.map((_, i) => `<span class="w-4 h-4 rounded-full ${i < e.idx ? "bg-tertiary-container" : i === e.idx ? "bg-[#ec4899] scale-125" : "bg-white"}"></span>`).join("");
  const cuenta = ej.tipo === "falta" ? `? × ${ej.b} = ${ej.res}` : `${ej.a} × ${ej.b} = ?`;
  let centro;
  if (ej.tipo === "grupos") {
    centro = `${gruposHTML(ej)}<p class="text-[44px] font-bold tracking-wide mt-space-md">${cuenta}</p>
      <p id="estado" class="font-headline-sm text-headline-sm min-h-[32px] mt-space-sm" aria-live="polite">👆 Tocá cada grupo para contar</p>`;
  } else if (ej.tipo === "tarjeta") {
    centro = `<div id="tarjeta" class="tarjeta-flip mx-auto w-full max-w-sm h-56">
        <div class="cara-interna">
          <div class="cara text-white shadow-[0_8px_0_0_rgba(0,0,0,0.15)]" style="background:${esc(ej.t.color)}">
            <span class="text-[40px] leading-none">${esc(ej.t.emoji)}</span><span class="text-[84px] font-bold leading-none">${ej.a} × ${ej.b}</span></div>
          <div class="cara cara-atras bg-white border-8" style="border-color:${esc(ej.t.color)}">
            <span class="text-[36px] font-bold text-on-surface-variant">${ej.a} × ${ej.b} =</span>
            <span class="text-[96px] font-bold leading-none" style="color:${esc(ej.t.color)}">${ej.res}</span></div>
        </div></div>
      <div id="opciones" class="flex justify-center gap-space-md mt-space-lg">
        ${ej.opciones.map((o) => `<button type="button" data-op="${o}" class="btn-tactil w-24 h-24 rounded-[1.75rem] bg-white border-4 border-surface-container-high text-[44px] font-bold shadow-[0_5px_0_0_#dee8ff]">${o}</button>`).join("")}
      </div>
      <p id="estado" class="font-headline-sm text-headline-sm min-h-[32px] mt-space-md" aria-live="polite"></p>`;
  } else {
    centro = `<p class="text-[64px] sm:text-[80px] font-bold tracking-wide my-space-md" style="color:${esc(ej.t.color)}">${cuenta}</p>
      <div id="pista" class="min-h-[40px]"></div>
      <p id="estado" class="font-headline-sm text-headline-sm min-h-[32px] mt-space-sm" aria-live="polite"></p>`;
  }
  const conTeclado = ej.tipo !== "tarjeta";
  $("#app").innerHTML = `
    <div class="flex items-center justify-between mb-space-md">
      <a href="multi.html" class="font-label-lg text-label-lg text-secondary">← Cambiar nivel</a>
      <div class="flex gap-2 items-center" aria-label="Progreso">${puntos}</div>
    </div>
    <div class="grid grid-cols-1 ${conTeclado ? "lg:grid-cols-5" : ""} gap-space-lg items-start">
      <article id="caja" class="${conTeclado ? "lg:col-span-3" : "max-w-2xl mx-auto w-full"} bg-white rounded-[2.5rem] shadow-[0_8px_0_0_#dee8ff] p-space-lg text-center">
        <div class="flex items-start justify-center gap-space-sm mb-space-md">
          <p class="font-headline-md text-headline-md leading-snug">${esc(pregunta(ej))}</p>
          <button id="btnRepetir" type="button" aria-label="Escuchar la pregunta" class="shrink-0 w-12 h-12 rounded-full bg-secondary-fixed text-[22px]">🔊</button>
        </div>
        ${centro}
      </article>
      ${conTeclado ? `<div class="lg:col-span-2">${tecladoHTML()}</div>` : ""}
    </div>`;
  $("#btnRepetir").onclick = () => hablar(pregunta(ej));
  $("#app").onclick = alTocar;
  hablar(pregunta(ej));
}

// ------------------------------------------------------------------ interacción
function alTocar(ev) {
  if (e.ocupado) return;
  const ej = e.ej;
  const grupo = ev.target.closest("[data-grupo]");
  if (grupo && !grupo.classList.contains("grupo-contado")) {
    e.contado += ej.b;
    grupo.dataset.total = e.contado;
    grupo.classList.add("grupo-contado");
    sonido.tap(); hablar(String(e.contado));
    return;
  }
  const op = ev.target.closest("[data-op]");
  if (op && !op.disabled) {
    if (Number(op.dataset.op) === ej.res) { op.classList.add("bg-tertiary-fixed", "border-tertiary-container"); $("#tarjeta").classList.add("dada-vuelta"); return acierto(); }
    op.disabled = true; op.classList.add("opacity-40", "sacudir");
    return fallo();
  }
  const b = ev.target.closest("#teclado button");
  if (!b) return;
  sonido.tap();
  if (b.dataset.num !== undefined && e.respuesta.length < 3) e.respuesta = (e.respuesta + b.dataset.num).replace(/^0(?=\d)/, "");
  if (b.hasAttribute("data-borrar")) e.respuesta = e.respuesta.slice(0, -1);
  $("#respuesta").textContent = e.respuesta || "?";
  if (b.hasAttribute("data-ok") && e.respuesta) Number(e.respuesta) === correcta(ej) ? acierto() : fallo();
}

/** Pista: suma repetida (4 + 4 + 4 = 12) y conteo de a saltos en voz alta. */
async function pista(ej) {
  const saltos = Array.from({ length: ej.a }, (_, k) => (k + 1) * ej.b);
  const html = `<div class="inline-flex flex-wrap justify-center gap-2 px-4 py-2 rounded-[1.25rem] bg-surface-container-low text-[26px] font-bold">
    ${Array.from({ length: ej.a }, () => ej.b).join(" + ")}</div>`;
  if (ej.tipo === "grupos") {
    $$(".grupo").forEach((gr, k) => { gr.classList.add("grupo-contado"); gr.dataset.total = saltos[k]; });
  } else if ($("#pista")) $("#pista").innerHTML = html;
  $("#estado").textContent = g("👀 Contemos {juntas} de a saltos…");
  for (const s of saltos) await hablar(String(s), { encolar: true });
  $("#estado").textContent = "Ahora escribí el resultado";
}

async function fallo() {
  e.ocupado = true;
  e.intentos++;
  sonido.error();
  $("#caja").classList.remove("sacudir"); void $("#caja").offsetWidth; $("#caja").classList.add("sacudir");
  const ej = e.ej;
  const max = ej.tipo === "tarjeta" ? 2 : 3;
  if (e.intentos >= max) {
    const r = correcta(ej);
    if ($("#respuesta")) $("#respuesta").textContent = r;
    if (ej.tipo === "tarjeta") { $("#tarjeta").classList.add("dada-vuelta"); $(`[data-op="${r}"]`)?.classList.add("latido", "bg-tertiary-fixed"); }
    $("#estado").textContent = `${ej.a} × ${ej.b} = ${ej.res}. ¡La próxima te sale! 💪`;
    await hablar(`${ej.a} por ${ej.b} es ${ej.res}. ¡Muy bien por intentarlo, ${nombre()}!`);
    api.registrar("multi", ej.t.id, false, e.nivel).catch(() => {});
    await new Promise((res) => setTimeout(res, 900));
    e.ocupado = false;
    return siguiente();
  }
  const animo = frase(ANIMOS_MATE, nombre());
  $("#estado").textContent = `🧡 ${animo}`;
  await hablar(animo);
  if (e.intentos === 2 || ej.tipo === "tarjeta") await pista(ej);
  e.respuesta = "";
  if ($("#respuesta")) $("#respuesta").textContent = "?";
  e.ocupado = false;
}

async function acierto() {
  e.ocupado = true;
  const ej = e.ej;
  let res;
  try { res = await api.registrar("multi", ej.t.id, true, e.nivel); }
  catch (err) { toast(err.message, "error"); e.ocupado = false; return; }
  e.progreso = res.progreso; e.aciertos++; e.subio ||= res.subioNivel;
  actualizarBarra(e.progreso);
  $("#respuesta")?.classList.add("bg-tertiary-fixed");
  sonido.exito();
  const elogio = frase(ELOGIOS, nombre());
  await Promise.all([
    hablar(`${ej.a} por ${ej.b}, ${ej.res}. ${elogio}`),
    celebrar({ tipo: azar(FESTEJOS), titulo: elogio, subtitulo: `${ej.a} × ${ej.b} = ${ej.res}`, puntos: res.puntosGanados }),
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
      <p class="text-[96px] leading-none">🗼</p>
      <h1 class="font-headline-xl-mobile text-headline-xl-mobile sm:font-headline-xl sm:text-headline-xl mt-space-sm">¡Subiste a la torre!</h1>
      <p class="font-body-lg text-body-lg text-on-surface-variant mt-1">Resolviste ${e.aciertos} de ${e.sesion.length} multiplicaciones</p>
      <p class="inline-block mt-space-md px-6 py-3 rounded-full bg-primary-fixed text-on-primary-fixed font-headline-md text-headline-md">+${e.progreso.puntos - e.puntosInicio} ⭐</p>
      ${nuevas.length ? `<div class="mt-space-lg p-space-md rounded-[2rem] bg-surface-container-low">
        <p class="font-headline-sm text-headline-sm">¡Figurita nueva en el cofre!</p>
        <p class="text-[72px] leading-tight">${nuevas.map((f) => f.emoji).join(" ")}</p></div>` : ""}
      <div class="flex flex-col sm:flex-row justify-center gap-space-md mt-space-lg">
        <button id="otra" type="button" class="btn-tactil px-7 py-4 rounded-full bg-[#ec4899] text-white font-headline-sm text-headline-sm shadow-[0_4px_0_0_#9d174d]">🔁 Otra vez</button>
        <a href="multi.html" class="btn-tactil px-7 py-4 rounded-full bg-[#ede9fe] text-[#4c1d95] font-headline-sm text-headline-sm shadow-[0_4px_0_0_#c4b5fd]">🗼 Elegir nivel</a>
        <a href="index.html" class="btn-tactil px-7 py-4 rounded-full bg-white border-2 border-surface-container-high font-headline-sm text-headline-sm">🏠 Mapa</a>
      </div>
    </section>`;
  $("#otra").addEventListener("click", empezar);
  if (e.subio) {
    sonido.nivel();
    hablar(`¡Felicitaciones, ${nombre()}! ¡Subiste al nivel ${e.progreso.nivelMulti} de las tablas!`);
    await celebrar({ tipo: "confeti", titulo: `¡Subiste al nivel ${e.progreso.nivelMulti}!`, subtitulo: "Se abrieron tablas nuevas", duracion: 4500 });
    e.nivel = e.progreso.nivelMulti;
  } else {
    hablar(nuevas.length ? "¡Ganaste una figurita nueva!" : g(`¡Muy bien, ${nombre()}! ¡Sos {un} {genia} de las tablas!`));
  }
}

iniciar();
