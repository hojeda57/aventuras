import { api } from "../core/api.js";
import { personalizar } from "../core/app.js";
import { guardiaNina } from "../components/nina-guardia.js";
import { $, $$, esc, toast } from "../core/dom.js";
import { ANIMOS, ELOGIOS, FIGURITAS, NIVELES, frase, g } from "../core/constantes.js";
import { actualizarBarra, renderBarra } from "../components/nina-barra.js";
import { celebrar } from "../components/celebracion.js";
import { silabear } from "../utils/silabas.js";
import { detener, escuchar, hablar, reproducir } from "../utils/audio.js";
import { comparar, escuchar as escucharMicrofono, reconocimientoDisponible } from "../utils/reconocimiento.js";
import { sonido } from "../utils/sonidos.js";

const MODOS = {
  palabra: { titulo: "Palabras mágicas", emoji: "🪄", cantidad: 5, umbral: 1,    fondo: "bg-[linear-gradient(160deg,#c9e6ff,#89ceff)]" },
  frase:   { titulo: "Frases",           emoji: "💬", cantidad: 5, umbral: 0.75, fondo: "bg-[linear-gradient(160deg,#6ffbbe,#4edea3)]" },
  cuento:  { titulo: "Cuentos",          emoji: "📖", cantidad: 1, umbral: 0.6,  fondo: "bg-[linear-gradient(160deg,#ffddb8,#ffb95f)]" },
};
const INTENTOS_MAX = 3;

const e = {
  perfil: null, progreso: null, modo: null, nivel: 1,
  sesion: [], idx: 0, pagina: 0, intentos: 0, aciertos: 0, puntosInicio: 0, subio: false, ocupado: false, escucha: null,
};
const nombre = () => e.perfil?.nombre || "";
const item = () => e.sesion[e.idx];
const textoActual = () => (item().tipo === "cuento" ? item().paginas[e.pagina] : item().texto);

// ------------------------------------------------------------------ inicio
async function iniciar() {
  if (!(await guardiaNina("lectura"))) return;
  try { [e.perfil, e.progreso] = await Promise.all([api.perfil(), api.progreso()]); }
  catch (err) { toast(`No se pudo conectar: ${err.message}`, "error"); return; }
  renderBarra($("#barra"), { perfil: e.perfil, progreso: e.progreso });
  e.nivel = e.progreso.nivelLectura;
  const modo = new URLSearchParams(location.search).get("modo");
  modo && MODOS[modo] ? empezar(modo) : pantallaElegir();
}

function pantallaElegir() {
  detener();
  const desbloqueado = e.progreso.nivelLectura;
  $("#app").innerHTML = `
    <h1 class="font-headline-xl-mobile text-headline-xl-mobile sm:font-headline-xl sm:text-headline-xl text-center">🏝️ Isla de las Letras</h1>
    <p class="text-center font-body-lg text-body-lg text-on-surface-variant mb-space-lg">Elegí el nivel y la aventura</p>

    <div class="flex justify-center gap-space-sm mb-space-lg flex-wrap" role="group" aria-label="Nivel">
      ${[1, 2, 3].map((n) => {
        const bloqueado = n > desbloqueado;
        return `<button type="button" data-nivel="${n}" ${bloqueado ? "disabled" : ""} aria-pressed="${e.nivel === n}"
          class="btn-tactil min-w-[130px] px-5 py-3 rounded-full font-headline-sm text-headline-sm shadow-[0_4px_0_0_rgba(0,0,0,0.1)]
          ${e.nivel === n ? "bg-primary-container text-on-primary-container" : "bg-white"} ${bloqueado ? "opacity-50 cursor-not-allowed" : ""}">
          ${bloqueado ? "🔒" : "⭐".repeat(n)} ${NIVELES[n].label}</button>`;
      }).join("")}
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-space-lg">
      ${Object.entries(MODOS).map(([k, m]) => `
        <button type="button" data-modo="${k}" class="btn-tactil rounded-[2.5rem] p-space-lg ${m.fondo} shadow-[0_6px_0_0_rgba(0,0,0,0.12)] text-center hover:-translate-y-1 transition-transform">
          <span class="block text-[96px] leading-none">${m.emoji}</span>
          <span class="block font-headline-md text-headline-md mt-space-sm">${m.titulo}</span>
        </button>`).join("")}
    </div>
    ${desbloqueado < 3 ? `<p class="text-center mt-space-lg font-label-lg text-label-lg text-on-surface-variant">🔒 Los niveles se abren leyendo bien ${e.progreso.aciertosParaSubir} veces en tu nivel.</p>` : ""}`;

  $("#app").addEventListener("click", alElegir);
}

