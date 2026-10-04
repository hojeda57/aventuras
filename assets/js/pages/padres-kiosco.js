import { api } from "../core/api.js";
import { $, $$, esc, toast } from "../core/dom.js";
import { renderHeader } from "../components/header.js";
import { renderFooter } from "../components/footer.js";
import { exigirAdulto } from "../components/gate-padres.js";
import { billeteHTML, pesos } from "../components/billete.js";
import { dibujoHTML, enlazarSelectorDibujo, selectorDibujoHTML } from "../components/dibujo.js";

const e = { perfil: null, billetes: [], productos: [], editandoId: null };

async function iniciar() {
  await exigirAdulto();
  try { [e.perfil, e.billetes, e.productos] = await Promise.all([api.perfil(), api.listar("billetes"), api.listar("productos")]); }
  catch (err) { toast(`No se pudo conectar con el servidor: ${err.message}`, "error"); return; }
  e.billetes.sort((a, b) => a.valor - b.valor);
  renderHeader($("#app-header"), { activo: "kiosco", perfil: e.perfil });
  renderFooter($("#app-footer"));
  render();
}

function render() {
  const editando = e.productos.find((p) => p.id === e.editandoId);
  $("#app").innerHTML = `
    <section class="mt-space-md rounded-lg bg-[linear-gradient(160deg,#ffe4e6,#f9f9ff)] p-space-lg shadow-sm">
      <h1 class="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg">🏪 El Kiosco</h1>
      <p class="text-on-surface-variant max-w-3xl">Activá los billetes que querés que use y subí fotos de los billetes reales.
        También podés copiar las PNG en <code class="px-1 rounded bg-surface-container">frontend\\assets\\img\\billetes\\</code>
        con el valor como nombre (<code>100.png</code>, <code>500.png</code>…). Los precios del juego se arman solos con los billetes activos.</p>
    </section>

    <section class="bg-surface-container-lowest rounded-lg p-space-md shadow-sm">
      <h2 class="font-headline-sm text-headline-sm mb-space-sm">💵 Billetes</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-space-md">
        ${e.billetes.map((b) => `
          <article data-billete="${esc(b.id)}" class="rounded-lg p-space-sm border-2 ${b.activo ? "border-tertiary-container bg-white" : "border-surface-container-high bg-surface-container-low opacity-70"} flex flex-col items-center gap-2">
            ${billeteHTML(b, { tam: "md" })}
            <p class="font-headline-sm text-headline-sm">${pesos(b.valor)}</p>
            <label class="flex items-center gap-2 font-label-md text-label-md cursor-pointer">
              <input type="checkbox" data-accion="activo" ${b.activo ? "checked" : ""} class="w-5 h-5"> En el juego</label>
            <div class="flex gap-1">
              <button type="button" data-accion="foto" class="px-3 min-h-[36px] rounded-full bg-surface-container font-label-sm text-label-sm">📷 Foto</button>
              ${b.imagen ? `<button type="button" data-accion="quitar" class="px-3 min-h-[36px] rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm">Quitar</button>` : ""}
            </div>
          </article>`).join("")}
      </div>
      <input id="fotoInput" type="file" accept="image/png,image/jpeg,image/webp" class="hidden">
      <p class="font-body-sm text-body-sm text-on-surface-variant mt-space-sm">Para empezar conviene dejar activos de $10 a $1000. Los niveles usan: N1 hasta $500 de a un billete, N2 juntar hasta $1000, N3 vuelto.</p>
    </section>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
      <section class="lg:col-span-8 bg-surface-container-lowest rounded-lg p-space-md shadow-sm">
        <h2 class="font-headline-sm text-headline-sm mb-space-sm">🍭 Productos del kiosco (${e.productos.length})</h2>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-space-sm">
          ${e.productos.map((p) => `
            <article data-producto="${esc(p.id)}" class="rounded-lg bg-surface-container-low p-space-sm text-center">
              <div class="h-14 flex items-center justify-center">${dibujoHTML(p, { clases: "text-[44px]", defecto: "🛍️" })}</div>
              <p class="font-label-lg text-label-lg mt-1">${esc(p.nombre)}</p>
              ${p.dominada ? `<p class="font-label-sm text-label-sm text-tertiary">✓ ${p.dominada}</p>` : ""}
              <div class="flex justify-center gap-1 mt-1">
                <button type="button" data-accion="editar" aria-label="Editar" class="w-9 h-9 rounded-full hover:bg-surface-container-high"><span class="material-symbols-outlined text-[18px]">edit</span></button>
                <button type="button" data-accion="eliminar" aria-label="Eliminar" class="w-9 h-9 rounded-full hover:bg-error-container text-error"><span class="material-symbols-outlined text-[18px]">delete</span></button>
              </div>
            </article>`).join("")}
        </div>
      </section>
      <aside class="lg:col-span-4 lg:sticky lg:top-32">
        <form id="form" class="bg-surface-container-lowest rounded-lg p-space-md shadow-md space-y-space-sm">
          <div class="flex items-center justify-between">
            <h2 class="font-headline-sm text-headline-sm">${editando ? "Editar producto" : "Agregar producto"}</h2>
            ${editando ? `<button type="button" id="cancelar" class="font-label-sm text-label-sm text-on-surface-variant hover:underline">Cancelar</button>` : ""}
          </div>
          <label class="block font-label-sm text-label-sm text-on-surface-variant">Nombre
            <input name="nombre" required maxlength="24" value="${esc(editando?.nombre || "")}" placeholder="Ej: Turrón" class="mt-1 w-full min-h-[44px] px-3 rounded bg-surface-container-low text-on-surface font-body-md"></label>
          ${selectorDibujoHTML({ emoji: editando?.emoji || "", imagen: editando?.imagen || "" }, "🍬")}
          <button class="w-full min-h-[44px] rounded-full bg-[#f43f5e] text-white font-label-lg text-label-lg">${editando ? "Guardar" : "Agregar"}</button>
        </form>
      </aside>
    </div>`;

  $("#form").addEventListener("submit", guardarProducto);
  enlazarSelectorDibujo($("#form"));
  $("#cancelar")?.addEventListener("click", () => { e.editandoId = null; render(); });
  $("#app").onclick = accion;
  $("#app").onchange = accion;
}

