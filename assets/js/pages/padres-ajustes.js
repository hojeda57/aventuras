import { api } from "../core/api.js";
import { $, esc, toast } from "../core/dom.js";
import { info } from "../core/app.js";
import { renderHeader } from "../components/header.js";
import { renderFooter } from "../components/footer.js";
import { exigirAdulto } from "../components/gate-padres.js";
import { avatarHTML } from "../components/nina-barra.js";

const e = { perfil: null, perfiles: [], info: null };

async function iniciar() {
  await exigirAdulto();
  try {
    [e.perfil, e.perfiles, e.info] = await Promise.all([api.perfil(), api.perfiles(), api.info()]);
  } catch (err) { toast(`No se pudo conectar con el servidor: ${err.message}`, "error"); return; }
  renderHeader($("#app-header"), { activo: "ajustes", perfil: e.perfil });
  renderFooter($("#app-footer"));
  render();
  if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
}

const tarjeta = (id, titulo, contenido) => `
  <section id="${id}" class="bg-surface-container-lowest rounded-lg p-space-md md:p-space-lg shadow-sm scroll-mt-32">
    <h2 class="font-headline-sm text-headline-sm mb-space-sm">${titulo}</h2>${contenido}
  </section>`;

function seccionJugadores() {
  return tarjeta("jugadores", "👧🧒 Jugadores", `
    <p class="text-on-surface-variant mb-space-md">Cada chico tiene su propio avatar, estrellas, niveles y progreso. Los contenidos (palabras, ejercicios, productos) son compartidos.</p>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-md">
      ${e.perfiles.map((p) => `
        <article data-id="${esc(p.id)}" class="rounded-lg p-space-md border-2 ${p.activo ? "border-secondary bg-secondary-fixed/30" : "border-surface-container-high"} flex items-center gap-space-sm">
          ${avatarHTML(p.avatar, "w-14 h-14 text-[32px]")}
          <div class="flex-1 min-w-0">
            <p class="font-headline-sm text-headline-sm truncate">${esc(p.nombre)}</p>
            <p class="font-body-sm text-body-sm text-on-surface-variant">${p.edad ? `${esc(p.edad)} años · ` : ""}⭐ ${p.puntos}</p>
          </div>
          <div class="flex flex-col gap-1">
            ${p.activo ? `<span class="px-2 py-0.5 rounded-full bg-secondary text-on-secondary font-label-sm text-label-sm text-center">Activo</span>`
              : `<button type="button" data-accion="activar" class="px-3 min-h-[32px] rounded-full bg-surface-container font-label-sm text-label-sm">Elegir</button>`}
            <button type="button" data-accion="eliminar" class="px-3 min-h-[32px] rounded-full text-error hover:bg-error-container font-label-sm text-label-sm">Eliminar</button>
          </div>
        </article>`).join("") || `<p class="text-on-surface-variant">Todavía no hay jugadores.</p>`}
    </div>
    <form id="formJugador" class="mt-space-md flex flex-wrap items-end gap-2">
      <label class="font-label-sm text-label-sm text-on-surface-variant">Nombre
        <input name="nombre" required maxlength="20" class="block mt-1 min-h-[44px] px-3 rounded bg-surface-container-low text-on-surface font-body-md"></label>
      <label class="font-label-sm text-label-sm text-on-surface-variant">Edad
        <input name="edad" type="number" min="3" max="12" value="6" class="block mt-1 w-20 min-h-[44px] px-3 rounded bg-surface-container-low text-on-surface font-body-md"></label>
      <label class="font-label-sm text-label-sm text-on-surface-variant">Elogios para
        <select name="genero" class="block mt-1 min-h-[44px] px-3 rounded bg-surface-container-low text-on-surface font-body-md"><option value="a">nena (genia)</option><option value="o">nene (genio)</option></select></label>
      <button class="min-h-[44px] px-5 rounded-full bg-primary-container text-on-primary-container font-label-lg text-label-lg">➕ Agregar jugador</button>
    </form>
    <p class="font-body-sm text-body-sm text-on-surface-variant mt-2">El nombre, la edad y la meta diaria del jugador activo se cambian en <a href="progreso.html#config" class="underline">Progreso</a>.</p>`);
}