function alElegir(ev) {
  const niv = ev.target.closest("[data-nivel]");
  if (niv && !niv.disabled) { sonido.tap(); e.nivel = Number(niv.dataset.nivel); pantallaElegir(); return; }
  const modo = ev.target.closest("[data-modo]");
  if (modo) { $("#app").removeEventListener("click", alElegir); empezar(modo.dataset.modo); }
}

async function empezar(modo) {
  e.modo = modo;
  let todos;
  try { todos = await api.listar("lectura"); }
  catch (err) { toast(err.message, "error"); return; }
  const pool = todos.filter((i) => i.tipo === modo && i.nivel === e.nivel && !i.borrador)
    .map((i) => ({ ...i, texto: personalizar(i.texto, nombre()), paginas: i.paginas?.map((p) => personalizar(p, nombre())) }))
    .sort((a, b) => (a.dominada || 0) - (b.dominada || 0) || Math.random() - 0.5);
  if (!pool.length) {
    $("#app").innerHTML = `<div class="text-center bg-white rounded-[2rem] p-space-xl shadow-sm">
      <p class="text-[72px]">📭</p><p class="font-headline-md text-headline-md">Todavía no hay ${MODOS[modo].titulo.toLowerCase()} en este nivel.</p>
      <p class="font-body-lg text-body-lg text-on-surface-variant">Pedile a mamá o papá que agreguen algunas.</p>
      <a href="leer.html" class="inline-block mt-space-md px-6 py-3 rounded-full bg-primary-container font-label-lg text-label-lg">Volver</a></div>`;
    return;
  }
  Object.assign(e, { sesion: pool.slice(0, MODOS[modo].cantidad), idx: 0, pagina: 0, intentos: 0, aciertos: 0,
    puntosInicio: e.progreso.puntos, subio: false });
  pantallaJuego();
}

// ------------------------------------------------------------------ juego
function visual(it) {
  const emoji = `<span class="text-[110px] leading-none">${esc(it.emoji || "📘")}</span>`;
  if (!it.imagen || it.tipo === "cuento" && e.pagina > 0) return emoji;
  return `<img src="${esc(it.imagen)}" alt="" class="h-44 w-full max-w-sm object-cover rounded-[1.5rem] mx-auto"
    onerror="this.nextElementSibling.hidden=false;this.remove()"><span hidden>${emoji}</span>`;
}

function palabrasHTML(texto) {
  return texto.split(/\s+/).map((w, i) => `<span class="palabra-leer" data-i="${i}" role="button" tabindex="0">${esc(w)}</span>`).join(" ");
}

