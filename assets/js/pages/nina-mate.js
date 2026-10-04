import { api } from "../core/api.js";
import { personalizar } from "../core/app.js";
import { guardiaNina } from "../components/nina-guardia.js";
import { $, $$, esc, toast } from "../core/dom.js";
import { ANIMOS_MATE, ELOGIOS_MATE, FIGURITAS, OPERACIONES, frase, g } from "../core/constantes.js";
import { actualizarBarra, renderBarra } from "../components/nina-barra.js";
import { celebrar } from "../components/celebracion.js";
import { nivelDe, resultado } from "../utils/mate.js";
import { detener, hablar, reproducir } from "../utils/audio.js";
import { sonido } from "../utils/sonidos.js";

const NIVELES_MATE = {
  1: { titulo: "Contar y sumar", detalle: "Hasta el 5", emoji: "🍎", fondo: "bg-[linear-gradient(160deg,#6ffbbe,#4edea3)]" },
  2: { titulo: "Cuentas", detalle: "Hasta el 10", emoji: "🚗", fondo: "bg-[linear-gradient(160deg,#c9e6ff,#89ceff)]" },
  3: { titulo: "Problemas", detalle: "Pensar y resolver", emoji: "🧩", fondo: "bg-[linear-gradient(160deg,#ffddb8,#ffb95f)]" },
};
const POR_SESION = 5;
const INTENTOS_MAX = 3;
const NUMEROS = ["cero","uno","dos","tres","cuatro","cinco","seis","siete","ocho","nueve","diez","once","doce","trece","catorce","quince","dieciséis","diecisiete","dieciocho","diecinueve","veinte"];

const e = { perfil: null, progreso: null, nivel: 1, sesion: [], idx: 0, intentos: 0, aciertos: 0, respuesta: "", puntosInicio: 0, subio: false, ocupado: false, contados: 0 };
const nombre = () => e.perfil?.nombre || "";
const reto = () => e.sesion[e.idx];

function pregunta(r) {
  if (r.enunciado) return r.enunciado;
  if (r.operacion === "contar") return r.titulo?.startsWith("¿") ? r.titulo : "¿Cuántos hay?";
  return `¿Cuánto es ${r.a} ${r.operacion === "suma" ? "más" : "menos"} ${r.b}?`;
}

// ------------------------------------------------------------------ inicio
async function iniciar() {
  if (!(await guardiaNina("mate"))) return;
  try { [e.perfil, e.progreso] = await Promise.all([api.perfil(), api.progreso()]); }
  catch (err) { toast(`No se pudo conectar: ${err.message}`, "error"); return; }
  renderBarra($("#barra"), { perfil: e.perfil, progreso: e.progreso });
  e.nivel = e.progreso.nivelMate;
  pantallaElegir();
}

function pantallaElegir() {
  detener();
  const desbloqueado = e.progreso.nivelMate;
  $("#app").innerHTML = `
    <h1 class="font-headline-xl-mobile text-headline-xl-mobile sm:font-headline-xl sm:text-headline-xl text-center">⛰️ Montaña de las Cuentas</h1>
    <p class="text-center font-body-lg text-body-lg text-on-surface-variant mb-space-lg">Elegí hasta dónde querés escalar</p>
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-space-lg">
      ${[1, 2, 3].map((n) => {
        const m = NIVELES_MATE[n], bloqueado = n > desbloqueado;
        return `<button type="button" data-nivel="${n}" ${bloqueado ? "disabled" : ""}
          class="btn-tactil rounded-[2.5rem] p-space-lg ${m.fondo} shadow-[0_6px_0_0_rgba(0,0,0,0.12)] text-center ${bloqueado ? "opacity-50 grayscale cursor-not-allowed" : "hover:-translate-y-1 transition-transform"}">
          <span class="block text-[88px] leading-none">${bloqueado ? "🔒" : m.emoji}</span>
          <span class="block font-label-lg text-label-lg mt-space-sm">${"⭐".repeat(n)} Nivel ${n}</span>
          <span class="block font-headline-md text-headline-md">${m.titulo}</span>
          <span class="block font-body-md text-body-md">${m.detalle}</span>
        </button>`;
      }).join("")}
    </div>
    ${desbloqueado < 3 ? `<p class="text-center mt-space-lg font-label-lg text-label-lg text-on-surface-variant">🔒 El nivel siguiente se abre con ${e.progreso.aciertosParaSubir} respuestas correctas en tu nivel.</p>` : ""}`;
  $$("[data-nivel]").forEach((b) => b.addEventListener("click", () => { e.nivel = Number(b.dataset.nivel); empezar(); }));
}

