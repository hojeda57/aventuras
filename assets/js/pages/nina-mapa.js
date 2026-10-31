import { api } from "../core/api.js";
import { $, esc, toast } from "../core/dom.js";
import { CARAS_AVATAR, FIGURITAS } from "../core/constantes.js";
import { info, titulo } from "../core/app.js";
import { avatarHTML, renderBarra } from "../components/nina-barra.js";
import { hablar } from "../utils/audio.js";
import { sonido } from "../utils/sonidos.js";

function barraNivel(aciertos, necesarios, nivel) {
  if (nivel >= 3 && aciertos >= necesarios)
    return `<p class="font-label-lg text-label-lg">🏆 ¡Completaste todos los niveles!</p>`;
  const pct = Math.min(100, Math.round((aciertos / necesarios) * 100));
  return `
    <div class="h-5 rounded-full bg-white/70 overflow-hidden" role="progressbar" aria-valuenow="${aciertos}" aria-valuemax="${necesarios}">
      <div class="h-full rounded-full bg-primary-container transition-all" style="width:${pct}%"></div>
    </div>
    <p class="font-label-md text-label-md mt-1">${aciertos} de ${necesarios} para ${nivel >= 3 ? "ganar el diploma final" : `el nivel ${nivel + 1}`}</p>`;
}

function isla({ href, titulo, emoji, escena, fondo, nivel, aciertos, necesarios, texto, bloqueada = false }) {
  return `
  <a href="${href}" class="btn-tactil group relative block rounded-[2.5rem] p-space-lg ${fondo} shadow-[0_6px_0_0_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-transform ${bloqueada ? "grayscale-[60%] opacity-80" : ""}">
    <div class="flex items-start justify-between">
      <span class="text-[88px] leading-none drop-shadow-sm group-hover:scale-110 transition-transform">${emoji}</span>
      <span class="px-4 py-1.5 rounded-full bg-white/85 font-label-lg text-label-lg">${bloqueada ? "🔒 Versión completa" : `${"⭐".repeat(nivel)} Nivel ${nivel}`}</span>
    </div>
    <p class="text-[34px] leading-tight tracking-wide mt-2">${escena}</p>
    <h2 class="font-headline-lg-mobile text-headline-lg-mobile sm:font-headline-lg sm:text-headline-lg mt-space-sm">${titulo}</h2>
    <p class="font-body-lg text-body-lg mb-space-md">${texto}</p>
    ${barraNivel(aciertos, necesarios, nivel)}
  </a>`;
}

