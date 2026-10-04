import { api } from "../core/api.js";
import { $, $$, esc, toast } from "../core/dom.js";
import { CATEGORIAS_INGLES } from "../core/constantes.js";
import { renderHeader } from "../components/header.js";
import { renderFooter } from "../components/footer.js";
import { exigirAdulto } from "../components/gate-padres.js";
import { hablarIngles } from "../utils/audio.js";
import { dibujoHTML, enlazarSelectorDibujo, selectorDibujoHTML } from "../components/dibujo.js";

const COL = "ingles";
const e = { perfil: null, vocab: [], filtro: "todas", editandoId: null };

async function iniciar() {
  await exigirAdulto();
  try { [e.perfil, e.vocab] = await Promise.all([api.perfil(), api.listar(COL)]); }
  catch (err) { toast(`No se pudo conectar con el servidor: ${err.message}`, "error"); return; }
  renderHeader($("#app-header"), { activo: "ingles", perfil: e.perfil });
  renderFooter($("#app-footer"));
  render();
}

function miniVisual(v) {
  if (v.categoria === "numeros" && v.orden) return `<span class="text-[40px] font-bold text-secondary leading-none">${v.orden}</span>`;
  if (v.color) return `<span class="inline-block w-12 h-12 rounded-full ring-2 ring-surface-container-high" style="background:${esc(v.color)}"></span>`;
  return dibujoHTML(v, { clases: "text-[40px]", tamImg: "w-14 h-14" });
}

function render() {
  const lista = e.vocab.filter((v) => e.filtro === "todas" || v.categoria === e.filtro);
  const tabs = [["todas", "Todas", e.vocab.length], ...Object.entries(CATEGORIAS_INGLES).map(([k, c]) => [k, `${c.emoji} ${c.titulo}`, e.vocab.filter((v) => v.categoria === k).length])];
  const editando = e.vocab.find((v) => v.id === e.editandoId);

  $("#app").innerHTML = `
    <section class="mt-space-md rounded-lg bg-[linear-gradient(160deg,#ede9fe,#f9f9ff)] p-space-lg shadow-sm">
      <h1 class="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg">🏰 Palabras de inglés</h1>
      <p class="text-on-surface-variant max-w-2xl">Sumá las palabras que ve en la escuela. Cada una aparece sola en sus juegos: escuchar y elegir, ¿cómo se dice?, completar letras y, en los días, "¿qué día viene después?".</p>
    </section>

    <div class="flex items-center gap-1.5 p-1 bg-surface-container-low rounded-full overflow-x-auto no-scrollbar">
      ${tabs.map(([k, l, n]) => `<button type="button" data-filtro="${k}" aria-pressed="${e.filtro === k}"
        class="px-4 py-2 rounded-full font-label-md text-label-md whitespace-nowrap flex items-center gap-2 ${e.filtro === k ? "bg-surface-container-lowest shadow-sm" : "text-on-surface-variant hover:bg-surface-container-high"}">
        ${l}<span class="px-2 py-0.5 rounded-full bg-surface-container-high font-label-sm text-label-sm">${n}</span></button>`).join("")}
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
      <section class="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-space-md">
        ${lista.map((v) => `
          <article data-id="${esc(v.id)}" class="bg-surface-container-lowest rounded-lg p-space-md shadow-sm text-center flex flex-col items-center gap-1">
            <div class="h-14 flex items-center">${miniVisual(v)}</div>
            <p class="font-headline-sm text-headline-sm">${esc(v.en)}</p>
            <p class="font-body-sm text-body-sm text-on-surface-variant">${esc(v.es)}</p>
            ${v.dominada ? `<p class="font-label-sm text-label-sm text-tertiary">✓ ${v.dominada} aciertos</p>` : ""}
            <div class="flex items-center gap-1 mt-1">
              <button type="button" data-accion="oir" aria-label="Escuchar" class="w-10 h-10 rounded-full hover:bg-secondary-fixed text-secondary"><span class="material-symbols-outlined text-[20px]">volume_up</span></button>
              <button type="button" data-accion="editar" aria-label="Editar" class="w-10 h-10 rounded-full hover:bg-surface-container-high"><span class="material-symbols-outlined text-[18px]">edit</span></button>
              <button type="button" data-accion="eliminar" aria-label="Eliminar" class="w-10 h-10 rounded-full hover:bg-error-container text-error"><span class="material-symbols-outlined text-[18px]">delete</span></button>
            </div>
          </article>`).join("") || `<p class="col-span-full text-center p-space-xl bg-surface-container-low rounded-lg text-on-surface-variant">No hay palabras en este tema.</p>`}
      </section>

      <aside class="lg:col-span-4 lg:sticky lg:top-32">
        <form id="form" class="bg-surface-container-lowest rounded-lg p-space-md shadow-md space-y-space-sm">
          <div class="flex items-center justify-between">
            <h2 class="font-headline-sm text-headline-sm">${editando ? "Editar palabra" : "Agregar palabra"}</h2>
            ${editando ? `<button type="button" id="cancelar" class="font-label-sm text-label-sm text-on-surface-variant hover:underline">Cancelar</button>` : ""}
          </div>
          <label class="block font-label-sm text-label-sm text-on-surface-variant">Tema
            <select name="categoria" class="mt-1 w-full min-h-[44px] px-3 rounded bg-surface-container-low text-on-surface font-body-md">
              ${Object.entries(CATEGORIAS_INGLES).map(([k, c]) => `<option value="${k}" ${(editando?.categoria || (e.filtro !== "todas" ? e.filtro : "palabras")) === k ? "selected" : ""}>${c.emoji} ${c.titulo}</option>`).join("")}
            </select></label>
          <label class="block font-label-sm text-label-sm text-on-surface-variant">En inglés
            <input name="en" required maxlength="30" value="${esc(editando?.en || "")}" placeholder="Ej: rabbit" class="mt-1 w-full min-h-[48px] px-3 rounded bg-surface-container-low text-on-surface font-headline-sm text-headline-sm"></label>
          <label class="block font-label-sm text-label-sm text-on-surface-variant">En español
            <input name="es" required maxlength="30" value="${esc(editando?.es || "")}" placeholder="Ej: conejo" class="mt-1 w-full min-h-[44px] px-3 rounded bg-surface-container-low text-on-surface font-body-md"></label>
          ${selectorDibujoHTML({ emoji: editando?.emoji || "", imagen: editando?.imagen || "" }, "🐰")}
          <div>
            <label class="block font-label-sm text-label-sm text-on-surface-variant">o un color (para el tema Colores)
              <span class="mt-1 flex items-center gap-2 min-h-[44px]">
                <input type="checkbox" name="usaColor" ${editando?.color ? "checked" : ""} class="w-5 h-5">
                <input type="color" name="color" value="${esc(editando?.color || "#8b5cf6")}" class="w-12 h-10 rounded"></span></label>
          </div>
          <label class="block font-label-sm text-label-sm text-on-surface-variant">Número (sólo para el tema Números)
            <input name="orden" type="number" min="0" max="100" value="${esc(editando?.orden ?? "")}" class="mt-1 w-full min-h-[44px] px-3 rounded bg-surface-container-low text-on-surface font-body-md"></label>
          <div class="flex gap-2 pt-1">
            <button type="button" id="probar" class="flex-1 min-h-[44px] rounded-full bg-surface-container-low font-label-md text-label-md">🔊 Escuchar</button>
            <button class="flex-1 min-h-[44px] rounded-full bg-[#8b5cf6] text-white font-label-lg text-label-lg">${editando ? "Guardar" : "Agregar"}</button>
          </div>
        </form>
      </aside>
    </div>`;

  $$("[data-filtro]").forEach((b) => b.addEventListener("click", () => { e.filtro = b.dataset.filtro; render(); }));
  $("#probar").addEventListener("click", () => hablarIngles($("#form").en.value || "hello"));
  $("#cancelar")?.addEventListener("click", () => { e.editandoId = null; render(); });
  $("#form").addEventListener("submit", guardar);
  enlazarSelectorDibujo($("#form"));
  $("#app section.grid")?.addEventListener("click", accion);
}