async function empezar() {
  let todos;
  try { todos = await api.listar("matematicas"); }
  catch (err) { toast(err.message, "error"); return; }
  const pool = todos.filter((r) => r.activo && nivelDe(r) === e.nivel)
    .map((r) => ({ ...r, titulo: personalizar(r.titulo, nombre()), enunciado: personalizar(r.enunciado, nombre()), mensajeVoz: personalizar(r.mensajeVoz, nombre()) }))
    .sort((a, b) => (a.superado || 0) - (b.superado || 0) || (a.orden ?? 0) - (b.orden ?? 0));
  if (!pool.length) {
    $("#app").innerHTML = `<div class="text-center bg-white rounded-[2rem] p-space-xl"><p class="text-[72px]">📭</p>
      <p class="font-headline-md text-headline-md">Todavía no hay ejercicios en este nivel.</p>
      <a href="mate.html" class="inline-block mt-space-md px-6 py-3 rounded-full bg-primary-container font-label-lg text-label-lg">Volver</a></div>`;
    return;
  }
  Object.assign(e, { sesion: pool.slice(0, POR_SESION), idx: 0, intentos: 0, aciertos: 0, puntosInicio: e.progreso.puntos, subio: false });
  pantallaJuego();
}

// ------------------------------------------------------------------ juego
function objetos(r) {
  const obj = (emoji, extra = "") => `<button type="button" class="objeto relative text-[44px] sm:text-[52px] leading-none p-1 rounded-[1rem] transition-transform ${extra}" aria-label="objeto">${esc(emoji)}</button>`;
  const grupo = (html, n) => `<div class="flex flex-wrap justify-center gap-1 p-space-sm rounded-[1.5rem] bg-surface-container-low max-w-[340px]">${html}</div>`;
  const rep = (emoji, n, extra) => Array.from({ length: n }, () => obj(emoji, extra)).join("");
  const signo = (s) => `<span class="text-[48px] font-bold text-secondary">${s}</span>`;
  if (r.operacion === "suma")
    return grupo(rep(r.objeto, r.a)) + signo("+") + grupo(rep(r.objetoB || r.objeto, r.b));
  if (r.operacion === "resta") {
    const quedan = rep(r.objeto, r.a - r.b), seVan = rep(r.objeto, r.b, "se-va pointer-events-none");
    return grupo(quedan + seVan) ;
  }
  return grupo(rep(r.objeto, r.a));
}