// ------------------------------------------------------------------ jugadores
function pantallaNuevoJugador(primero) {
  let cara = CARAS_AVATAR[0], edad = 6, genero = "a";
  $("#barra").innerHTML = "";
  $("#app").innerHTML = `
    <section class="max-w-2xl mx-auto bg-white rounded-[2.5rem] shadow-[0_8px_0_0_#dee8ff] p-space-lg sm:p-space-xl text-center">
      <p class="text-[72px] leading-none">${primero ? "👋" : "✨"}</p>
      <h1 class="font-headline-lg-mobile text-headline-lg-mobile sm:font-headline-lg sm:text-headline-lg mt-2">${primero ? "¡Hola! ¿Cómo te llamás?" : "Nuevo jugador"}</h1>
      <p class="font-body-md text-body-md text-on-surface-variant">${primero ? "Un adulto puede ayudarte a completar esto." : ""}</p>
      <input id="nombre" maxlength="20" autocomplete="off" placeholder="Tu nombre"
        class="mt-space-md w-full max-w-sm min-h-[64px] px-space-md rounded-[1.5rem] bg-surface-container-low text-center font-headline-md text-headline-md focus:outline-none focus:ring-4 focus:ring-secondary-container">
      <p class="font-label-lg text-label-lg mt-space-md mb-2">¿Sos nena o nene?</p>
      <div id="generos" class="flex justify-center gap-space-sm">
        <button type="button" data-genero="a" class="btn-tactil px-6 py-3 rounded-full font-headline-sm text-headline-sm">👧 Nena</button>
        <button type="button" data-genero="o" class="btn-tactil px-6 py-3 rounded-full font-headline-sm text-headline-sm">👦 Nene</button>
      </div>
      <p class="font-label-lg text-label-lg mt-space-md mb-2">¿Cuántos años tenés?</p>
      <div id="edades" class="flex justify-center gap-2 flex-wrap">${[4, 5, 6, 7, 8].map((n) => `<button type="button" data-edad="${n}" class="btn-tactil w-14 h-14 rounded-full font-headline-sm text-headline-sm">${n}</button>`).join("")}</div>
      <p class="font-label-lg text-label-lg mt-space-md mb-2">Elegí tu personaje</p>
      <div id="caras" class="flex justify-center gap-2 flex-wrap">${CARAS_AVATAR.map((c) => `<button type="button" data-cara="${c}" class="btn-tactil w-16 h-16 rounded-full text-[36px]">${c}</button>`).join("")}</div>
      <button id="empezar" type="button" class="btn-tactil mt-space-lg px-10 py-4 rounded-full bg-primary-container text-on-primary-container font-headline-md text-headline-md shadow-[0_5px_0_0_#b45309]">¡Empezar la aventura!</button>
      ${primero ? "" : `<a href="index.html?elegir=1" class="block mt-space-md font-label-lg text-label-lg text-secondary">Volver</a>`}
    </section>`;
  const pintar = () => {
    document.querySelectorAll("[data-edad]").forEach((b) => b.className = `btn-tactil w-14 h-14 rounded-full font-headline-sm text-headline-sm ${Number(b.dataset.edad) === edad ? "bg-secondary text-on-secondary" : "bg-surface-container-low"}`);
    document.querySelectorAll("[data-genero]").forEach((b) => b.className = `btn-tactil px-6 py-3 rounded-full font-headline-sm text-headline-sm ${b.dataset.genero === genero ? "bg-secondary text-on-secondary" : "bg-surface-container-low"}`);
    document.querySelectorAll("[data-cara]").forEach((b) => b.className = `btn-tactil w-16 h-16 rounded-full text-[36px] ${b.dataset.cara === cara ? "bg-secondary-fixed ring-4 ring-secondary" : "bg-surface-container-low"}`);
  };
  $("#edades").onclick = (ev) => { const b = ev.target.closest("[data-edad]"); if (b) { edad = Number(b.dataset.edad); sonido.tap(); pintar(); } };
  $("#generos").onclick = (ev) => { const b = ev.target.closest("[data-genero]"); if (b) { genero = b.dataset.genero; cara = genero === "o" ? "👦" : "👧"; sonido.tap(); pintar(); } };
  $("#caras").onclick = (ev) => { const b = ev.target.closest("[data-cara]"); if (b) { cara = b.dataset.cara; sonido.tap(); pintar(); } };
  $("#empezar").onclick = async () => {
    const nombre = $("#nombre").value.trim();
    if (!nombre) { toast("Escribí tu nombre", "error"); $("#nombre").focus(); return; }
    try {
      await api.crearPerfil({ nombre, edad, genero, avatar: { cara, accesorio: null } });
      sessionStorage.setItem("jugadorElegido", "1");
      sonido.exito();
      hablar(`¡Hola, ${nombre}! ¡Empecemos la aventura!`);
      mostrarMapa();
    } catch (err) { toast(err.message, "error"); }
  };
  pintar();
  $("#nombre").focus();
}

