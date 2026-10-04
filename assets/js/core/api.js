// Punto de entrada único de los datos. Según el modo usa el servidor (Windows) o el dispositivo (web/móvil).
import { MODO } from "../modo.js";

const impl = MODO === "local" ? await import("./api-local.js") : await import("./api-servidor.js");
export const api = impl.api;
export const modoLocal = MODO === "local";