function pantallaJuego() {
  const r = reto();
  e.respuesta = ""; e.contados = 0;
  const op = OPERACIONES[r.operacion];
  const puntos = e.sesion.map((_, i) => `<span class="w-4 h-4 rounded-full ${i < e.idx ? "bg-tertiary-container" : i === e.idx ? "bg-primary-container scale-125" : "bg-white"}"></span>`).join("");
  const cuenta = r.operacion === "contar" ? "" : `${r.a} ${op.simbolo} ${r.b} = ?`;

  $("#app").innerHTML = `
    <div class="flex items-center justify-between mb-space-md">
      <a href="mate.html" class="font-label-lg text-label-lg text-secondary">← Cambiar nivel</a>
      <div class="flex gap-2 items-center" aria-label="Progreso">${puntos}</div>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-5 gap-space-lg items-start">
      <article id="tarjeta" class="lg:col-span-3 bg-white rounded-[2.5rem] shadow-[0_8px_0_0_#dee8ff] p-space-lg text-center">
        <div class="flex items-start justify-center gap-space-sm">
          <p class="font-headline-md text-headline-md leading-snug">${esc(pregunta(r))}</p>
          <button id="btnRepetir" type="button" aria-label="Escuchar la pregunta" class="shrink-0 w-12 h-12 rounded-full bg-secondary-fixed text-[22px]">🔊</button>
        </div>
        <div id="objetos" class="flex flex-wrap items-center justify-center gap-space-sm my-space-lg">${objetos(r)}</div>
        ${r.operacion === "resta" ? `<p class="font-label-lg text-label-lg text-on-surface-variant -mt-2 mb-2">💨 ${r.b} se van</p>` : ""}
        ${e.nivel < 3 && cuenta ? `<p class="text-[40px] font-bold tracking-wide text-on-surface-variant">${cuenta}</p>` : ""}
        <p id="estado" class="font-headline-sm text-headline-sm min-h-[32px] mt-space-sm" aria-live="polite">Tocá los dibujos para contar 👆</p>
      </article>

      <div class="lg:col-span-2 bg-white rounded-[2.5rem] shadow-[0_8px_0_0_#dee8ff] p-space-lg">
        <div id="respuesta" class="h-24 rounded-[1.5rem] bg-surface-container-low flex items-center justify-center text-[64px] font-bold text-secondary mb-space-md" aria-live="polite">?</div>
        <div id="teclado" class="grid grid-cols-3 gap-space-sm">
          ${[1,2,3,4,5,6,7,8,9].map((n) => `<button type="button" data-num="${n}" class="btn-tactil h-20 rounded-[1.5rem] bg-secondary-fixed text-on-secondary-fixed text-[40px] font-bold shadow-[0_4px_0_0_#89ceff]">${n}</button>`).join("")}
          <button type="button" data-borrar aria-label="Borrar" class="btn-tactil h-20 rounded-[1.5rem] bg-surface-container text-[32px] shadow-[0_4px_0_0_#d8e3fb]">⌫</button>
          <button type="button" data-num="0" class="btn-tactil h-20 rounded-[1.5rem] bg-secondary-fixed text-on-secondary-fixed text-[40px] font-bold shadow-[0_4px_0_0_#89ceff]">0</button>
          <button type="button" data-ok aria-label="Listo" class="btn-tactil h-20 rounded-[1.5rem] bg-tertiary text-on-tertiary text-[36px] shadow-[0_4px_0_0_#004e34]">✔</button>
        </div>
      </div>
    </div>`;

  $("#btnRepetir").addEventListener("click", () => hablar(pregunta(r)));
  $("#objetos").addEventListener("click", contarObjeto);
  $("#teclado").addEventListener("click", tecla);
  hablar(pregunta(r));
}

function contarObjeto(ev) {
  const o = ev.target.closest(".objeto");
  if (!o || e.ocupado || o.classList.contains("objeto-contado")) return;
  e.contados++;
  o.dataset.n = e.contados;
  o.classList.add("objeto-contado");
  hablar(NUMEROS[e.contados] || String(e.contados));
}

function tecla(ev) {
  if (e.ocupado) return;
  const b = ev.target.closest("button");
  if (!b) return;
  sonido.tap();
  if (b.dataset.num !== undefined && e.respuesta.length < 2) e.respuesta = (e.respuesta + b.dataset.num).replace(/^0(?=\d)/, "");
  if (b.hasAttribute("data-borrar")) e.respuesta = e.respuesta.slice(0, -1);
  $("#respuesta").textContent = e.respuesta || "?";
  if (b.hasAttribute("data-ok") && e.respuesta) comprobar();
}

async function comprobar() {
  const r = reto();
  Number(e.respuesta) === resultado(r) ? await acierto() : await fallo();
}

async function conteoGuiado() {
  $$(".objeto").forEach((o) => { o.classList.remove("objeto-contado"); delete o.dataset.n; });
  const visibles = $$(".objeto:not(.se-va)");
  for (let i = 0; i < visibles.length; i++) {
    visibles[i].dataset.n = i + 1;
    visibles[i].classList.add("objeto-contado");
    await hablar(NUMEROS[i + 1] || String(i + 1), { encolar: true });
  }
  e.contados = visibles.length;
}

async function fallo() {
  e.ocupado = true;
  e.intentos++;
  sonido.error();
  $("#respuesta").classList.remove("sacudir"); void $("#respuesta").offsetWidth; $("#respuesta").classList.add("sacudir");
  const r = reto();

  if (e.intentos >= INTENTOS_MAX) {
    $("#respuesta").textContent = resultado(r);
    $("#estado").textContent = `Era ${resultado(r)}. ¡La próxima te sale! 💪`;
    await hablar(`Era ${resultado(r)}. ¡Muy bien por intentarlo, ${nombre()}! Vamos con otro.`);
    api.registrar("mate", r.id, false).catch(() => {});
    e.ocupado = false;
    return siguiente();
  }
  const animo = frase(ANIMOS_MATE, nombre());
  $("#estado").textContent = `🧡 ${animo}`;
  await hablar(animo);
  if (e.intentos === 2) {
    $("#estado").textContent = g("👀 Contemos {juntas}…");
    await conteoGuiado();
    $("#estado").textContent = "Ahora escribí cuántos son";
  }
  e.respuesta = "";
  $("#respuesta").textContent = "?";
  e.ocupado = false;
}