function pantallaElegirJugador(perfiles) {
  $("#barra").innerHTML = "";
  $("#app").innerHTML = `
    <h1 class="font-headline-xl-mobile text-headline-xl-mobile sm:font-headline-xl sm:text-headline-xl text-center mt-space-md">¿Quién juega hoy?</h1>
    <div class="flex justify-center gap-space-lg flex-wrap mt-space-xl">
      ${perfiles.map((p) => `
        <button type="button" data-jugador="${esc(p.id)}" class="btn-tactil w-48 rounded-[2.5rem] bg-white shadow-[0_6px_0_0_#dee8ff] p-space-md text-center hover:-translate-y-1 transition-transform">
          ${avatarHTML(p.avatar, "w-28 h-28 text-[64px]")}
          <span class="block font-headline-md text-headline-md mt-2">${esc(p.nombre)}</span>
          <span class="block font-label-lg text-label-lg text-on-surface-variant">⭐ ${p.puntos}</span>
        </button>`).join("")}
      <button type="button" id="nuevo" class="btn-tactil w-48 rounded-[2.5rem] border-4 border-dashed border-surface-container-high p-space-md text-center">
        <span class="block text-[64px] leading-none mt-4">➕</span>
        <span class="block font-headline-sm text-headline-sm mt-4">Nuevo jugador</span>
      </button>
    </div>`;
  $("#app").onclick = async (ev) => {
    const b = ev.target.closest("[data-jugador]");
    if (b) {
      await api.activarPerfil(b.dataset.jugador);
      sessionStorage.setItem("jugadorElegido", "1");
      sonido.tap();
      $("#app").onclick = null;
      mostrarMapa();
    }
    if (ev.target.closest("#nuevo")) { $("#app").onclick = null; pantallaNuevoJugador(false); }
  };
}

async function iniciar() {
  titulo();
  let perfiles;
  try { perfiles = await api.perfiles(); }
  catch (e) { toast(`No se pudo conectar: ${e.message}`, "error"); return; }
  const pidioElegir = new URLSearchParams(location.search).has("elegir");
  if (!perfiles.length) return pantallaNuevoJugador(true);
  if (pidioElegir || (perfiles.length > 1 && !sessionStorage.getItem("jugadorElegido"))) return pantallaElegirJugador(perfiles);
  mostrarMapa();
}

