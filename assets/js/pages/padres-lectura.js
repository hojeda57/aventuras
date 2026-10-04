import { api } from "../core/api.js";
import { $, $$, esc, seleccionar, toast } from "../core/dom.js";
import { AUTORES, CELEBRACIONES, ICONOS_LECTURA, NIVELES, TIPOS_LECTURA } from "../core/constantes.js";
import { renderHeader } from "../components/header.js";
import { renderFooter } from "../components/footer.js";
import { renderLecturaCard } from "../components/lectura-card.js";
import { abrirModal } from "../components/modal.js";
import { silabear, silabearTexto } from "../utils/silabas.js";
import { escuchar, hablar, reproducir } from "../utils/audio.js";
import { Grabador, mensajeErrorMicrofono } from "../utils/grabador.js";
import { exigirAdulto } from "../components/gate-padres.js";

const COLECCION = "lectura";
const SEL_ON = "bg-surface-container-lowest text-on-surface shadow-sm font-bold";
const SEL_OFF = "text-on-surface-variant hover:text-on-surface";

const estado = {
  perfil: null,
  items: [],
  filtroTipo: "todas",
  filtroNivel: null,
  editandoId: null,
  form: null,
};
const grabador = new Grabador();

const formVacio = () => ({
  tipo: "palabra",
  nivel: estado.perfil?.nivelLectura || 1,
  celebracion: "globos",
  imagen: null,
  icono: "auto_stories",
  emoji: "",
  audio: null,
});

// ------------------------------------------------------------------ carga
async function iniciar() {
  await exigirAdulto();
  try {
    const [perfil, items] = await Promise.all([api.perfil(), api.listar(COLECCION)]);
    Object.assign(estado, { perfil, items });
  } catch (e) {
    toast(`No se pudo conectar con el servidor: ${e.message}`, "error");
  }
  renderHeader($("#app-header"), { activo: "lectura", perfil: estado.perfil });
  renderFooter($("#app-footer"));
  construirEditor();
  enlazarFiltros();
  enlazarLista();
  enlazarEditor();
  limpiarFormulario();
  render();
}

function render() {
  renderFiltros();
  renderLista();
  const voces = estado.items.filter((i) => i.audio).length;
  $("#vozContador").textContent = voces ? `${voces} grabación${voces > 1 ? "es" : ""} guardada${voces > 1 ? "s" : ""}` : "Todavía no grabaste ninguna";
  $("#categorias").innerHTML = [...new Set(estado.items.map((i) => i.categoria).filter(Boolean))]
    .map((c) => `<option value="${esc(c)}">`).join("");
}

// ------------------------------------------------------------------ filtros
const filtrados = () => estado.items.filter((i) =>
  (estado.filtroTipo === "todas" || i.tipo === estado.filtroTipo) &&
  (!estado.filtroNivel || i.nivel === estado.filtroNivel));

function renderFiltros() {
  const tabs = [["todas", "Todas", "bg-surface-container-high text-on-surface-variant"],
    ...Object.entries(TIPOS_LECTURA).map(([k, t]) => [k, t.plural, t.chip])];
  $("#filtrosTipo").innerHTML = tabs.map(([clave, label, chip]) => {
    const n = clave === "todas" ? estado.items.length : estado.items.filter((i) => i.tipo === clave).length;
    const activo = estado.filtroTipo === clave;
    return `<button type="button" data-filtro="${clave}" aria-pressed="${activo}"
      class="px-4 py-2 rounded-full font-label-md text-label-md flex items-center gap-2 whitespace-nowrap ${activo ? "bg-surface-container-lowest text-on-surface shadow-sm" : "text-on-surface-variant hover:bg-surface-container-high"}">
      ${label}<span class="px-2 py-0.5 rounded-full ${chip} font-label-sm text-label-sm">${n}</span></button>`;
  }).join("");

  $("#filtrosNivel").innerHTML = Object.entries(NIVELES).map(([n, niv]) => {
    const activo = estado.filtroNivel === Number(n);
    const desc = Number(n) === estado.perfil?.nivelLectura ? "En curso" : niv.desc;
    return `<button type="button" data-nivel="${n}" aria-pressed="${activo}"
      class="px-3 py-1.5 rounded-full font-label-sm text-label-sm whitespace-nowrap ${activo ? "bg-secondary-container/30 text-on-secondary-container font-bold" : "bg-surface-container hover:bg-surface-container-high"}">
      ${niv.label} (${desc})</button>`;
  }).join("");
}