async function acierto() {
  e.ocupado = true;
  const r = reto();
  let res;
  try { res = await api.registrar("mate", r.id, true); }
  catch (err) { toast(err.message, "error"); e.ocupado = false; return; }
  e.progreso = res.progreso;
  e.aciertos++;
  e.subio ||= res.subioNivel;
  actualizarBarra(e.progreso);
  $("#respuesta").classList.add("bg-tertiary-fixed");
  sonido.exito();
  const elogio = r.mensajeVoz || frase(ELOGIOS_MATE, nombre());
  const voz = r.audio ? reproducir(r.audio) : hablar(elogio);
  await Promise.all([voz, celebrar({ tipo: r.celebracion, titulo: `¡Correcto, ${nombre()}!`, subtitulo: elogio, puntos: res.puntosGanados })]);
  e.ocupado = false;
  siguiente();
}

function siguiente() {
  e.idx++;
  e.intentos = 0;
  e.idx < e.sesion.length ? pantallaJuego() : pantallaFin();
}

async function pantallaFin() {
  const nuevas = FIGURITAS.filter((f) => f.puntos > e.puntosInicio && f.puntos <= e.progreso.puntos);
  $("#app").innerHTML = `
    <section class="text-center bg-white rounded-[2.5rem] shadow-[0_8px_0_0_#dee8ff] p-space-xl">
      <p class="text-[96px] leading-none">🏔️</p>
      <h1 class="font-headline-xl-mobile text-headline-xl-mobile sm:font-headline-xl sm:text-headline-xl mt-space-sm">¡Llegaste a la cima!</h1>
      <p class="font-body-lg text-body-lg text-on-surface-variant mt-1">Resolviste ${e.aciertos} de ${e.sesion.length} ejercicios</p>
      <p class="inline-block mt-space-md px-6 py-3 rounded-full bg-primary-fixed text-on-primary-fixed font-headline-md text-headline-md">+${e.progreso.puntos - e.puntosInicio} ⭐</p>
      ${nuevas.length ? `<div class="mt-space-lg p-space-md rounded-[2rem] bg-surface-container-low">
        <p class="font-headline-sm text-headline-sm">¡Figurita nueva en el cofre!</p>
        <p class="text-[72px] leading-tight">${nuevas.map((f) => f.emoji).join(" ")}</p></div>` : ""}
      <div class="flex flex-col sm:flex-row justify-center gap-space-md mt-space-lg">
        <button id="otra" type="button" class="btn-tactil px-7 py-4 rounded-full bg-primary-container text-on-primary-container font-headline-sm text-headline-sm shadow-[0_4px_0_0_#b45309]">🔁 Otra vez</button>
        <a href="mate.html" class="btn-tactil px-7 py-4 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-headline-sm text-headline-sm shadow-[0_4px_0_0_#4edea3]">⛰️ Elegir nivel</a>
        <a href="index.html" class="btn-tactil px-7 py-4 rounded-full bg-white border-2 border-surface-container-high font-headline-sm text-headline-sm">🏠 Mapa</a>
      </div>
    </section>`;
  $("#otra").addEventListener("click", empezar);
  if (e.subio) {
    sonido.nivel();
    hablar(`¡Felicitaciones, ${nombre()}! ¡Subiste al nivel ${e.progreso.nivelMate} de matemática!`);
    await celebrar({ tipo: "confeti", titulo: `¡Subiste al nivel ${e.progreso.nivelMate}!`, subtitulo: "Se abrieron desafíos nuevos", duracion: 4500 });
    e.nivel = e.progreso.nivelMate;
  } else {
    hablar(nuevas.length ? "¡Ganaste una figurita nueva! Mirala en el cofre." : g(`¡Muy bien, ${nombre()}! ¡Sos {un} {genia} de los números!`));
  }
}

iniciar();