async function mostrarMapa() {
  history.replaceState(null, "", "index.html");
  let perfil, progreso, datos;
  try { [perfil, progreso, datos] = await Promise.all([api.perfil(), api.progreso(), info()]); }
  catch (e) { toast(`No se pudo conectar: ${e.message}`, "error"); return; }
  const bloq = (a) => !datos.areas[a];

  renderBarra($("#barra"), { perfil, progreso, inicio: true });
  const n = esc(perfil.nombre);
  const ganadas = FIGURITAS.filter((f) => progreso.puntos >= f.puntos).length;
  const proxima = FIGURITAS.find((f) => progreso.puntos < f.puntos);
  const metaOk = progreso.hoy >= progreso.metaDiaria;
  const a = progreso.aciertosPorNivel;

  $("#app").innerHTML = `
    <section class="text-center mb-space-lg">
      <h1 class="font-headline-xl-mobile text-headline-xl-mobile sm:font-headline-xl sm:text-headline-xl">¡Hola, ${n}! 👋</h1>
      <p class="font-body-lg text-body-lg text-on-surface-variant mt-1">¿Qué aventura hacemos hoy?</p>
      <button id="btnSaludo" type="button" class="mt-space-sm inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white shadow-sm font-label-lg text-label-lg">🔊 Escuchar</button>
    </section>

    <section class="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
      ${isla({ href: "leer.html", titulo: "Isla de las Letras", emoji: "🏝️", escena: "🦋 📖 ✏️", texto: "Palabras mágicas, frases y cuentos",
        fondo: "bg-[linear-gradient(160deg,#c9e6ff,#89ceff)] text-on-secondary-fixed", nivel: progreso.nivelLectura,
        aciertos: a.lectura[progreso.nivelLectura], necesarios: progreso.aciertosParaSubir, bloqueada: bloq("lectura") })}
      ${isla({ href: "mate.html", titulo: "Montaña de las Cuentas", emoji: "⛰️", escena: "🍎 ➕ 🐰", texto: "Contar, sumar, restar y resolver",
        fondo: "bg-[linear-gradient(160deg,#6ffbbe,#4edea3)] text-on-tertiary-fixed", nivel: progreso.nivelMate,
        aciertos: a.mate[progreso.nivelMate], necesarios: progreso.aciertosParaSubir, bloqueada: bloq("mate") })}
      ${isla({ href: "ingles.html", titulo: "Castillo del Inglés", emoji: "🏰", escena: "🦁 🎨 👋", texto: "Colores, números, animales y días",
        fondo: "bg-[linear-gradient(160deg,#ede9fe,#c4b5fd)] text-[#2e1065]", nivel: progreso.nivelIngles || 1,
        aciertos: a.ingles?.[progreso.nivelIngles || 1] ?? 0, necesarios: progreso.aciertosParaSubir, bloqueada: bloq("ingles") })}
      ${isla({ href: "kiosco.html", titulo: "El Kiosco", emoji: "🏪", escena: "💵 🍭 🛍️", texto: "Comprar y pagar con billetes",
        fondo: "bg-[linear-gradient(160deg,#ffe4e6,#fda4af)] text-[#4c0519]", nivel: progreso.nivelKiosco || 1,
        aciertos: a.kiosco?.[progreso.nivelKiosco || 1] ?? 0, necesarios: progreso.aciertosParaSubir, bloqueada: bloq("kiosco") })}
      ${isla({ href: "multi.html", titulo: "Torre de las Tablas", emoji: "🗼", escena: "✖️ 🃏 🧺", texto: "Multiplicar con grupos y tarjetas",
        fondo: "bg-[linear-gradient(160deg,#ffe0f0,#f9a8d4)] text-[#500724]", nivel: progreso.nivelMulti || 1,
        aciertos: a.multi?.[progreso.nivelMulti || 1] ?? 0, necesarios: progreso.aciertosParaSubir, bloqueada: bloq("multi") })}
      ${isla({ href: "pensar.html", titulo: "Bosque de los Acertijos", emoji: "🌳", escena: "🧠 🔤 🔁", texto: "Juegos para pensar y descubrir",
        fondo: "bg-[linear-gradient(160deg,#dcfce7,#86efac)] text-[#14532d]", nivel: progreso.nivelPensar || 1,
        aciertos: a.pensar?.[progreso.nivelPensar || 1] ?? 0, necesarios: progreso.aciertosParaSubir, bloqueada: bloq("pensar") })}
    </section>

    <section class="grid grid-cols-1 md:grid-cols-2 gap-space-lg mt-space-lg">
      <a href="premios.html" class="btn-tactil rounded-[2rem] p-space-lg bg-[linear-gradient(160deg,#ffddb8,#ffb95f)] text-on-primary-fixed shadow-[0_6px_0_0_rgba(0,0,0,0.12)] flex items-center gap-space-md">
        <span class="text-[72px] leading-none">🎁</span>
        <div>
          <h2 class="font-headline-md text-headline-md">Cofre de premios</h2>
          <p class="font-body-lg text-body-lg">${ganadas} de ${FIGURITAS.length} figuritas</p>
          ${proxima ? `<p class="font-label-md text-label-md mt-1">Próxima: ${proxima.emoji} a ${proxima.puntos - progreso.puntos} ⭐</p>` : `<p class="font-label-md text-label-md">¡Las tenés todas!</p>`}
        </div>
      </a>
      <div class="rounded-[2rem] p-space-lg bg-white shadow-sm flex items-center gap-space-md">
        <span class="text-[72px] leading-none">${metaOk ? "🏅" : "🎯"}</span>
        <div class="flex-1">
          <h2 class="font-headline-md text-headline-md">${metaOk ? "¡Meta de hoy cumplida!" : "Meta de hoy"}</h2>
          <p class="text-[32px] leading-tight mt-1" aria-label="${progreso.hoy} de ${progreso.metaDiaria}">
            ${"🌟".repeat(Math.min(progreso.hoy, progreso.metaDiaria))}${"⚪".repeat(Math.max(0, progreso.metaDiaria - progreso.hoy))}
          </p>
          ${progreso.racha > 1 ? `<p class="font-label-md text-label-md mt-1">🔥 ${progreso.racha} días seguidos</p>` : ""}
        </div>
      </div>
    </section>

    <p class="text-center mt-space-xl">
      <a href="../padres/progreso.html" class="inline-flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant hover:underline">
        <span class="material-symbols-outlined text-[16px]">lock</span>Zona de papás</a>
    </p>`;

  $("#btnSaludo").addEventListener("click", () => {
    sonido.tap();
    hablar(`¡Hola, ${perfil.nombre}! ¿Qué aventura hacemos hoy? Podés ir a la isla de las letras, a la montaña de las cuentas, al castillo del inglés, al kiosco, a la torre de las tablas o al bosque de los acertijos.`);
  });
}

iniciar();
