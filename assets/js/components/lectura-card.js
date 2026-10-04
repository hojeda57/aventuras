import { esc } from "../core/dom.js";
import { CELEBRACIONES, NIVELES, TIPOS_LECTURA } from "../core/constantes.js";
import { silabear } from "../utils/silabas.js";

const contarPalabras = (t) => t.trim().split(/\s+/).filter(Boolean).length;

function etiquetaPrincipal(it) {
  if (it.tipo === "palabra") return `${NIVELES[it.nivel].label} · ${silabear(it.texto).length} sílabas`;
  if (it.tipo === "frase") return `Frase · ${contarPalabras(it.texto)} palabras`;
  return `Cuento · ${it.paginas?.length || 0} págs.`;
}

function detalle(it) {
  if (it.tipo === "palabra")
    return `Sílabas: <span class="font-bold text-on-surface">${esc(silabear(it.texto).join(" • "))}</span>`;
  if (it.tipo === "frase" && it.palabrasClave?.length)
    return `Palabras clave: <span class="font-bold text-on-surface">${it.palabrasClave.map(esc).join(" y ")}</span>`;
  if (it.tipo === "cuento") return `<span class="line-clamp-2">${esc(it.paginas?.[0] || "")}</span>`;
  return "";
}

function meta(it) {
  if (it.dominada) return ["check_circle", "text-tertiary", `Leída bien ${it.dominada} veces`];
  if (it.audio) return ["mic", "text-secondary", `Voz grabada${it.autor ? ` de ${it.autor}` : ""}`];
  const c = CELEBRACIONES[it.celebracion] || CELEBRACIONES.globos;
  return ["celebration", "text-primary", `Festejo: ${c.emoji} ${c.label}`];
}

const TEXTO_ESCUCHAR = { palabra: "Escuchar pronunciación", frase: "Escuchar frase", cuento: "Escuchar cuento" };

export function renderLecturaCard(it) {
  const tipo = TIPOS_LECTURA[it.tipo];
  const [icoMeta, colorMeta, textoMeta] = meta(it);
  const titulo = it.tipo === "palabra"
    ? `<h3 class="font-headline-md text-headline-md text-on-surface tracking-wide mb-1">${esc(it.texto)}</h3>`
    : it.tipo === "frase"
      ? `<h3 class="font-headline-sm text-headline-sm text-on-surface mb-2 leading-tight">“${esc(it.texto)}”</h3>`
      : `<h3 class="font-headline-sm text-headline-sm text-on-surface mb-1">${esc(it.texto)}</h3>`;

  const chipDerecho = it.borrador
    ? `<span class="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">Borrador</span>`
    : it.autor
      ? `<span class="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">favorite</span>Creado por ${esc(it.autor)}</span>`
      : it.tipo !== "palabra"
        ? `<span class="px-2 py-0.5 rounded-full ${NIVELES[it.nivel].badge} font-label-sm text-label-sm">${NIVELES[it.nivel].label}</span>`
        : "";

  return `
  <article data-id="${esc(it.id)}" class="bg-surface-container-lowest rounded-lg p-space-md shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between ${it.borrador ? "opacity-70" : ""}">
    <div>
      <div class="flex items-start justify-between gap-2 mb-space-sm">
        <span class="px-2.5 py-1 rounded-full ${tipo.chip} font-label-sm text-label-sm font-bold flex items-center gap-1">
          <span class="material-symbols-outlined text-[14px]">${tipo.icono}</span>${esc(etiquetaPrincipal(it))}
        </span>
        ${chipDerecho}
      </div>
      <div class="w-full h-36 rounded bg-surface-container-low overflow-hidden relative mb-space-sm">
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="w-20 h-20 rounded-full bg-primary-fixed flex items-center justify-center">
            ${it.emoji ? `<span class="text-[52px] leading-none">${esc(it.emoji)}</span>` : `<span class="material-symbols-outlined text-[48px] text-primary">${esc(it.icono || tipo.icono)}</span>`}
          </div>
        </div>
        ${it.imagen ? `<img src="${esc(it.imagen)}" alt="" loading="lazy" class="relative w-full h-full object-cover" onerror="this.remove()">` : ""}
        ${it.categoria ? `<span class="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-surface-container-lowest/90 font-label-sm text-label-sm text-on-surface shadow-sm">${esc(it.categoria)}</span>` : ""}
      </div>
      ${titulo}
      <p class="font-body-sm text-body-sm text-on-surface-variant mb-space-xs">${detalle(it)}</p>
      <p class="flex items-center gap-1.5 text-on-surface-variant font-label-sm text-label-sm mb-space-sm">
        <span class="material-symbols-outlined ${colorMeta} text-[16px]">${icoMeta}</span>${esc(textoMeta)}
      </p>
    </div>
    <div class="pt-space-xs">
      <button type="button" data-accion="escuchar" class="w-full min-h-[44px] py-2 px-3 rounded-full bg-surface-container-low hover:bg-secondary-fixed text-on-surface font-label-sm text-label-sm flex items-center justify-center gap-2 mb-space-xs">
        <span class="material-symbols-outlined text-secondary text-[18px]">${it.audio ? "play_circle" : "volume_up"}</span>${TEXTO_ESCUCHAR[it.tipo]}
      </button>
      <div class="flex items-center justify-between gap-1 pt-space-xs">
        <button type="button" data-accion="ver" title="Ver cómo lo ve al jugar" aria-label="Vista previa"
          class="w-11 h-11 rounded-full hover:bg-secondary-fixed text-secondary flex items-center justify-center">
          <span class="material-symbols-outlined text-[20px]">visibility</span>
        </button>
        <div class="flex items-center gap-1">
          <button type="button" data-accion="editar" class="inline-flex items-center gap-1 px-3 min-h-[44px] rounded-full hover:bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
            <span class="material-symbols-outlined text-[16px]">edit</span>Editar
          </button>
          <button type="button" data-accion="eliminar" title="Eliminar tarjeta" aria-label="Eliminar"
            class="w-11 h-11 rounded-full hover:bg-error-container text-error flex items-center justify-center">
            <span class="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </div>
    </div>
  </article>`;
}