let billeteParaFoto = null;
async function accion(ev) {
  const b = ev.target.closest("[data-accion]");
  if (!b) return;
  const a = b.dataset.accion;
  const art = b.closest("[data-billete],[data-producto]");
  try {
    if (art?.dataset.billete) {
      const bil = e.billetes.find((x) => x.id === art.dataset.billete);
      if (a === "activo" && ev.type === "change") await actualizarBillete(bil, { activo: b.checked });
      if (a === "quitar" && ev.type === "click") await actualizarBillete(bil, { imagen: null });
      if (a === "foto" && ev.type === "click") { billeteParaFoto = bil; $("#fotoInput").onchange = subirFoto; $("#fotoInput").click(); }
      return;
    }
    if (ev.type !== "click") return;
    const p = e.productos.find((x) => x.id === art.dataset.producto);
    if (a === "editar") { e.editandoId = p.id; render(); $("#form").scrollIntoView({ behavior: "smooth" }); }
    if (a === "eliminar" && confirm(`¿Eliminar "${p.nombre}"?`)) {
      await api.eliminar("productos", p.id);
      e.productos = e.productos.filter((x) => x.id !== p.id); render(); toast("Producto eliminado");
    }
  } catch (err) { toast(err.message, "error"); }
}

async function actualizarBillete(bil, cambios) {
  const act = await api.actualizar("billetes", bil.id, cambios);
  e.billetes = e.billetes.map((x) => (x.id === act.id ? act : x));
  render();
}

async function subirFoto(ev) {
  const archivo = ev.target.files[0];
  ev.target.value = "";
  if (!archivo || !billeteParaFoto) return;
  try {
    const url = await api.subir(archivo);
    await actualizarBillete(billeteParaFoto, { imagen: url });
    toast(`Foto del billete de ${pesos(billeteParaFoto.valor)} guardada`);
  } catch (err) { toast(err.message, "error"); }
}

async function guardarProducto(ev) {
  ev.preventDefault();
  const f = new FormData(ev.target);
  const datos = { nombre: f.get("nombre").trim(), emoji: f.get("emoji").trim() || "🛍️", imagen: f.get("imagen") || null };
  try {
    if (e.editandoId) {
      const act = await api.actualizar("productos", e.editandoId, datos);
      e.productos = e.productos.map((p) => (p.id === act.id ? act : p));
    } else {
      e.productos.unshift(await api.crear("productos", { ...datos, dominada: 0 }));
    }
    toast(`"${datos.nombre}" guardado`);
    e.editandoId = null; render();
  } catch (err) { toast(err.message, "error"); }
}

iniciar();