function seccionLicencia() {
  const { edicion, licencia, marca, gratis } = e.info;
  if (edicion !== "comercial")
    return tarjeta("licencia", "⭐ Versión", `<p>Edición familiar: todas las aventuras incluidas.</p>`);
  if (licencia.activa)
    return tarjeta("licencia", "⭐ Versión completa", `
      <p class="text-[18px]">✅ Activada${licencia.titular ? ` para <b>${esc(licencia.titular)}</b>` : ""}. ¡Gracias por tu compra!</p>`);
  const nombres = { lectura: "Lectura", mate: "Matemáticas", ingles: "Inglés", kiosco: "Kiosco" };
  const libres = gratis.map((a) => nombres[a]).join(" y ");
  const pagas = Object.keys(nombres).filter((a) => !gratis.includes(a)).map((a) => nombres[a]).join(" y ");
  return tarjeta("licencia", "⭐ Versión completa", `
    <p class="mb-space-sm">Estás usando la versión gratuita: <b>${libres}</b> están incluidas. La versión completa suma <b>${pagas}</b>, para todos los chicos de la casa.</p>
    ${marca.sitio ? `<a href="${esc(marca.sitio)}" target="_blank" rel="noopener" class="inline-flex items-center gap-2 px-5 min-h-[44px] rounded-full bg-[#f43f5e] text-white font-label-lg text-label-lg mb-space-md">🛒 Conseguir la versión completa</a>` : ""}
    <form id="formLicencia" class="space-y-2">
      <label class="block font-label-sm text-label-sm text-on-surface-variant">¿Ya tenés tu clave? Pegala acá:
        <textarea name="clave" rows="3" spellcheck="false" placeholder="eyJ0Ijoi…" class="mt-1 w-full p-space-sm rounded bg-surface-container-low text-on-surface font-mono text-[13px] break-all"></textarea></label>
      <button class="min-h-[44px] px-5 rounded-full bg-tertiary text-on-tertiary font-label-lg text-label-lg">Activar</button>
    </form>`);
}

function seccionPrivacidad() {
  const { marca, version, edicion } = e.info;
  return tarjeta("privacidad", "🔒 Privacidad", `
    <ul class="list-disc pl-5 space-y-1 text-on-surface-variant">
      <li>Todo se guarda <b>en esta computadora</b>: no hay cuentas, no se envían datos a ningún servidor nuestro.</li>
      <li>No hay publicidad ni seguimiento.</li>
      <li>Al usar el micrófono para leer en voz alta, el navegador (Edge o Chrome) procesa la voz con el servicio de Microsoft o Google. Si preferís no usarlo, un adulto puede tocar "Lo leyó bien".</li>
      <li>Las fotos y voces que grabes quedan sólo en esta computadora.</li>
    </ul>
    <p class="mt-space-sm"><a href="../legal/privacidad.html" class="underline">Política de privacidad</a> · <a href="../legal/terminos.html" class="underline">Términos de uso</a></p>
    ${marca.email ? `<p class="mt-space-md"><a href="mailto:${esc(marca.email)}?subject=${encodeURIComponent(`Opinión sobre ${marca.nombre}`)}" class="inline-flex items-center gap-2 px-5 min-h-[44px] rounded-full bg-surface-container font-label-lg text-label-lg">💌 Enviar una opinión o sugerencia</a></p>` : ""}
    <p class="mt-space-md font-body-sm text-body-sm text-on-surface-variant">${esc(marca.nombre)} · versión ${esc(version)} · edición ${esc(edicion)}</p>`);
}

function render() {
  $("#app").innerHTML = `<div class="mt-space-md space-y-space-lg">${seccionJugadores()}${seccionLicencia()}${seccionPrivacidad()}</div>`;
  $("#formJugador").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const f = new FormData(ev.target);
    try {
      await api.crearPerfil({ nombre: f.get("nombre").trim(), edad: Number(f.get("edad")), genero: f.get("genero"), avatar: { cara: f.get("genero") === "o" ? "👦" : "👧", accesorio: null } });
      location.reload();
    } catch (err) { toast(err.message, "error"); }
  });
  $("#formLicencia")?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    try {
      e.info = await api.activarLicencia(new FormData(ev.target).get("clave"));
      render();
      toast("¡Versión completa activada!");
    } catch (err) { toast(err.message, "error"); }
  });
  $("#jugadores").addEventListener("click", async (ev) => {
    const b = ev.target.closest("[data-accion]");
    if (!b) return;
    const p = e.perfiles.find((x) => x.id === b.closest("[data-id]").dataset.id);
    try {
      if (b.dataset.accion === "activar") { await api.activarPerfil(p.id); location.reload(); }
      if (b.dataset.accion === "eliminar") {
        const escrito = prompt(`Se va a borrar todo el progreso de ${p.nombre}. Para confirmar, escribí su nombre:`);
        if (escrito?.trim().toLowerCase() !== p.nombre.toLowerCase()) return toast("No se eliminó.");
        await api.eliminarPerfil(p.id);
        location.reload();
      }
    } catch (err) { toast(err.message, "error"); }
  });
}

iniciar();
