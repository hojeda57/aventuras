import { api } from "../core/api.js";
import { esc, toast } from "../core/dom.js";

// Paleta de emojis frecuentes (en Windows escribir emojis es incómodo; también sirve Win + .)
const PALETA = [
  "🐶","🐱","🐰","🐻","🐼","🦁","🐯","🐮","🐷","🐸","🐵","🐔","🐧","🐦","🦆","🦉","🐴","🦄","🐝","🦋","🐢","🐍","🐟","🐬",
  "🍎","🍌","🍓","🍇","🍉","🍊","🥕","🌽","🍞","🧀","🥚","🍕","🍔","🍟","🍦","🍩","🍪","🍫","🍬","🍭","🧃","🥛","🥤","💧",
  "⚽","🏀","🎈","🎁","🧸","🪁","🚗","🚌","🚲","✈️","🚀","🏠","🏫","🌳","🌸","☀️","🌙","⭐","🌈","❤️","✏️","📒","📖","🎒",
];

/** Muestra un dibujo: la imagen subida si hay, si no el emoji. */
export function dibujoHTML(item, { clases = "text-[48px]", tamImg = "w-14 h-14", defecto = "🔤" } = {}) {
  const emoji = `<span class="leading-none ${clases}">${esc(item.emoji || defecto)}</span>`;
  if (!item.imagen) return emoji;
  return `<img src="${esc(item.imagen)}" alt="${esc(item.nombre || item.en || "")}" class="${tamImg} object-contain rounded-[0.75rem]"
    onerror="this.nextElementSibling.hidden=false;this.remove()"><span hidden>${emoji}</span>`;
}

/** Campo para elegir el dibujo: emoji escrito, paleta o imagen subida. Va dentro de un <form>. */
export function selectorDibujoHTML({ emoji = "", imagen = "" } = {}, placeholder = "🐰") {
  return `
  <div class="selector-dibujo space-y-2">
    <span class="block font-label-sm text-label-sm text-on-surface-variant">Dibujo: emoji o imagen</span>
    <div class="flex items-center gap-2">
      <div data-vista class="w-16 h-16 shrink-0 rounded-[1rem] bg-surface-container-low flex items-center justify-center overflow-hidden">
        ${imagen ? `<img src="${esc(imagen)}" alt="" class="w-full h-full object-contain">` : `<span class="text-[34px] leading-none">${esc(emoji || placeholder)}</span>`}
      </div>
      <div class="flex-1 grid grid-cols-2 gap-1.5">
        <input name="emoji" maxlength="8" value="${esc(emoji)}" placeholder="${esc(placeholder)}" aria-label="Emoji"
          class="col-span-2 min-h-[40px] px-3 rounded bg-surface-container-low text-center text-[22px] ${imagen ? "opacity-40" : ""}">
        <button type="button" data-dibujo="paleta" class="min-h-[36px] rounded-full bg-surface-container font-label-sm text-label-sm">😀 Elegir</button>
        <button type="button" data-dibujo="subir" class="min-h-[36px] rounded-full bg-surface-container font-label-sm text-label-sm">🖼️ Imagen</button>
      </div>
    </div>
    <input type="hidden" name="imagen" value="${esc(imagen)}">
    <input type="file" data-dibujo-archivo accept="image/png,image/jpeg,image/webp,image/gif" class="hidden">
    <button type="button" data-dibujo="quitar" class="${imagen ? "" : "hidden"} font-label-sm text-label-sm text-error hover:underline">Quitar imagen y usar emoji</button>
    <div data-paleta class="hidden grid grid-cols-8 gap-1 p-2 rounded-[1rem] bg-surface-container-low max-h-48 overflow-y-auto">
      ${PALETA.map((e) => `<button type="button" data-emoji="${e}" class="aspect-square rounded-[0.5rem] hover:bg-white text-[22px]">${e}</button>`).join("")}
    </div>
  </div>`;
}

/** Conecta los botones del selector. Llamar después de pintar el formulario. */
export function enlazarSelectorDibujo(form) {
  const caja = form.querySelector(".selector-dibujo");
  if (!caja) return;
  const $ = (s) => caja.querySelector(s);
  const pintar = () => {
    const img = $('[name="imagen"]').value, emo = $('[name="emoji"]').value.trim();
    $("[data-vista]").innerHTML = img
      ? `<img src="${esc(img)}" alt="" class="w-full h-full object-contain">`
      : `<span class="text-[34px] leading-none">${esc(emo || $('[name="emoji"]').placeholder)}</span>`;
    $('[name="emoji"]').classList.toggle("opacity-40", Boolean(img));
    $('[data-dibujo="quitar"]').classList.toggle("hidden", !img);
  };
  $('[name="emoji"]').addEventListener("input", () => { $('[name="imagen"]').value = ""; pintar(); });
  caja.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-dibujo],[data-emoji]");
    if (!b) return;
    if (b.dataset.emoji) {
      $('[name="emoji"]').value = b.dataset.emoji; $('[name="imagen"]').value = "";
      $("[data-paleta]").classList.add("hidden"); pintar();
    } else if (b.dataset.dibujo === "paleta") $("[data-paleta]").classList.toggle("hidden");
    else if (b.dataset.dibujo === "subir") $("[data-dibujo-archivo]").click();
    else if (b.dataset.dibujo === "quitar") { $('[name="imagen"]').value = ""; pintar(); }
  });
  $("[data-dibujo-archivo]").addEventListener("change", async (ev) => {
    const archivo = ev.target.files[0];
    ev.target.value = "";
    if (!archivo) return;
    try {
      $('[name="imagen"]').value = await api.subir(archivo);
      pintar();
      toast("Imagen cargada");
    } catch (err) { toast(err.message, "error"); }
  });
}
