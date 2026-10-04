// Control común de las pantallas del Modo Niña.
import { api } from "../core/api.js";
import { info, titulo } from "../core/app.js";
import { fijarGenero } from "../core/constantes.js";

const NOMBRES = { lectura: "la Isla de las Letras", mate: "la Montaña de las Cuentas", ingles: "el Castillo del Inglés", kiosco: "el Kiosco" };

/**
 * Si no hay perfil manda al mapa (que pide crearlo). Si el área está bloqueada muestra un aviso
 * (a los chicos nunca se les ofrece comprar nada: eso queda en la Zona de papás).
 * Devuelve true si se puede jugar.
 */
export async function guardiaNina(area) {
  titulo();
  const [perfil, datos] = await Promise.all([api.perfil().catch(() => ({})), info()]);
  if (perfil.sinPerfil) { location.replace("index.html"); return false; }
  fijarGenero(perfil.genero);
  if (area && !datos.areas[area]) {
    document.getElementById("app").innerHTML = `
      <section class="max-w-xl mx-auto text-center bg-white rounded-[2.5rem] shadow-[0_8px_0_0_#dee8ff] p-space-xl mt-space-lg">
        <p class="text-[88px] leading-none">🔒</p>
        <h1 class="font-headline-lg-mobile text-headline-lg-mobile sm:font-headline-lg sm:text-headline-lg mt-space-sm">¡Pronto vas a poder entrar!</h1>
        <p class="font-body-lg text-body-lg text-on-surface-variant mt-2">Para jugar en ${NOMBRES[area]} pedile ayuda a un adulto.</p>
        <a href="index.html" class="btn-tactil inline-block mt-space-lg px-7 py-4 rounded-full bg-primary-container text-on-primary-container font-headline-sm text-headline-sm shadow-[0_4px_0_0_#b45309]">🏠 Volver al mapa</a>
      </section>`;
    return false;
  }
  return true;
}
