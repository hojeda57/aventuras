import { esc } from "../core/dom.js";

const TAMANOS = {
  sm: { caja: "w-24 h-11", num: "text-[17px]", chico: "text-[7px]" },
  md: { caja: "w-36 h-16", num: "text-[24px]", chico: "text-[9px]" },
  lg: { caja: "w-56 h-24", num: "text-[38px]", chico: "text-[11px]" },
};

export const pesos = (n) => "$" + Number(n).toLocaleString("es-AR");

/**
 * Un billete: usa la foto subida por los papás, si no la PNG de assets/img/billetes/<valor>.png,
 * y si tampoco existe dibuja uno de colores con el número.
 */
export function billeteHTML(b, { tam = "md", extra = "", atributos = "" } = {}) {
  const t = TAMANOS[tam];
  const src = b.imagen || `../assets/img/billetes/${b.valor}.png`;
  return `<span class="billete relative inline-flex shrink-0 ${t.caja} ${extra}" ${atributos} title="${pesos(b.valor)}">
    <img src="${esc(src)}" alt="Billete de ${b.valor} pesos" draggable="false" class="w-full h-full object-contain drop-shadow-md"
      onerror="this.nextElementSibling.hidden=false;this.remove()">
    <span hidden class="w-full h-full rounded-md p-1 shadow-md" style="background:linear-gradient(135deg, ${esc(b.color || "#90a4ae")}, ${esc(b.color || "#90a4ae")}cc)">
      <span class="w-full h-full rounded-[4px] border-2 border-white/70 flex items-center justify-between px-1.5 text-white">
        <span class="w-[30%] aspect-square rounded-full bg-white/30 flex items-center justify-center font-bold ${t.num}">$</span>
        <span class="flex flex-col items-end leading-none">
          <span class="font-bold ${t.num} drop-shadow">${Number(b.valor).toLocaleString("es-AR")}</span>
          <span class="${t.chico} tracking-widest font-bold">PESOS</span>
        </span>
      </span>
    </span>
  </span>`;
}
