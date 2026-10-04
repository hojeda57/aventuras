// Información de la app (edición, marca, licencia) compartida por todas las páginas.
import { api } from "./api.js";

let cache = null;
const RESPALDO = { edicion: "familiar", marca: { nombre: "Aventuras", corto: "Aventuras" }, areas: { lectura: true, mate: true, ingles: true, kiosco: true }, licencia: { activa: true } };

export function info() {
  cache ??= api.info().catch(() => RESPALDO);
  return cache;
}

/** Pone "<página> · <marca>" como título de la pestaña o ventana. */
export async function titulo() {
  const { marca } = await info();
  const pagina = document.title.trim();
  if (!pagina.includes(marca.nombre)) document.title = pagina ? `${pagina} · ${marca.nombre}` : marca.nombre;
}

/** Reemplaza {nombre} en los textos por el nombre del chico que está jugando. */
export const personalizar = (texto, nombre) =>
  typeof texto === "string" ? texto.replaceAll("{nombre}", nombre || "") : texto;