function enlazarFiltros() {
  $("#filtrosTipo").addEventListener("click", (e) => {
    const b = e.target.closest("[data-filtro]");
    if (!b) return;
    estado.filtroTipo = b.dataset.filtro;
    render();
  });
  $("#filtrosNivel").addEventListener("click", (e) => {
    const b = e.target.closest("[data-nivel]");
    if (!b) return;
    const n = Number(b.dataset.nivel);
    estado.filtroNivel = estado.filtroNivel === n ? null : n;
    render();
  });
}

// ------------------------------------------------------------------ lista
function renderLista() {
  const lista = filtrados();
  $("#lista").innerHTML = lista.map(renderLecturaCard).join("");
  $("#vacio").classList.toggle("hidden", lista.length > 0);
  $("#contador").textContent = `Mostrando ${lista.length} de ${estado.items.length} tarjetas`;
}

const textoParaVoz = (it) => (it.tipo === "cuento" ? [it.texto, ...(it.paginas || [])].join(". ") : it.texto);

function enlazarLista() {
  $("#lista").addEventListener("click", async (e) => {
    const boton = e.target.closest("[data-accion]");
    if (!boton) return;
    const item = estado.items.find((i) => i.id === boton.closest("[data-id]").dataset.id);
    if (!item) return;
    switch (boton.dataset.accion) {
      case "escuchar": escuchar(item.audio, textoParaVoz(item)); break;
      case "ver": vistaPrevia(item); break;
      case "editar": cargarEnFormulario(item); break;
      case "eliminar": await eliminar(item); break;
    }
  });
}

async function eliminar(item) {
  if (!confirm(`¿Eliminar "${item.texto}"? No se puede deshacer.`)) return;
  try {
    await api.eliminar(COLECCION, item.id);
    estado.items = estado.items.filter((i) => i.id !== item.id);
    if (estado.editandoId === item.id) limpiarFormulario();
    render();
    toast("Tarjeta eliminada");
  } catch (e) { toast(e.message, "error"); }
}

// ------------------------------------------------------------------ vista previa
function vistaPrevia(item) {
  const paginas = item.tipo === "cuento" ? item.paginas || [] : [item.texto];
  let pagina = 0;
  const cont = abrirModal("", { titulo: `Vista previa: ${item.texto}` });

  const dibujar = () => {
    const texto = paginas[pagina] || "";
    const silabas = item.tipo === "palabra"
      ? `<div class="flex justify-center gap-2 mt-space-md">${silabear(texto).map((s) =>
          `<span class="px-4 py-2 rounded bg-secondary-fixed text-on-secondary-fixed font-headline-md text-headline-md">${esc(s)}</span>`).join("")}</div>` : "";
    cont.innerHTML = `
      <p class="font-label-sm text-label-sm text-on-surface-variant mb-space-md">Así lo verá ${esc(estado.perfil?.nombre || "")}</p>
      ${item.tipo === "cuento" ? `<h3 class="font-headline-sm text-headline-sm mb-2">${esc(item.texto)}</h3>` : ""}
      <p class="text-center font-bold text-on-surface ${item.tipo === "palabra" ? "text-[56px] leading-tight tracking-wide" : "text-[28px] leading-snug"}">${esc(texto)}</p>
      ${silabas}
      <div class="flex items-center justify-center gap-3 mt-space-lg">
        ${paginas.length > 1 ? `<button type="button" data-p="-1" ${pagina === 0 ? "disabled" : ""} class="w-12 h-12 rounded-full bg-surface-container disabled:opacity-30 flex items-center justify-center" aria-label="Página anterior"><span class="material-symbols-outlined">chevron_left</span></button>` : ""}
        <button type="button" data-escuchar class="btn-tactil px-6 py-3 rounded-full bg-secondary text-on-secondary font-label-lg text-label-lg shadow-[0_3px_0_0_#004c6e] flex items-center gap-2">
          <span class="material-symbols-outlined">volume_up</span>Escuchar</button>
        ${paginas.length > 1 ? `<button type="button" data-p="1" ${pagina === paginas.length - 1 ? "disabled" : ""} class="w-12 h-12 rounded-full bg-surface-container disabled:opacity-30 flex items-center justify-center" aria-label="Página siguiente"><span class="material-symbols-outlined">chevron_right</span></button>` : ""}
      </div>
      ${paginas.length > 1 ? `<p class="text-center font-label-sm text-label-sm text-on-surface-variant mt-2">Página ${pagina + 1} de ${paginas.length}</p>` : ""}`;
  };
  cont.addEventListener("click", (e) => {
    if (e.target.closest("[data-escuchar]")) escuchar(item.tipo === "cuento" ? null : item.audio, paginas[pagina]);
    const nav = e.target.closest("[data-p]");
    if (nav) { pagina += Number(nav.dataset.p); dibujar(); }
  });
  dibujar();
}

