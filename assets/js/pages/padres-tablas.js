import { api } from "../core/api.js";
import { $, esc, toast } from "../core/dom.js";
import { renderHeader } from "../components/header.js";
import { renderFooter } from "../components/footer.js";
import { exigirAdulto } from "../components/gate-padres.js";

const e = { perfil: null, tablas: [] };

async function iniciar() {
  await exigirAdulto();
  try { [e.perfil, e.tablas] = await Promise.all([api.perfil(), api.listar("tablas")]); }
  catch (err) { toast(`No se pudo conectar con el servidor: ${err.message}`, "error"); return; }
  e.tablas.sort((a, b) => a.tabla - b.tabla);
  renderHeader($("#app-header"), { activo: "tablas", perfil: e.perfil });
  renderFooter($("#app-footer"));
  render();
}

function render() {
  $("#app").innerHTML = `
    <section class="mt-space-md rounded-lg bg-[linear-gradient(160deg,#ffe0f0,#f9f9ff)] p-space-lg shadow-sm">
      <h1 class="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg">🗼 Tablas de multiplicar</h1>
      <p class="text-on-surface-variant max-w-3xl">Elegí qué tablas practica y el dibujo de cada una. Los niveles usan:
        <b>N1</b> grupos iguales con las tablas del 1, 2, 5 y 10 · <b>N2</b> tarjetas con las del 2 al 5 y el 10 ·
        <b>N3</b> todas, con "¿qué número falta?" y problemas. Si una tabla está apagada, no aparece en ningún nivel.</p>
    </section>
    <section class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-space-md">
      ${e.tablas.map((t) => `
        <article data-id="${esc(t.id)}" class="rounded-lg p-space-md bg-surface-container-lowest shadow-sm text-center border-4 ${t.activo !== false ? "" : "opacity-50"}" style="border-color:${esc(t.color)}">
          <div class="text-[44px] leading-none">${esc(t.emoji)}</div>
          <p class="font-headline-sm text-headline-sm mt-1">Tabla del ${t.tabla}</p>
          <p class="font-label-sm text-label-sm text-on-surface-variant">${t.dominada ? `✓ ${t.dominada} aciertos` : "Sin practicar"}</p>
          <label class="flex items-center justify-center gap-2 mt-2 font-label-md text-label-md cursor-pointer">
            <input type="checkbox" data-campo="activo" ${t.activo !== false ? "checked" : ""} class="w-5 h-5"> En el juego</label>
          <div class="flex items-center justify-center gap-2 mt-2">
            <input data-campo="emoji" value="${esc(t.emoji)}" maxlength="8" aria-label="Dibujo" class="w-14 min-h-[40px] text-center text-[22px] rounded bg-surface-container-low">
            <input data-campo="color" type="color" value="${esc(t.color)}" aria-label="Color" class="w-12 h-10 rounded">
          </div>
        </article>`).join("")}
    </section>`;
  $("#app").onchange = async (ev) => {
    const campo = ev.target.dataset.campo;
    if (!campo) return;
    const t = e.tablas.find((x) => x.id === ev.target.closest("[data-id]").dataset.id);
    const valor = campo === "activo" ? ev.target.checked : ev.target.value.trim() || t[campo];
    if (campo === "activo" && !valor && e.tablas.filter((x) => x.activo !== false).length <= 1) {
      ev.target.checked = true; return toast("Tiene que quedar al menos una tabla activa.", "error");
    }
    try {
      const act = await api.actualizar("tablas", t.id, { [campo]: valor });
      Object.assign(t, act);
      render();
      toast(`Tabla del ${t.tabla} guardada`);
    } catch (err) { toast(err.message, "error"); }
  };
}

iniciar();
