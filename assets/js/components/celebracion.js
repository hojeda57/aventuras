import { esc } from "../core/dom.js";
import { CELEBRACIONES } from "../core/constantes.js";

const PARTICULAS = {
  globos:    { emojis: ["🎈", "🎈", "🎈", "🎉"], clase: "p-subir" },
  cohetes:   { emojis: ["🚀", "🚀", "✨", "💫"], clase: "p-cohete" },
  estrellas: { emojis: ["⭐", "🌟", "✨", "⭐"], clase: "p-caer" },
  confeti:   { emojis: null, clase: "p-caer" },
};
const COLORES = ["#f59e0b", "#39b8fd", "#30c88f", "#f43f5e", "#8b5cf6", "#ffdd00"];

/** Festejo a pantalla completa. Se cierra solo o tocando. Devuelve una promesa. */
export function celebrar({ tipo = "globos", titulo, subtitulo = "", puntos = 0, extra = "", duracion = 3200 }) {
  return new Promise((resolver) => {
    const conf = PARTICULAS[tipo] || PARTICULAS.globos;
    const capa = document.createElement("div");
    capa.className = "celebracion";
    const n = 26;
    let particulas = "";
    for (let i = 0; i < n; i++) {
      const izq = Math.random() * 100, delay = Math.random() * 1.2, dur = 2.2 + Math.random() * 1.6, tam = 28 + Math.random() * 30;
      const contenido = conf.emojis
        ? conf.emojis[i % conf.emojis.length]
        : `<i style="background:${COLORES[i % COLORES.length]}"></i>`;
      particulas += `<span class="particula ${conf.clase}" style="left:${izq}%;animation-delay:${delay}s;animation-duration:${dur}s;font-size:${tam}px">${contenido}</span>`;
    }
    capa.innerHTML = `${particulas}
      <div class="celebracion-tarjeta" role="alert">
        <div class="text-[72px] leading-none mb-2">${CELEBRACIONES[tipo]?.emoji || "🎉"}</div>
        <p class="font-headline-lg text-headline-lg text-on-surface">${esc(titulo)}</p>
        ${subtitulo ? `<p class="font-body-lg text-body-lg text-on-surface-variant mt-1">${esc(subtitulo)}</p>` : ""}
        ${puntos ? `<p class="mt-3 inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary-fixed text-on-primary-fixed font-headline-sm text-headline-sm">+${puntos} ⭐</p>` : ""}
        ${extra}
      </div>`;
    const cerrar = () => { capa.remove(); resolver(); };
    capa.addEventListener("click", cerrar);
    document.body.append(capa);
    setTimeout(cerrar, duracion);
  });
}