// ------------------------------------------------------------------ editor
function construirEditor() {
  $("#nivelGrupo").innerHTML = Object.entries(NIVELES).map(([n, niv]) => `
    <button type="button" data-nivel="${n}" class="min-h-[52px] rounded font-label-sm text-label-sm flex flex-col items-center justify-center gap-0.5">
      <span class="font-bold">${niv.marca}</span><span>${niv.label}</span></button>`).join("");

  $("#celebracionGrupo").innerHTML = Object.entries(CELEBRACIONES).filter(([k]) => k !== "confeti").map(([k, c]) => `
    <label class="flex flex-col items-center justify-center p-2 rounded bg-surface-container-low cursor-pointer hover:bg-surface-container has-[:checked]:ring-2 has-[:checked]:ring-primary-container">
      <input type="radio" name="celebracion" value="${k}" class="sr-only">
      <span class="text-[22px]" aria-hidden="true">${c.emoji}</span>
      <span class="font-label-sm text-label-sm mt-0.5">${c.label}</span></label>`).join("");

  $("#galeria").innerHTML = ICONOS_LECTURA.map((ic) => `
    <button type="button" data-icono="${ic}" aria-label="${ic}" class="aspect-square rounded bg-surface-container-lowest hover:bg-secondary-fixed flex items-center justify-center">
      <span class="material-symbols-outlined text-tertiary">${ic}</span></button>`).join("");

  $("#autorInput").innerHTML = `<option value="">—</option>` + AUTORES.map((a) => `<option>${a}</option>`).join("");
}

function pintarTipo() {
  const t = estado.form.tipo;
  seleccionar($$("#tipoGrupo [data-tipo]"), (b) => b.dataset.tipo === t, SEL_ON, SEL_OFF);
  $("#textoLabel").textContent = { palabra: "Palabra (se muestra en mayúsculas)", frase: "Frase", cuento: "Título del cuento" }[t];
  $("#textoInput").placeholder = { palabra: "Ej: MAMÁ, SOL, TORTUGA", frase: "Ej: El perro come", cuento: "Ej: La estrella traviesa" }[t];
  $("#textoInput").classList.toggle("uppercase", t === "palabra");
  $("#cuentoWrap").classList.toggle("hidden", t !== "cuento");
  actualizarSugerencia();
}

function actualizarSugerencia() {
  const texto = $("#textoInput").value.trim();
  const el = $("#sugerencia");
  if (!texto || estado.form.tipo === "cuento") { el.textContent = ""; return; }
  if (estado.form.tipo === "palabra") {
    const s = silabear(texto.toUpperCase());
    el.innerHTML = `Sílabas: <span class="font-bold text-secondary">${esc(s.join(" • "))}</span> (${s.length})`;
  } else {
    el.innerHTML = `<span class="font-bold text-secondary">${esc(silabearTexto(texto))}</span>`;
  }
}

function pintarNivel() {
  seleccionar($$("#nivelGrupo [data-nivel]"), (b) => Number(b.dataset.nivel) === estado.form.nivel,
    "bg-secondary-fixed text-on-secondary-fixed shadow-sm font-bold", "bg-surface-container-low hover:bg-surface-container");
}

