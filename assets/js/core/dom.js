export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

const ENTIDADES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
/** Escapa texto para insertarlo en plantillas HTML (los padres escriben texto libre). */
export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ENTIDADES[c]);

/** Marca un botón como seleccionado dentro de un grupo, alternando clases. */
export function seleccionar(botones, esActivo, clasesOn, clasesOff) {
  const on = clasesOn.split(" "), off = clasesOff.split(" ");
  botones.forEach((b) => {
    const activo = esActivo(b);
    b.classList.remove(...(activo ? off : on));
    b.classList.add(...(activo ? on : off));
    b.setAttribute("aria-pressed", String(activo));
  });
}

export function toast(mensaje, tipo = "ok") {
  let raiz = document.getElementById("toast-root");
  if (!raiz) {
    raiz = document.createElement("div");
    raiz.id = "toast-root";
    raiz.setAttribute("role", "status");
    document.body.append(raiz);
  }
  const el = document.createElement("div");
  el.className = `toast ${tipo === "error" ? "toast-error" : ""}`;
  el.textContent = mensaje;
  raiz.append(el);
  setTimeout(() => el.remove(), 3500);
}
