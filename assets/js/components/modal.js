import { esc } from "../core/dom.js";

function alPresionarTecla(e) { if (e.key === "Escape") cerrarModal(); }

export function abrirModal(html, { titulo = "Vista previa" } = {}) {
  cerrarModal();
  const fondo = document.createElement("div");
  fondo.id = "modal";
  fondo.className = "fixed inset-0 z-[90] flex items-center justify-center p-4 bg-[rgba(15,23,42,0.4)] backdrop-blur-sm";
  fondo.innerHTML = `
    <div role="dialog" aria-modal="true" aria-label="${esc(titulo)}"
         class="relative w-full max-w-xl bg-surface-container-lowest rounded-lg p-space-lg shadow-[0_20px_25px_-5px_rgba(30,41,59,0.12)]">
      <button type="button" data-cerrar aria-label="Cerrar"
        class="absolute top-3 right-3 w-11 h-11 rounded-full hover:bg-surface-container-high flex items-center justify-center">
        <span class="material-symbols-outlined">close</span>
      </button>
      <div data-contenido>${html}</div>
    </div>`;
  fondo.addEventListener("click", (e) => {
    if (e.target === fondo || e.target.closest("[data-cerrar]")) cerrarModal();
  });
  document.addEventListener("keydown", alPresionarTecla);
  document.body.append(fondo);
  fondo.querySelector("[data-cerrar]").focus();
  return fondo.querySelector("[data-contenido]");
}

export function cerrarModal() {
  document.getElementById("modal")?.remove();
  document.removeEventListener("keydown", alPresionarTecla);
}