function pintarImagen() {
  const { imagen, icono, emoji } = estado.form;
  $("#imgPreview").innerHTML = imagen
    ? `<img src="${esc(imagen)}" alt="" class="w-full h-full object-cover">`
    : emoji ? `<span class="text-[34px] leading-none">${esc(emoji)}</span>`
    : `<span class="material-symbols-outlined text-[32px] text-tertiary">${esc(icono)}</span>`;
  $("#imgDesc").textContent = imagen ? "Foto propia" : emoji ? "Dibujo (emoji)" : "Ícono infantil";
  $("#emojiInput").value = emoji || "";
}

function pintarAudio() {
  const el = $("#audioEstado");
  el.innerHTML = estado.form.audio
    ? `<span class="flex items-center gap-2 text-tertiary"><span class="material-symbols-outlined text-[18px]">check_circle</span>Voz grabada lista</span>
       <span class="flex gap-1">
         <button type="button" data-audio="oir" class="px-2 py-1 rounded-full hover:bg-surface-container">Escuchar</button>
         <button type="button" data-audio="borrar" class="px-2 py-1 rounded-full text-error hover:bg-error-container">Quitar</button></span>`
    : `<span class="flex items-center gap-2 text-on-surface-variant"><span class="material-symbols-outlined text-[18px] text-secondary">record_voice_over</span>Si no grabás, se usa la voz automática</span>
       <button type="button" data-audio="probar" class="px-2 py-1 rounded-full hover:bg-surface-container">Probar</button>`;
}

function pintarCelebracion() {
  $$('input[name="celebracion"]').forEach((r) => (r.checked = r.value === estado.form.celebracion));
}

function pintarFormulario() {
  pintarTipo(); pintarNivel(); pintarImagen(); pintarAudio(); pintarCelebracion();
  const editando = Boolean(estado.editandoId);
  $("#editorTitulo").textContent = editando ? "Editar contenido" : "Agregar contenido";
  $("#editorIcono").textContent = editando ? "edit" : "add_circle";
  $("#btnCancelar").classList.toggle("hidden", !editando);
  $("#btnGuardar span:last-child").textContent = editando ? "Guardar cambios" : `Guardar y probar con ${estado.perfil?.nombre || ""}`;
}

function limpiarFormulario() {
  estado.editandoId = null;
  estado.form = formVacio();
  $("#textoInput").value = "";
  $("#cuentoInput").value = "";
  $("#categoriaInput").value = "";
  $("#autorInput").value = "";
  pintarFormulario();
}

function cargarEnFormulario(item) {
  estado.editandoId = item.id;
  estado.form = {
    tipo: item.tipo, nivel: item.nivel, celebracion: item.celebracion || "globos",
    imagen: item.imagen || null, icono: item.icono || TIPOS_LECTURA[item.tipo].icono, emoji: item.emoji || "", audio: item.audio || null,
  };
  $("#textoInput").value = item.texto;
  $("#cuentoInput").value = (item.paginas || []).join("\n\n");
  $("#categoriaInput").value = item.categoria || "";
  $("#autorInput").value = item.autor || "";
  pintarFormulario();
  $("#editor").scrollIntoView({ behavior: "smooth", block: "start" });
  $("#textoInput").focus({ preventScroll: true });
}

