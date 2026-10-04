import { esc } from "../core/dom.js";
import { api } from "../core/api.js";

export function avatarHTML(avatar, clases = "w-14 h-14 text-[34px]") {
  const a = avatar || { cara: "🧒" };
  return `<span class="relative inline-flex items-center justify-center rounded-full bg-secondary-fixed ${clases}">
    ${esc(a.cara)}
    ${a.accesorio ? `<span class="absolute -top-2 -right-1 text-[0.55em]">${esc(a.accesorio)}</span>` : ""}
  </span>`;
}

/** Barra superior del Modo Niña: avatar, estrellas, racha y meta del día. */
export function renderBarra(el, { perfil, progreso, inicio = false }) {
  const p = progreso || {};
  el.innerHTML = `
  <header class="max-w-[1100px] mx-auto px-margin-mobile sm:px-margin pt-space-md flex items-center justify-between gap-space-sm flex-wrap">
    <div class="flex items-center gap-space-sm">
      ${inicio ? "" : `<a href="index.html" aria-label="Volver al mapa" class="btn-tactil w-14 h-14 rounded-full bg-white shadow-[0_3px_0_0_#d8e3fb] flex items-center justify-center text-[28px]">🏠</a>`}
      <a href="premios.html" class="flex items-center gap-2" aria-label="Mi avatar">
        ${avatarHTML(perfil?.avatar)}
        <span class="font-headline-sm text-headline-sm hidden sm:inline">${esc(perfil?.nombre || "")}</span>
      </a>
      <a id="cambiarJugador" href="index.html?elegir=1" class="hidden px-3 py-2 rounded-full bg-white shadow-sm font-label-md text-label-md" title="Cambiar de jugador">🔄 Cambiar</a>
    </div>
    <div class="flex items-center gap-2 flex-wrap">
      <span class="px-4 py-2 rounded-full bg-white shadow-sm font-headline-sm text-headline-sm flex items-center gap-1.5" title="Estrellas">⭐ <span id="barraPuntos">${p.puntos ?? 0}</span></span>
      <span class="px-4 py-2 rounded-full bg-white shadow-sm font-headline-sm text-headline-sm flex items-center gap-1.5" title="Días seguidos jugando">🔥 ${p.racha ?? 0}</span>
      <span class="px-4 py-2 rounded-full bg-white shadow-sm font-label-lg text-label-lg flex items-center gap-1.5" title="Meta de hoy">🎯 <span id="barraHoy">${p.hoy ?? 0}</span>/${p.metaDiaria ?? 5}</span>
    </div>
  </header>`;
  api.perfiles().then((lista) => lista.length > 1 && el.querySelector("#cambiarJugador")?.classList.remove("hidden")).catch(() => {});
}

export function actualizarBarra(progreso) {
  const pts = document.getElementById("barraPuntos");
  if (pts) { pts.textContent = progreso.puntos; pts.parentElement.classList.add("latido"); setTimeout(() => pts.parentElement.classList.remove("latido"), 1300); }
  const hoy = document.getElementById("barraHoy");
  if (hoy) hoy.textContent = progreso.hoy;
}
