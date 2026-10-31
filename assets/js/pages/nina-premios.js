import { api } from "../core/api.js";
import { guardiaNina } from "../components/nina-guardia.js";
import { $, esc, toast } from "../core/dom.js";
import { ACCESORIOS, CARAS_AVATAR, FIGURITAS } from "../core/constantes.js";
import { avatarHTML, renderBarra } from "../components/nina-barra.js";
import { hablar } from "../utils/audio.js";
import { sonido } from "../utils/sonidos.js";

const e = { perfil: null, progreso: null, tab: "figuritas" };
const TABS = { figuritas: "🃏 Figuritas", avatar: "🙂 Mi personaje", diplomas: "📜 Diplomas" };

async function iniciar() {
  if (!(await guardiaNina(null))) return;
  try { [e.perfil, e.progreso] = await Promise.all([api.perfil(), api.progreso()]); }
  catch (err) { toast(`No se pudo conectar: ${err.message}`, "error"); return; }
  render();
}

function render() {
  renderBarra($("#barra"), { perfil: e.perfil, progreso: e.progreso });
  $("#app").innerHTML = `
    <h1 class="font-headline-xl-mobile text-headline-xl-mobile sm:font-headline-xl sm:text-headline-xl text-center">🎁 Cofre de premios</h1>
    <div class="flex justify-center gap-2 my-space-lg flex-wrap" role="tablist">
      ${Object.entries(TABS).map(([k, l]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${e.tab === k}"
        class="btn-tactil px-6 py-3 rounded-full font-headline-sm text-headline-sm shadow-[0_4px_0_0_rgba(0,0,0,0.08)] ${e.tab === k ? "bg-primary-container text-on-primary-container" : "bg-white"}">${l}</button>`).join("")}
    </div>
    <section id="contenido">${({ figuritas, avatar, diplomas })[e.tab]()}</section>`;
  $("#app").onclick = alTocar;
}

function figuritas() {
  const pts = e.progreso.puntos;
  return `<div class="grid grid-cols-3 sm:grid-cols-5 gap-space-md">
    ${FIGURITAS.map((f) => {
      const ok = pts >= f.puntos;
      return `<button type="button" ${ok ? `data-figurita="${esc(f.nombre)}"` : "disabled"}
        class="btn-tactil aspect-[3/4] rounded-[1.5rem] flex flex-col items-center justify-center p-2 shadow-[0_5px_0_0_rgba(0,0,0,0.08)]
        ${ok ? "bg-[linear-gradient(160deg,#fff,#ffddb8)]" : "bg-surface-container"}">
        <span class="text-[56px] sm:text-[64px] leading-none ${ok ? "" : "grayscale opacity-30"}">${ok ? f.emoji : "❓"}</span>
        <span class="font-label-md text-label-md mt-2 text-center">${ok ? esc(f.nombre) : `Faltan ${f.puntos - pts} ⭐`}</span>
      </button>`;
    }).join("")}
  </div>`;
}

function avatar() {
  const pts = e.progreso.puntos, av = e.perfil.avatar || { cara: "🧒", accesorio: null };
  return `
  <div class="bg-white rounded-[2.5rem] p-space-lg shadow-[0_8px_0_0_#dee8ff] text-center">
    <div class="mb-space-lg">${avatarHTML(av, "w-40 h-40 text-[96px]")}</div>
    <h2 class="font-headline-sm text-headline-sm mb-space-sm">Elegí tu personaje</h2>
    <div class="flex flex-wrap justify-center gap-space-sm mb-space-lg">
      ${CARAS_AVATAR.map((c) => `<button type="button" data-cara="${c}" aria-pressed="${av.cara === c}"
        class="btn-tactil w-20 h-20 rounded-full text-[44px] ${av.cara === c ? "bg-secondary-fixed ring-4 ring-secondary" : "bg-surface-container-low"}">${c}</button>`).join("")}
    </div>
    <h2 class="font-headline-sm text-headline-sm mb-space-sm">Accesorios</h2>
    <div class="flex flex-wrap justify-center gap-space-sm">
      <button type="button" data-accesorio="" class="btn-tactil w-20 h-20 rounded-full font-label-md text-label-md ${!av.accesorio ? "bg-secondary-fixed ring-4 ring-secondary" : "bg-surface-container-low"}">Nada</button>
      ${ACCESORIOS.map((a) => {
        const ok = pts >= a.puntos;
        return `<button type="button" ${ok ? `data-accesorio="${a.emoji}"` : "disabled"} title="${ok ? a.nombre : `Se abre con ${a.puntos} ⭐`}"
          class="btn-tactil w-20 h-20 rounded-full flex flex-col items-center justify-center ${av.accesorio === a.emoji ? "bg-secondary-fixed ring-4 ring-secondary" : "bg-surface-container-low"} ${ok ? "" : "opacity-40"}">
          <span class="text-[36px] leading-none">${ok ? a.emoji : "🔒"}</span>${ok ? "" : `<span class="font-label-sm text-label-sm">${a.puntos}⭐</span>`}</button>`;
      }).join("")}
    </div>
  </div>`;
}

function diplomas() {
  const { aciertosPorNivel: a, aciertosParaSubir: meta, nivelLectura, nivelMate, nivelIngles = 1, nivelKiosco = 1, nivelMulti = 1, nivelPensar = 1 } = e.progreso;
  const tarjeta = (area, titulo, emoji, nivelActual) => [1, 2, 3].map((n) => {
    const logrado = nivelActual > n || (n === 3 && a[area]["3"] >= meta);
    const avance = n < nivelActual ? meta : n === nivelActual ? Math.min(a[area][n], meta) : 0;
    return `<div class="rounded-[2rem] p-space-md text-center border-4 ${logrado ? "border-primary-container bg-[linear-gradient(160deg,#fff,#fff3df)]" : "border-dashed border-surface-container-high bg-white/60"}">
      <p class="text-[56px] leading-none ${logrado ? "" : "grayscale opacity-30"}">${logrado ? "🏅" : emoji}</p>
      <p class="font-headline-sm text-headline-sm mt-1">${titulo} · Nivel ${n}</p>
      ${logrado ? `<p class="font-body-md text-body-md">Otorgado a ${esc(e.perfil.nombre)} ⭐</p>`
        : `<p class="font-label-md text-label-md text-on-surface-variant">${avance} de ${meta} aciertos</p>`}
    </div>`;
  }).join("");
  return `<div class="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
    ${tarjeta("lectura", "Lectura", "📖", nivelLectura)}${tarjeta("mate", "Números", "🔢", nivelMate)}${tarjeta("ingles", "Inglés", "🏰", nivelIngles)}${tarjeta("kiosco", "Kiosco", "🏪", nivelKiosco)}${tarjeta("multi", "Tablas", "🗼", nivelMulti)}${tarjeta("pensar", "Acertijos", "🧠", nivelPensar)}
  </div>`;
}

async function guardarAvatar(cambios) {
  const avatar = { ...(e.perfil.avatar || {}), ...cambios };
  try {
    e.perfil = await api.actualizarPerfil({ avatar });
    sonido.exito();
    render();
  } catch (err) { toast(err.message, "error"); }
}

function alTocar(ev) {
  const tab = ev.target.closest("[data-tab]");
  if (tab) { sonido.tap(); e.tab = tab.dataset.tab; return render(); }
  const fig = ev.target.closest("[data-figurita]");
  if (fig) { sonido.pagina(); hablar(fig.dataset.figurita); fig.classList.add("latido"); setTimeout(() => fig.classList.remove("latido"), 1200); return; }
  const cara = ev.target.closest("[data-cara]");
  if (cara) return guardarAvatar({ cara: cara.dataset.cara });
  const acc = ev.target.closest("[data-accesorio]");
  if (acc) return guardarAvatar({ accesorio: acc.dataset.accesorio || null });
}

iniciar();