function enlazarEditor() {
  $("#tipoGrupo").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tipo]");
    if (b) { estado.form.tipo = b.dataset.tipo; pintarTipo(); }
  });
  $("#textoInput").addEventListener("input", actualizarSugerencia);
  $("#nivelGrupo").addEventListener("click", (e) => {
    const b = e.target.closest("[data-nivel]");
    if (b) { estado.form.nivel = Number(b.dataset.nivel); pintarNivel(); }
  });
  $("#celebracionGrupo").addEventListener("change", (e) => (estado.form.celebracion = e.target.value));

  $("#btnGaleria").addEventListener("click", () => $("#galeria").classList.toggle("hidden"));
  $("#galeria").addEventListener("click", (e) => {
    const b = e.target.closest("[data-icono]");
    if (!b) return;
    Object.assign(estado.form, { icono: b.dataset.icono, imagen: null, emoji: "" });
    $("#galeria").classList.add("hidden");
    pintarImagen();
  });
  $("#emojiInput").addEventListener("input", (e) => { estado.form.emoji = e.target.value.trim(); if (estado.form.emoji) estado.form.imagen = null; pintarImagen(); });
  $("#btnFoto").addEventListener("click", () => $("#fotoInput").click());
  $("#fotoInput").addEventListener("change", async (e) => {
    const archivo = e.target.files[0];
    e.target.value = "";
    if (!archivo) return;
    try {
      estado.form.imagen = await api.subir(archivo);
      pintarImagen();
    } catch (err) { toast(err.message, "error"); }
  });

  $("#btnGrabar").addEventListener("click", alternarGrabacion);
  $("#audioEstado").addEventListener("click", (e) => {
    const accion = e.target.closest("[data-audio]")?.dataset.audio;
    if (accion === "oir") reproducir(estado.form.audio);
    if (accion === "borrar") { estado.form.audio = null; pintarAudio(); }
    if (accion === "probar") hablar($("#textoInput").value || "Hola", { lento: true });
  });

  $("#btnCancelar").addEventListener("click", limpiarFormulario);
  $("#editorForm").addEventListener("submit", (e) => { e.preventDefault(); guardar(false); });
  $("#btnBorrador").addEventListener("click", () => guardar(true));
}

async function alternarGrabacion() {
  const estadoEl = $("#grabarEstado");
  try {
    if (!grabador.activo) {
      await grabador.iniciar();
      estadoEl.innerHTML = `<span class="grabando">● Grabando…</span> tocá para parar`;
      $("#btnGrabar").classList.add("ring-2", "ring-error");
      return;
    }
    const { blob, nombre, segundos } = await grabador.detener();
    $("#btnGrabar").classList.remove("ring-2", "ring-error");
    estadoEl.textContent = "Subiendo…";
    estado.form.audio = await api.subir(blob, nombre);
    estadoEl.textContent = `Grabado (${segundos} s)`;
    pintarAudio();
  } catch (e) {
    $("#btnGrabar").classList.remove("ring-2", "ring-error");
    estadoEl.textContent = "Grabar";
    toast(e.name ? mensajeErrorMicrofono(e) : e.message, "error");
  }
}

function leerFormulario(borrador) {
  const f = estado.form;
  const texto = $("#textoInput").value.trim();
  if (!texto) throw new Error(f.tipo === "cuento" ? "Escribí el título del cuento." : "Escribí la palabra o frase.");
  if (f.tipo === "palabra" && /\s/.test(texto)) throw new Error('Una palabra mágica no lleva espacios. Para varias palabras elegí "Frase".');

  const datos = {
    tipo: f.tipo,
    texto: f.tipo === "palabra" ? texto.toUpperCase() : texto,
    nivel: f.nivel,
    categoria: $("#categoriaInput").value.trim() || null,
    autor: $("#autorInput").value || null,
    imagen: f.imagen, icono: f.icono, emoji: f.emoji || null, audio: f.audio,
    celebracion: f.celebracion,
    borrador,
  };
  if (f.tipo === "cuento") {
    datos.paginas = $("#cuentoInput").value.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    if (!datos.paginas.length) throw new Error("Escribí al menos una página del cuento.");
  }
  return datos;
}

async function guardar(borrador) {
  let datos;
  try { datos = leerFormulario(borrador); }
  catch (e) { toast(e.message, "error"); $("#textoInput").focus(); return; }

  try {
    let guardado;
    if (estado.editandoId) {
      guardado = await api.actualizar(COLECCION, estado.editandoId, datos);
      estado.items = estado.items.map((i) => (i.id === guardado.id ? guardado : i));
    } else {
      guardado = await api.crear(COLECCION, datos);
      estado.items.unshift(guardado);
    }
    const eraNuevo = !estado.editandoId;
    limpiarFormulario();
    render();
    toast(borrador ? "Borrador guardado" : `"${guardado.texto}" guardado`);
    if (eraNuevo && !borrador) vistaPrevia(guardado);
  } catch (e) { toast(e.message, "error"); }
}

iniciar();
