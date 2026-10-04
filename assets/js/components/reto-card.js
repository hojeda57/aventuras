import { esc } from "../core/dom.js";
import { CELEBRACIONES, NIVELES, OPERACIONES } from "../core/constantes.js";
import { nivelDe, repetir, resultado } from "../utils/mate.js";

const grupo = (contenido, n, extra = "") => `
  <div class="flex items-center gap-1 px-3 py-2 bg-surface-container-lowest rounded-full">
    <span class="text-xl leading-none break-all ${extra}">${contenido}</span>
    <span class="font-label-md text-label-md text-on-surface font-bold ml-1">${n}</span>
  </div>`;

/** Visualización de la operación con objetos (se reutiliza en la simulación). */
export function visualOperacion(r, { mostrarResultado = false } = {}) {
  const op = OPERACIONES[r.operacion];
  const res = mostrarResultado ? resultado(r) : "?";
  const signo = (s, c) => `<span class="font-headline-sm text-headline-sm font-bold ${c}">${s}</span>`;
  let partes;
  if (r.operacion === "suma")
    partes = [grupo(repetir(r.objeto, r.a), r.a), signo("+", op.color), grupo(repetir(r.objetoB || r.objeto, r.b), r.b)];
  else if (r.operacion === "resta")
    partes = [grupo(repetir(r.objeto, r.a), r.a), signo("−", op.color), grupo(repetir(r.objeto, r.b), r.b, "opacity-40 line-through")];
  else partes = [grupo(repetir(r.objeto, r.a), "")];
  return `<div class="flex items-center flex-wrap gap-2">
    ${partes.join("")} ${signo("=", "text-secondary")}
    <div class="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center font-headline-sm text-headline-sm text-on-secondary-fixed">${res}</div>
  </div>`;
}

export function renderRetoCard(r, { reordenando = false, esPrimero = false, esUltimo = false } = {}) {
  const niv = NIVELES[nivelDe(r)];
  const op = OPERACIONES[r.operacion];
  const cel = CELEBRACIONES[r.celebracion] || CELEBRACIONES.globos;
  const descripcion = r.enunciado
    ? `“${esc(r.enunciado)}”`
    : r.operacion === "contar" ? `Contar ${r.a} objetos` : `${r.a} ${op.simbolo} ${r.b} con objetos`;

  const flechas = reordenando ? `
    <div class="flex flex-col">
      <button type="button" data-accion="subir" ${esPrimero ? "disabled" : ""} aria-label="Subir" class="w-9 h-9 rounded-full hover:bg-surface-container-high disabled:opacity-30 flex items-center justify-center"><span class="material-symbols-outlined">keyboard_arrow_up</span></button>
      <button type="button" data-accion="bajar" ${esUltimo ? "disabled" : ""} aria-label="Bajar" class="w-9 h-9 rounded-full hover:bg-surface-container-high disabled:opacity-30 flex items-center justify-center"><span class="material-symbols-outlined">keyboard_arrow_down</span></button>
    </div>` : "";

  return `
  <article data-id="${esc(r.id)}" class="bg-surface-container-lowest rounded-lg p-space-md shadow-sm hover:shadow-md transition-shadow ${r.activo ? "" : "opacity-50"}">
    <div class="flex items-start justify-between gap-space-sm mb-3">
      <div class="flex items-center gap-3 min-w-0">
        ${flechas}
        <div class="w-12 h-12 shrink-0 rounded-full bg-surface-container-high flex items-center justify-center text-[24px]">${esc(r.objeto)}</div>
        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h3 class="font-headline-sm text-headline-sm text-on-surface">${esc(r.titulo)}</h3>
            <span class="px-2.5 py-0.5 rounded-full ${niv.badge} font-label-sm text-label-sm">${op.label} · ${niv.label}</span>
            ${r.autor ? `<span class="px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm">Creado por ${esc(r.autor)}</span>` : ""}
            ${r.activo ? "" : `<span class="px-2.5 py-0.5 rounded-full bg-surface-container-high font-label-sm text-label-sm">Oculto en el juego</span>`}
          </div>
          <p class="font-body-sm text-body-sm text-on-surface-variant">${descripcion}</p>
        </div>
      </div>
      <span class="shrink-0 px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm flex items-center gap-1">
        <span class="material-symbols-outlined text-[14px]">star</span>+${esc(r.puntos)} pts
      </span>
    </div>
    <div class="bg-surface-container-low rounded p-3 mb-3 flex items-center justify-between flex-wrap gap-2">
      ${visualOperacion(r)}
      <span class="font-label-sm text-label-sm text-on-surface-variant">Festejo: ${cel.emoji} ${cel.label}</span>
    </div>
    <div class="flex items-center justify-between flex-wrap gap-2 pt-1">
      <div class="flex items-center gap-2 flex-wrap">
        <button type="button" data-accion="editar" class="inline-flex items-center gap-1.5 px-3 min-h-[40px] bg-surface-container rounded-full font-label-sm text-label-sm hover:bg-surface-container-high">
          <span class="material-symbols-outlined text-[16px] text-secondary">edit</span>Editar
        </button>
        <button type="button" data-accion="simular" class="inline-flex items-center gap-1.5 px-3 min-h-[40px] bg-surface-container rounded-full font-label-sm text-label-sm hover:bg-surface-container-high">
          <span class="material-symbols-outlined text-[16px] text-tertiary">visibility</span>Ver simulación
        </button>
        ${r.superado ? `<span class="font-label-sm text-label-sm text-tertiary flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">check_circle</span>Superado ${esc(r.superado)} veces</span>` : ""}
      </div>
      <div class="flex items-center gap-1">
        ${r.audio ? `<button type="button" data-accion="escuchar" title="Escuchar mensaje" aria-label="Escuchar mensaje" class="w-10 h-10 rounded-full text-secondary hover:bg-secondary-fixed flex items-center justify-center"><span class="material-symbols-outlined text-[18px]">volume_up</span></button>` : ""}
        <button type="button" data-accion="duplicar" title="Duplicar" aria-label="Duplicar" class="w-10 h-10 rounded-full text-on-surface-variant hover:bg-surface-container-high flex items-center justify-center"><span class="material-symbols-outlined text-[18px]">content_copy</span></button>
        <button type="button" data-accion="alternar" title="${r.activo ? "Ocultar en el juego" : "Mostrar en el juego"}" aria-label="${r.activo ? "Ocultar" : "Mostrar"}" class="w-10 h-10 rounded-full text-on-surface-variant hover:bg-surface-container-high flex items-center justify-center"><span class="material-symbols-outlined text-[18px]">${r.activo ? "visibility_off" : "visibility"}</span></button>
        <button type="button" data-accion="eliminar" title="Eliminar" aria-label="Eliminar" class="w-10 h-10 rounded-full text-error hover:bg-error-container flex items-center justify-center"><span class="material-symbols-outlined text-[18px]">delete</span></button>
      </div>
    </div>
  </article>`;
}