function pantallaJuego() {
  const it = item();
  const esCuento = it.tipo === "cuento";
  const texto = textoActual();
  const tamano = it.tipo === "palabra" ? `${texto.length > 7 ? "text-[40px]" : "text-[52px]"} sm:text-[80px] tracking-wide` : texto.length > 45 ? "text-[28px] sm:text-[36px]" : "text-[34px] sm:text-[44px]";
  const puntos = e.sesion.map((_, i) => `<span class="w-4 h-4 rounded-full ${i < e.idx ? "bg-tertiary-container" : i === e.idx ? "bg-primary-container scale-125" : "bg-white"}"></span>`).join("");

  $("#app").innerHTML = `
    <div class="flex items-center justify-between mb-space-md">
      <a href="leer.html" class="font-label-lg text-label-lg text-secondary">← Cambiar aventura</a>
      ${esCuento ? `<span class="font-label-lg text-label-lg">Página ${e.pagina + 1} de ${it.paginas.length}</span>` : `<div class="flex gap-2 items-center" aria-label="Progreso">${puntos}</div>`}
    </div>

    <article id="tarjeta" class="bg-white rounded-[2.5rem] shadow-[0_8px_0_0_#dee8ff] p-space-lg sm:p-space-xl text-center">
      ${esCuento ? `<h2 class="font-headline-md text-headline-md text-primary mb-space-sm">${esc(it.texto)}</h2>` : ""}
      <div class="mb-space-md">${visual(it)}</div>
      <p id="texto" class="font-bold leading-snug break-words ${tamano}">${palabrasHTML(texto)}</p>
      <div id="silabas" class="flex justify-center gap-2 flex-wrap mt-space-md min-h-[56px]"></div>
      <p id="estadoVoz" class="font-headline-sm text-headline-sm min-h-[32px] mt-space-sm" aria-live="polite">Tocá una palabra para escucharla</p>

      <div class="flex flex-col sm:flex-row items-center justify-center gap-space-md mt-space-md">
        <button id="btnEscuchar" type="button" class="btn-tactil w-full sm:w-auto px-7 py-4 rounded-full bg-secondary-fixed text-on-secondary-fixed font-headline-sm text-headline-sm shadow-[0_4px_0_0_#89ceff]">🔊 Escuchar</button>
        <button id="btnLeer" type="button" class="btn-tactil w-full sm:w-auto px-9 py-5 rounded-full bg-primary-container text-on-primary-container font-headline-md text-headline-md shadow-[0_5px_0_0_#b45309]">
          🎤 ¡Leer en voz alta!</button>
      </div>
      ${reconocimientoDisponible ? "" : `<p class="mt-space-md font-body-sm text-body-sm text-on-surface-variant">Este navegador no puede escuchar. Leé en voz alta y que un adulto toque "Lo leyó bien".</p>`}
      <button id="btnAdulto" type="button" class="mt-space-lg font-label-sm text-label-sm text-on-surface-variant underline">✔ Lo leyó bien (para papás)</button>
    </article>`;

  $("#btnEscuchar").addEventListener("click", () => { sonido.tap(); escuchar(esCuento ? null : it.audio, texto); });
  $("#btnLeer").addEventListener("click", leer);
  $("#btnAdulto").addEventListener("click", () => {
    if (e.escucha) { e.forzarAcierto = true; e.escucha.terminar(); return; }  // un adulto confirma mientras escucha
    if (!e.ocupado) acierto();
  });
  $("#texto").addEventListener("click", tocarPalabra);
  $("#texto").addEventListener("keydown", (ev) => ev.key === "Enter" && tocarPalabra(ev));
}

