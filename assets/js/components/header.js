import { esc } from "../core/dom.js";
import { info, titulo } from "../core/app.js";

const NAV = [
  { id: "progreso",    label: (n) => `Progreso de ${n}`,        href: "progreso.html" },
  { id: "lectura",     label: () => "Contenidos de lectura",     href: "lectura.html" },
  { id: "matematicas", label: () => "Contenidos de matemáticas", href: "matematicas.html" },
  { id: "ingles",      label: () => "Inglés",                    href: "ingles.html" },
  { id: "kiosco",      label: () => "Kiosco",                    href: "kiosco.html" },
  { id: "tablas",      label: () => "Tablas",                    href: "tablas.html" },
];

/** Barra superior común de la Zona de Papás. */
export function renderHeader(el, { activo, perfil }) {
  const nombre = perfil?.nombre || "";
  titulo();
  const nav = NAV.map((item) => {
    const esActivo = item.id === activo;
    const base = "px-4 py-1.5 rounded-full font-label-md text-label-md whitespace-nowrap transition-all";
    if (!item.href)
      return `<span class="${base} text-on-surface-variant/50 cursor-not-allowed" title="Próximamente">${esc(item.label(nombre))}</span>`;
    return `<a href="${item.href}" ${esActivo ? 'aria-current="page"' : ""}
      class="${base} ${esActivo
        ? "bg-surface-container-lowest text-on-surface shadow-[0_2px_4px_-1px_rgba(30,41,59,0.06)]"
        : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"}">${esc(item.label(nombre))}</a>`;
  }).join("");

  el.innerHTML = `
  <header class="fixed top-0 left-0 w-full z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
    <div class="h-28 max-w-[1200px] mx-auto px-margin-mobile sm:px-margin flex flex-col justify-between py-space-xs">
      <div class="flex items-center justify-between gap-space-sm">
        <div class="flex items-center gap-space-sm min-w-0">
          <a href="progreso.html" class="flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-[28px]">auto_stories</span>
            <span data-marca class="font-headline-sm text-headline-sm text-primary tracking-tight"></span>
          </a>
          <span class="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-surface-container-high rounded-full text-on-surface-variant font-label-sm text-label-sm">
            <span class="material-symbols-outlined text-[16px] text-primary">lock</span>Zona de papás
          </span>
        </div>
        <div class="flex items-center gap-space-sm">
          <a href="../nina/index.html" class="btn-tactil inline-flex items-center gap-2 px-4 py-2 bg-primary-container text-on-primary-container rounded-full font-label-md text-label-md shadow-[0_3px_0_0_#b45309] hover:bg-primary-fixed">
            <span class="material-symbols-outlined text-[20px]">sports_esports</span><span class="hidden sm:inline">Jugar</span>
          </a>
          <a href="ajustes.html#jugadores" title="Cambiar de chico" class="flex items-center gap-2 px-3 py-1.5 bg-surface-container rounded-full hover:bg-surface-container-high">
            <div class="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center">
              <span class="material-symbols-outlined text-on-secondary-container text-[18px]">face_4</span>
            </div>
            <div class="hidden md:flex flex-col">
              <span class="font-label-sm text-label-sm text-on-surface leading-tight">${esc(nombre)}, ${esc(perfil?.edad ?? "")} años</span>
              <span class="font-label-sm text-label-sm text-secondary font-bold leading-tight">Cambiar ▾</span>
            </div>
          </a>
        </div>
      </div>
      <div class="flex items-center justify-between gap-2">
        <nav aria-label="Secciones" class="flex items-center gap-1 p-1 bg-surface-container-low rounded-full overflow-x-auto no-scrollbar">${nav}</nav>
        <a href="ajustes.html" ${activo === "ajustes" ? 'aria-current="page"' : ""} class="flex items-center gap-1 px-3 py-1.5 rounded-full font-label-md text-label-md ${activo === "ajustes" ? "bg-surface-container-lowest shadow-sm" : "text-on-surface-variant hover:bg-surface-container-high"}" title="Ajustes">
          <span class="material-symbols-outlined text-[20px]">settings</span><span class="hidden md:inline">Ajustes</span>
        </a>
      </div>
    </div>
  </header>`;

  document.querySelectorAll(".js-nombre").forEach((n) => (n.textContent = nombre));
  info().then(({ marca }) => el.querySelectorAll("[data-marca]").forEach((m) => (m.textContent = marca.nombre)));
}