async function accion(ev) {
  const b = ev.target.closest("[data-accion]");
  if (!b) return;
  const v = e.vocab.find((x) => x.id === b.closest("[data-id]").dataset.id);
  if (b.dataset.accion === "oir") hablarIngles(v.en);
  if (b.dataset.accion === "editar") { e.editandoId = v.id; render(); $("#form").scrollIntoView({ behavior: "smooth" }); }
  if (b.dataset.accion === "eliminar" && confirm(`¿Eliminar "${v.en}"?`)) {
    try { await api.eliminar(COL, v.id); e.vocab = e.vocab.filter((x) => x.id !== v.id); render(); toast("Palabra eliminada"); }
    catch (err) { toast(err.message, "error"); }
  }
}

async function guardar(ev) {
  ev.preventDefault();
  const f = new FormData(ev.target);
  const datos = {
    categoria: f.get("categoria"), en: f.get("en").trim(), es: f.get("es").trim(),
    emoji: f.get("emoji").trim() || null, imagen: f.get("imagen") || null, color: f.has("usaColor") ? f.get("color") : null,
  };
  if (f.get("orden")) datos.orden = Number(f.get("orden"));
  if (datos.categoria === "numeros" && !datos.orden) return toast("Para el tema Números indicá qué número es.", "error");
  if (datos.categoria === "dias" && !datos.orden) {
    datos.orden = Math.max(0, ...e.vocab.filter((v) => v.categoria === "dias").map((v) => v.orden || 0)) + 1;
  }
  try {
    if (e.editandoId) {
      const act = await api.actualizar(COL, e.editandoId, datos);
      e.vocab = e.vocab.map((v) => (v.id === act.id ? act : v));
      toast("Palabra guardada");
    } else {
      e.vocab.unshift(await api.crear(COL, { ...datos, dominada: 0 }));
      toast(`"${datos.en}" agregada`);
    }
    e.editandoId = null;
    render();
  } catch (err) { toast(err.message, "error"); }
}

iniciar();