function tocarPalabra(ev) {
  const span = ev.target.closest(".palabra-leer");
  if (!span || e.ocupado) return;
  const limpia = span.textContent.replace(/[.,;:¡!¿?"“”]/g, "");
  sonido.tap();
  hablar(limpia, { lento: true });
  $("#silabas").innerHTML = silabear(limpia).map((s) =>
    `<button type="button" data-silaba="${esc(s)}" class="btn-tactil px-4 py-2 rounded-[1rem] bg-secondary-fixed text-on-secondary-fixed font-headline-md text-headline-md shadow-[0_3px_0_0_#89ceff]">${esc(s)}</button>`).join("");
  $("#silabas").onclick = (e2) => { const b = e2.target.closest("[data-silaba]"); if (b) hablar(b.dataset.silaba.toLowerCase(), { lento: true }); };
}

const BOTON_LEER = "🎤 ¡Leer en voz alta!";
const CLASES_LEER = "bg-primary-container text-on-primary-container shadow-[0_5px_0_0_#b45309]";
const CLASES_TERMINE = "bg-tertiary text-on-tertiary shadow-[0_5px_0_0_#004e34]";

function botonModo(escuchando) {
  const btn = $("#btnLeer");
  if (!btn) return;
  btn.classList.remove(...(escuchando ? CLASES_LEER : CLASES_TERMINE).split(" "));
  btn.classList.add(...(escuchando ? CLASES_TERMINE : CLASES_LEER).split(" "));
  btn.classList.toggle("latido", escuchando);
  btn.innerHTML = escuchando ? "✅ ¡Terminé!" : BOTON_LEER;
  $("#btnEscuchar").disabled = escuchando;
  $("#btnEscuchar").classList.toggle("opacity-40", escuchando);
}

async function leer() {
  if (e.escucha) { sonido.tap(); e.escucha.terminar(); return; }   // segundo toque: "¡Terminé!"
  if (e.ocupado) return;
  if (!reconocimientoDisponible) { toast("Este navegador no puede escuchar. Probá con Chrome o Edge.", "error"); return; }
  e.ocupado = true;
  e.forzarAcierto = false;
  detener();
  const texto = textoActual();
  const manual = item().tipo !== "palabra";   // frases y cuentos: escucha hasta que toque "¡Terminé!"
  $$(".palabra-leer").forEach((sp) => sp.classList.remove("palabra-ok", "palabra-falta"));
  $("#estadoVoz").innerHTML = manual
    ? g("👂 Te escucho. Leé {tranquila}, sin apuro.<span class='block font-body-md text-body-md text-on-surface-variant'>Cuando termines, tocá <b>¡Terminé!</b></span>")
    : "👂 ¡Leé en voz alta!";
  botonModo(true);
  try {
    e.escucha = escucharMicrofono({
      manual,
      palabras: texto.split(/\s+/).length,
      alEmpezar: () => sonido.tap(),
      alParcial: (dicho) => {   // pinta de verde lo que ya leyó, en vivo
        comparar(texto, [dicho], 0).palabras.forEach((p, i) => p.leida && $(`.palabra-leer[data-i="${i}"]`)?.classList.add("palabra-ok"));
      },
    });
    const candidatos = await e.escucha.resultado;
    e.escucha = null;
    botonModo(false);
    e.ocupado = false;
    if (e.forzarAcierto) return acierto();
    const r = comparar(texto, candidatos, MODOS[e.modo].umbral);
    r.palabras.forEach((p, i) => $(`.palabra-leer[data-i="${i}"]`)?.classList.add(p.leida ? "palabra-ok" : "palabra-falta"));
    if (r.ok) await acierto();
    else await fallo(candidatos.length === 0);
  } catch (err) {
    e.escucha = null;
    botonModo(false);
    e.ocupado = false;
    toast(err?.error === "not-allowed" ? "Hay que permitir el micrófono (y abrir la app con https o localhost)." : "No pude escuchar. Probá otra vez.", "error");
  }
}

async function fallo(noEscuche) {
  e.intentos++;
  sonido.error();
  $("#tarjeta").classList.remove("sacudir"); void $("#tarjeta").offsetWidth; $("#tarjeta").classList.add("sacudir");
  e.ocupado = true;

  if (e.intentos >= INTENTOS_MAX) {
    $("#estadoVoz").textContent = "¡Muy bien por intentarlo! Seguimos con otra 💪";
    await hablar(`¡Muy bien por intentarlo, ${nombre()}! Escuchá cómo se lee.`);
    await escuchar(item().tipo === "cuento" ? null : item().audio, textoActual());
    e.ocupado = false;
    if (item().tipo === "cuento" && e.pagina < item().paginas.length - 1) return siguientePagina();
    api.registrar("lectura", item().id, false).catch(() => {});
    return siguiente();
  }
  const mensaje = noEscuche ? "No te escuché bien. ¿Probamos más fuerte?" : frase(ANIMOS, nombre());
  $("#estadoVoz").innerHTML = noEscuche ? `🙉 ${esc(mensaje)}` : `🧡 ${esc(mensaje)} <span class="block font-body-md text-body-md text-on-surface-variant">Las palabras naranjas son las que me faltaron</span>`;
  await hablar(mensaje);
  if (e.intentos === 2) await escuchar(item().tipo === "cuento" ? null : item().audio, textoActual());
  e.ocupado = false;
}

async function acierto() {
  e.ocupado = true;
  const it = item();
  // Página intermedia de un cuento: festejo chiquito y seguimos
  if (it.tipo === "cuento" && e.pagina < it.paginas.length - 1) {
    sonido.pagina();
    $("#estadoVoz").textContent = "⭐ ¡Muy bien! Sigamos…";
    await hablar("¡Muy bien!");
    e.ocupado = false;
    return siguientePagina();
  }
  let res;
  try { res = await api.registrar("lectura", it.id, true); }
  catch (err) { toast(err.message, "error"); e.ocupado = false; return; }
  e.progreso = res.progreso;
  e.aciertos++;
  e.subio ||= res.subioNivel;
  actualizarBarra(e.progreso);
  sonido.exito();
  const elogio = frase(ELOGIOS, nombre());
  const voz = it.audio ? reproducir(it.audio) : hablar(elogio);
  await Promise.all([voz, celebrar({ tipo: it.celebracion, titulo: `¡Excelente, ${nombre()}!`, subtitulo: elogio, puntos: res.puntosGanados })]);
  e.ocupado = false;
  siguiente();
}

function siguientePagina() {
  e.pagina++;
  e.intentos = 0;
  pantallaJuego();
}

function siguiente() {
  e.idx++;
  e.pagina = 0;
  e.intentos = 0;
  e.idx < e.sesion.length ? pantallaJuego() : pantallaFin();
}

// ------------------------------------------------------------------ fin de misión
async function pantallaFin() {
  const nuevas = FIGURITAS.filter((f) => f.puntos > e.puntosInicio && f.puntos <= e.progreso.puntos);
  const ganados = e.progreso.puntos - e.puntosInicio;
  $("#app").innerHTML = `
    <section class="text-center bg-white rounded-[2.5rem] shadow-[0_8px_0_0_#dee8ff] p-space-xl">
      <p class="text-[96px] leading-none">🏆</p>
      <h1 class="font-headline-xl-mobile text-headline-xl-mobile sm:font-headline-xl sm:text-headline-xl mt-space-sm">¡Misión cumplida!</h1>
      <p class="font-body-lg text-body-lg text-on-surface-variant mt-1">Leíste bien ${e.aciertos} de ${e.sesion.length} ${e.modo === "cuento" ? "cuento" : "tarjetas"}</p>
      <p class="inline-block mt-space-md px-6 py-3 rounded-full bg-primary-fixed text-on-primary-fixed font-headline-md text-headline-md">+${ganados} ⭐</p>
      ${nuevas.length ? `<div class="mt-space-lg p-space-md rounded-[2rem] bg-surface-container-low">
        <p class="font-headline-sm text-headline-sm">¡Ganaste ${nuevas.length > 1 ? "figuritas nuevas" : "una figurita nueva"}!</p>
        <p class="text-[72px] leading-tight">${nuevas.map((f) => f.emoji).join(" ")}</p></div>` : ""}
      <div class="flex flex-col sm:flex-row justify-center gap-space-md mt-space-lg">
        <button id="otra" type="button" class="btn-tactil px-7 py-4 rounded-full bg-primary-container text-on-primary-container font-headline-sm text-headline-sm shadow-[0_4px_0_0_#b45309]">🔁 Otra misión</button>
        <a href="leer.html" class="btn-tactil px-7 py-4 rounded-full bg-secondary-fixed text-on-secondary-fixed font-headline-sm text-headline-sm shadow-[0_4px_0_0_#89ceff]">🪄 Elegir otra</a>
        <a href="index.html" class="btn-tactil px-7 py-4 rounded-full bg-white border-2 border-surface-container-high font-headline-sm text-headline-sm">🏠 Mapa</a>
      </div>
    </section>`;
  $("#otra").addEventListener("click", () => empezar(e.modo));

  if (e.subio) {
    sonido.nivel();
    hablar(`¡Felicitaciones, ${nombre()}! ¡Subiste al nivel ${e.progreso.nivelLectura} de lectura!`);
    await celebrar({ tipo: "confeti", titulo: `¡Subiste al nivel ${e.progreso.nivelLectura}!`, subtitulo: "Se abrieron palabras, frases y cuentos nuevos", duracion: 4500 });
    e.nivel = e.progreso.nivelLectura;
  } else if (nuevas.length) {
    hablar(`¡Ganaste una figurita nueva! Mirala en el cofre de premios.`);
  } else {
    hablar(`¡Misión cumplida, ${nombre()}! ¡Qué bien que leíste!`);
  }
}

iniciar();
