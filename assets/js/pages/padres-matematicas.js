import { api } from "../core/api.js";
import { $, $$, esc, seleccionar, toast } from "../core/dom.js";
import { CELEBRACIONES, NIVELES, OBJETOS_MATE, OPERACIONES } from "../core/constantes.js";
import { renderHeader } from "../components/header.js";
import { renderFooter } from "../components/footer.js";
import { renderRetoCard, visualOperacion } from "../components/reto-card.js";
import { abrirModal } from "../components/modal.js";
import { nivelDe, resultado } from "../utils/mate.js";
import { hablar, reproducir } from "../utils/audio.js";
import { Grabador, mensajeErrorMicrofono } from "../utils/grabador.js";
import { exigirAdulto } from "../components/gate-padres.js";

const COLECCION = "matematicas";
const MAX = 20;
const PUNTOS = [5, 10, 20];
const TABS = [
  { id: "todos", label: "Todos", punto: "bg-on-surface-variant", filtro: () => true },
  { id: "suma", label: "Sumas con objetos", punto: OPERACIONES.suma.punto, filtro: (r) => r.operacion === "suma" && !r.autor },
  { id: "resta", label: "Restas hasta el 10", punto: OPERACIONES.resta.punto, filtro: (r) => r.operacion === "resta" && !r.autor },
  { id: "contar", label: "Contar objetos", punto: OPERACIONES.contar.punto, filtro: (r) => r.operacion === "contar" && !r.autor },
  { id: "familia", label: "Desafíos de la familia", punto: "bg-primary", filtro: (r) => Boolean(r.autor) },
];

const estado = { perfil: null, progreso: null, retos: [], tab: "todos", nivel: null, reordenando: false, editandoId: null, form: null };
const grabador = new Grabador();

const formVacio = () => ({ operacion: "suma", a: 3, b: 2, objeto: "🍎", celebracion: "globos", puntos: 10, audio: null, nivel: null });

// ------------------------------------------------------------------ carga
async function iniciar() {
  await exigirAdulto();
  try {
    const [perfil, retos, progreso] = await Promise.all([api.perfil(), api.listar(COLECCION), api.progreso()]);
    Object.assign(estado, { perfil, retos, progreso });
  } catch (e) { toast(`No se pudo conectar con el servidor: ${e.message}`, "error"); }
  renderHeader($("#app-header"), { activo: "matematicas", perfil: estado.perfil });
  renderFooter($("#app-footer"));
  renderEncabezado();
  renderEstadisticas();
  construirConstructor();
  enlazar();
  limpiarFormulario();
  render();
}

const ordenados = () => [...estado.retos].sort((x, y) => (x.orden ?? 0) - (y.orden ?? 0));

function render() { renderTabs(); renderNivel(); renderLista(); }

// ------------------------------------------------------------------ encabezado y métricas
function renderEncabezado() {
  const p = estado.perfil || {};
  const prog = estado.progreso || {};
  const on = p.dificultadAdaptativa !== false;
  const t = $("#toggleAdaptativa");
  t.setAttribute("aria-checked", String(on));
  t.classList.toggle("bg-tertiary", on);
  t.classList.toggle("bg-outline-variant", !on);
  t.firstElementChild.style.transform = on ? "translateX(20px)" : "none";
  $("#adaptativaTexto").textContent = on ? "Sube de nivel sola" : "Nivel fijo";
  $("#metaTexto").textContent = `${p.metaDiaria ?? 5} ejercicios por día`;
  $("#metaHoy").textContent = `${prog.hoy ?? 0}/${p.metaDiaria ?? 5} hoy`;
}

function anillo(pct, color) {
  return `<div class="relative w-16 h-16 shrink-0 flex items-center justify-center">
    <svg class="w-full h-full -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
      <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" stroke-width="3.5" class="text-surface-container-high"/>
      <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="${pct} 100" class="${color}"/>
    </svg>
    <span class="absolute font-label-md text-label-md ${color}">${pct}%</span></div>`;
}

function renderEstadisticas() {
  const p = estado.progreso;
  if (!p) { $("#estadisticas").classList.add("hidden"); return; }
  const tarjeta = (pct, color, titulo, sinDatos) => `
    <div class="bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex items-center gap-space-md">
      ${anillo(pct ?? 0, color)}
      <div><span class="font-label-md text-label-md">${titulo}</span>
      <p class="font-body-sm text-body-sm text-on-surface-variant">${pct == null ? sinDatos : pct >= 85 ? "¡Muy bien! Puede avanzar." : pct >= 60 ? "Va bien, conviene seguir practicando." : "Conviene reforzar con objetos para tocar."}</p></div>
    </div>`;
  const max = Math.max(...p.semana.map((d) => d.total), 1);
  const total = p.semana.reduce((a, d) => a + d.total, 0);
  const barras = p.semana.map((d, i) => `<div title="${d.fecha}: ${d.total}" class="flex-1 rounded-t-sm ${i === 6 ? "bg-tertiary-container" : "bg-secondary"}" style="height:${Math.max(8, (d.total / max) * 100)}%"></div>`).join("");
  $("#estadisticas").innerHTML = `
    ${tarjeta(p.porcentajes.suma, "text-secondary", "Sumas", "Todavía no hizo sumas.")}
    ${tarjeta(p.porcentajes.resta, "text-primary", "Restas", "Todavía no hizo restas.")}
    <div class="bg-surface-container-low p-space-md rounded-lg flex flex-col justify-between">
      <div class="flex items-center justify-between">
        <span class="font-label-md text-label-md">Últimos 7 días</span>
        <span class="font-label-sm text-label-sm text-tertiary font-bold">Nivel ${p.nivelMate} en números</span>
      </div>
      <div class="flex items-end gap-1.5 h-10 mt-2">${barras}</div>
      <span class="font-body-sm text-body-sm text-on-surface-variant mt-1">${total} ejercicios bien resueltos (lectura y números)</span>
    </div>`;
}

// ------------------------------------------------------------------ filtros y lista
function filtrados() {
  const tab = TABS.find((t) => t.id === estado.tab);
  return ordenados().filter((r) => tab.filtro(r) && (!estado.nivel || nivelDe(r) === estado.nivel));
}

function renderTabs() {
  $("#tabs").innerHTML = TABS.map((t) => {
    const n = estado.retos.filter(t.filtro).length;
    const activo = estado.tab === t.id;
    return `<button type="button" data-tab="${t.id}" aria-pressed="${activo}"
      class="px-5 py-2.5 rounded-full font-label-md text-label-md flex items-center gap-2 whitespace-nowrap ${activo ? "bg-surface-container-lowest text-on-surface shadow-sm" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"}">
      <span class="w-2.5 h-2.5 rounded-full ${t.punto}"></span>${t.label}
      <span class="px-2 py-0.5 rounded-full bg-surface-container font-label-sm text-label-sm">${n}</span></button>`;
  }).join("");
}

function renderNivel() {
  const opciones = [[null, "Todos"], [1, "Nivel 1 (hasta 5)"], [2, "Nivel 2 (hasta 10)"], [3, "Nivel 3 (hasta 20)"]];
  $("#filtroNivel").innerHTML = opciones.map(([n, label]) => `
    <button type="button" data-nivel="${n ?? ""}" aria-pressed="${estado.nivel === n}"
      class="px-3 py-1 rounded-full font-label-sm text-label-sm ${estado.nivel === n ? "bg-surface-container-lowest text-on-surface shadow-sm" : "text-on-surface-variant hover:text-on-surface"}">${label}</button>`).join("");
}

function renderLista() {
  const lista = filtrados();
  $("#lista").innerHTML = lista.map((r, i) =>
    renderRetoCard(r, { reordenando: estado.reordenando, esPrimero: i === 0, esUltimo: i === lista.length - 1 })).join("");
  $("#vacio").classList.toggle("hidden", lista.length > 0);
  const visibles = estado.retos.filter((r) => r.activo).length;
  $("#contadorRuta").textContent = `${visibles} visibles en el juego de ${estado.perfil?.nombre || ""}`;
  $("#btnReordenar span:last-child").textContent = estado.reordenando ? "Listo" : "Reordenar";
}

// ------------------------------------------------------------------ acciones sobre tarjetas
async function persistir(id, cambios) {
  const actualizado = await api.actualizar(COLECCION, id, cambios);
  estado.retos = estado.retos.map((r) => (r.id === id ? actualizado : r));
  return actualizado;
}

async function mover(reto, delta) {
  const lista = filtrados();
  const i = lista.findIndex((r) => r.id === reto.id);
  const otro = lista[i + delta];
  if (!otro) return;
  const [oa, ob] = [reto.orden ?? i, otro.orden ?? i + delta];
  try {
    await Promise.all([persistir(reto.id, { orden: ob }), persistir(otro.id, { orden: oa === ob ? oa + delta : oa })]);
    renderLista();
  } catch (e) { toast(e.message, "error"); }
}

function simular(r) {
  const cont = abrirModal("", { titulo: `Simulación: ${r.titulo}` });
  const pregunta = r.enunciado || (r.operacion === "contar" ? "¿Cuántos hay?" : `¿Cuánto es ${r.a} ${OPERACIONES[r.operacion].simbolo} ${r.b}?`);
  const cel = CELEBRACIONES[r.celebracion] || CELEBRACIONES.globos;
  const opciones = [...new Set([resultado(r), resultado(r) + 1, Math.max(0, resultado(r) - 1)])].sort(() => Math.random() - 0.5);
  cont.innerHTML = `
    <p class="font-label-sm text-label-sm text-on-surface-variant mb-space-sm">Así lo verá ${esc(estado.perfil?.nombre || "")}</p>
    <p class="font-headline-sm text-headline-sm mb-space-md">${esc(pregunta)}</p>
    <div class="bg-surface-container-low rounded p-space-md mb-space-md">${visualOperacion(r)}</div>
    <div class="flex justify-center gap-3" data-opciones>
      ${opciones.map((n) => `<button type="button" data-resp="${n}" class="btn-tactil w-16 h-16 rounded-full bg-secondary-fixed text-on-secondary-fixed font-headline-md text-headline-md shadow-[0_3px_0_0_#89ceff]">${n}</button>`).join("")}
    </div>
    <p data-feedback class="text-center font-headline-sm text-headline-sm mt-space-md min-h-[32px]" aria-live="polite"></p>`;
  hablar(pregunta);
  cont.querySelector("[data-opciones]").addEventListener("click", (e) => {
    const b = e.target.closest("[data-resp]");
    if (!b) return;
    const ok = Number(b.dataset.resp) === resultado(r);
    cont.querySelector("[data-feedback]").textContent = ok ? `${cel.emoji} ¡Muy bien! +${r.puntos} puntos ${cel.emoji}` : "Casi… probá de nuevo";
    if (ok) r.audio ? reproducir(r.audio) : hablar(r.mensajeVoz || "¡Muy bien!");
  });
}

async function accionTarjeta(accion, reto) {
  try {
    switch (accion) {
      case "editar": cargarEnFormulario(reto); break;
      case "simular": simular(reto); break;
      case "escuchar": reproducir(reto.audio); break;
      case "subir": await mover(reto, -1); break;
      case "bajar": await mover(reto, 1); break;
      case "alternar":
        await persistir(reto.id, { activo: !reto.activo });
        render();
        break;
      case "duplicar": {
        const { id, ...copia } = reto;
        const nuevo = await api.crear(COLECCION, { ...copia, titulo: `${reto.titulo} (copia)`, orden: siguienteOrden(), superado: 0 });
        estado.retos.push(nuevo);
        render();
        toast("Ejercicio duplicado");
        break;
      }
      case "eliminar":
        if (!confirm(`¿Eliminar "${reto.titulo}"?`)) return;
        await api.eliminar(COLECCION, reto.id);
        estado.retos = estado.retos.filter((r) => r.id !== reto.id);
        if (estado.editandoId === reto.id) limpiarFormulario();
        render();
        toast("Ejercicio eliminado");
        break;
    }
  } catch (e) { toast(e.message, "error"); }
}

const siguienteOrden = () => Math.max(0, ...estado.retos.map((r) => r.orden ?? 0)) + 1;

async function cargarPaquete() {
  const existentes = new Set(estado.retos.filter((r) => r.operacion === "suma").map((r) => `${r.a}+${r.b}`));
  const candidatos = [];
  for (let a = 1; a <= 9; a++) for (let b = 1; a + b <= 10; b++) if (!existentes.has(`${a}+${b}`)) candidatos.push([a, b]);
  const elegidos = candidatos.sort(() => Math.random() - 0.5).slice(0, 5);
  if (!elegidos.length) { toast("Ya tenés todas las sumas del 1 al 10 cargadas."); return; }
  try {
    let orden = siguienteOrden();
    for (const [a, b] of elegidos) {
      const obj = OBJETOS_MATE[Math.floor(Math.random() * OBJETOS_MATE.length)];
      estado.retos.push(await api.crear(COLECCION, {
        operacion: "suma", a, b, objeto: obj.emoji, objetoB: null, titulo: `Suma con ${obj.label.toLowerCase()}`,
        enunciado: null, celebracion: "globos", puntos: 10, autor: null, audio: null, activo: true, orden: orden++, superado: 0,
      }));
    }
    render();
    toast(`Se agregaron ${elegidos.length} sumas nuevas`);
  } catch (e) { toast(e.message, "error"); }
}

// ------------------------------------------------------------------ constructor
function construirConstructor() {
  $("#opGrupo").innerHTML = Object.entries(OPERACIONES).map(([k, op]) => `
    <button type="button" data-op="${k}" class="min-h-[64px] flex flex-col items-center justify-center p-3 rounded">
      <span class="material-symbols-outlined text-[24px]">${op.icono}</span>
      <span class="font-label-sm text-label-sm mt-1">${op.label}</span></button>`).join("");

  $("#objetosGrupo").innerHTML = OBJETOS_MATE.map((o) => `
    <button type="button" data-objeto="${o.emoji}" title="${o.label}" aria-label="${o.label}" class="aspect-square min-h-[48px] rounded text-2xl flex items-center justify-center">${o.emoji}</button>`).join("");

  $("#celebracionGrupo").innerHTML = ["cohetes", "globos", "confeti"].map((k) => `
    <button type="button" data-cel="${k}" class="min-h-[44px] p-2 rounded font-label-sm text-label-sm flex items-center justify-center gap-1">
      <span aria-hidden="true">${CELEBRACIONES[k].emoji}</span>${CELEBRACIONES[k].label}</button>`).join("");

  $("#puntosGrupo").innerHTML = PUNTOS.map((p) => `
    <button type="button" data-puntos="${p}" class="px-3 min-h-[36px] rounded-full font-label-sm text-label-sm">${p}</button>`).join("");
}

function contador(campo, etiqueta) {
  return `<div class="flex flex-col items-center">
    <span class="font-label-sm text-label-sm text-on-surface-variant mb-1">${etiqueta}</span>
    <div class="flex items-center gap-2">
      <button type="button" data-campo="${campo}" data-delta="-1" aria-label="Restar uno a ${etiqueta}" class="w-10 h-10 rounded-full bg-surface-container-lowest font-bold hover:bg-surface-container-high">−</button>
      <span class="w-8 text-center font-headline-md text-headline-md text-secondary font-bold">${estado.form[campo]}</span>
      <button type="button" data-campo="${campo}" data-delta="1" aria-label="Sumar uno a ${etiqueta}" class="w-10 h-10 rounded-full bg-surface-container-lowest font-bold hover:bg-surface-container-high">+</button>
    </div></div>`;
}

function pintarNumeros() {
  const f = estado.form;
  const signo = `<span class="font-headline-md text-headline-md text-on-surface-variant">${OPERACIONES[f.operacion].simbolo}</span>`;
  const res = `<span class="font-headline-md text-headline-md text-on-surface-variant">=</span>
    <div class="flex flex-col items-center"><span class="font-label-sm text-label-sm text-tertiary font-bold mb-1">Resultado</span>
    <span class="font-headline-md text-headline-md text-tertiary font-bold">${resultado(f)}</span></div>`;
  $("#numeros").innerHTML = f.operacion === "contar"
    ? contador("a", "Cantidad") + res
    : contador("a", "Primer grupo") + signo + contador("b", "Segundo grupo") + res;
  const auto = nivelDe({ ...f, nivel: null });
  $("#numerosAviso").innerHTML = `Nivel: ${[null, 1, 2, 3].map((n) => `<button type="button" data-nivel-reto="${n ?? ""}"
    class="px-2.5 py-0.5 rounded-full font-label-sm text-label-sm ${f.nivel === n ? "bg-secondary text-on-secondary" : "bg-surface-container-low"}">${n ? `N${n}` : `Auto (N${auto})`}</button>`).join(" ")}
    <span class="block mt-1">Los problemas con historia van mejor en N3.</span>`;
}

function pintarConstructor() {
  const f = estado.form;
  seleccionar($$("#opGrupo [data-op]"), (b) => b.dataset.op === f.operacion,
    "bg-secondary text-on-secondary shadow-sm", "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high");
  seleccionar($$("#objetosGrupo [data-objeto]"), (b) => b.dataset.objeto === f.objeto,
    "bg-secondary-fixed ring-2 ring-secondary", "bg-surface-container-low hover:bg-surface-container-high");
  seleccionar($$("#celebracionGrupo [data-cel]"), (b) => b.dataset.cel === f.celebracion,
    "bg-primary-fixed text-on-primary-fixed", "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high");
  seleccionar($$("#puntosGrupo [data-puntos]"), (b) => Number(b.dataset.puntos) === f.puntos,
    "bg-primary-container text-on-primary-container font-bold", "bg-surface-container-low");
  pintarNumeros();
  $("#vozEstado").textContent = f.audio ? "Grabado" : "Sin grabar";
  $("#btnOirVoz").classList.toggle("hidden", !f.audio);
  $("#grabarLabel").textContent = f.audio ? "Grabar de nuevo" : "Grabar";
  const editando = Boolean(estado.editandoId);
  $("#constructorTitulo").textContent = editando ? "Editar reto" : "Constructor de retos";
  $("#btnCancelar").classList.toggle("hidden", !editando);
  $("#btnGuardar").textContent = editando ? "Guardar cambios" : "Guardar ejercicio";
}

function ajustar(campo, delta) {
  const f = estado.form;
  f[campo] = Math.min(MAX, Math.max(campo === "a" ? 1 : 0, f[campo] + delta));
  if (f.operacion === "resta" && f.b > f.a) f.b = f.a; // sin resultados negativos
  pintarNumeros();
}

function limpiarFormulario() {
  estado.editandoId = null;
  estado.form = formVacio();
  $("#enunciadoInput").value = "";
  pintarConstructor();
}

function cargarEnFormulario(r) {
  estado.editandoId = r.id;
  estado.form = { operacion: r.operacion, a: r.a, b: r.b, objeto: r.objeto, celebracion: r.celebracion, puntos: r.puntos, audio: r.audio, nivel: r.nivel || null };
  $("#enunciadoInput").value = r.enunciado || "";
  pintarConstructor();
  $("#constructor").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function alternarGrabacion() {
  try {
    if (!grabador.activo) {
      await grabador.iniciar();
      $("#grabarLabel").innerHTML = `<span class="grabando">● Grabando…</span> tocá para parar`;
      return;
    }
    const { blob, nombre, segundos } = await grabador.detener();
    $("#grabarLabel").textContent = "Subiendo…";
    estado.form.audio = await api.subir(blob, nombre);
    pintarConstructor();
    $("#vozEstado").textContent = `Grabado (${segundos} s)`;
  } catch (e) {
    pintarConstructor();
    toast(e.name ? mensajeErrorMicrofono(e) : e.message, "error");
  }
}

async function guardar({ otro = false } = {}) {
  const f = estado.form;
  const obj = OBJETOS_MATE.find((o) => o.emoji === f.objeto);
  const titulo = `${OPERACIONES[f.operacion].label} con ${(obj?.label || "objetos").toLowerCase()}`;
  const datos = {
    ...f,
    b: f.operacion === "contar" ? 0 : f.b,
    enunciado: $("#enunciadoInput").value.trim() || null,
  };
  try {
    if (estado.editandoId) {
      const previo = estado.retos.find((r) => r.id === estado.editandoId);
      if (previo.titulo.startsWith(OPERACIONES[previo.operacion].label + " con")) datos.titulo = titulo;
      await persistir(estado.editandoId, datos);
      toast("Cambios guardados");
    } else {
      estado.retos.push(await api.crear(COLECCION, {
        ...datos, titulo, objetoB: null, autor: null, activo: true, orden: siguienteOrden(), superado: 0,
      }));
      toast("Ejercicio agregado a la ruta");
    }
    if (otro) {
      estado.editandoId = null;
      pintarConstructor();
    } else limpiarFormulario();
    render();
  } catch (e) { toast(e.message, "error"); }
}

// ------------------------------------------------------------------ eventos
function enlazar() {
  $("#tabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tab]");
    if (b) { estado.tab = b.dataset.tab; render(); }
  });
  $("#filtroNivel").addEventListener("click", (e) => {
    const b = e.target.closest("[data-nivel]");
    if (b) { estado.nivel = b.dataset.nivel ? Number(b.dataset.nivel) : null; render(); }
  });
  $("#lista").addEventListener("click", (e) => {
    const b = e.target.closest("[data-accion]");
    if (!b) return;
    const reto = estado.retos.find((r) => r.id === b.closest("[data-id]").dataset.id);
    if (reto) accionTarjeta(b.dataset.accion, reto);
  });
  $("#btnReordenar").addEventListener("click", () => { estado.reordenando = !estado.reordenando; renderLista(); });
  $("#btnPaquete").addEventListener("click", cargarPaquete);
  $("#btnNuevo").addEventListener("click", () => {
    limpiarFormulario();
    $("#constructor").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  $("#toggleAdaptativa").addEventListener("click", async () => {
    try {
      estado.perfil = await api.actualizarPerfil({ dificultadAdaptativa: estado.perfil?.dificultadAdaptativa === false });
      renderEncabezado();
    } catch (e) { toast(e.message, "error"); }
  });

  $("#opGrupo").addEventListener("click", (e) => {
    const b = e.target.closest("[data-op]");
    if (!b) return;
    estado.form.operacion = b.dataset.op;
    if (b.dataset.op === "resta" && estado.form.b > estado.form.a) estado.form.b = estado.form.a;
    pintarConstructor();
  });
  $("#numeros").addEventListener("click", (e) => {
    const b = e.target.closest("[data-campo]");
    if (b) ajustar(b.dataset.campo, Number(b.dataset.delta));
  });
  $("#numerosAviso").addEventListener("click", (e) => {
    const b = e.target.closest("[data-nivel-reto]");
    if (b) { estado.form.nivel = b.dataset.nivelReto ? Number(b.dataset.nivelReto) : null; pintarNumeros(); }
  });
  $("#objetosGrupo").addEventListener("click", (e) => {
    const b = e.target.closest("[data-objeto]");
    if (b) { estado.form.objeto = b.dataset.objeto; pintarConstructor(); }
  });
  $("#celebracionGrupo").addEventListener("click", (e) => {
    const b = e.target.closest("[data-cel]");
    if (b) { estado.form.celebracion = b.dataset.cel; pintarConstructor(); }
  });
  $("#puntosGrupo").addEventListener("click", (e) => {
    const b = e.target.closest("[data-puntos]");
    if (b) { estado.form.puntos = Number(b.dataset.puntos); pintarConstructor(); }
  });
  $("#btnGrabar").addEventListener("click", alternarGrabacion);
  $("#btnOirVoz").addEventListener("click", () => reproducir(estado.form.audio));
  $("#btnCancelar").addEventListener("click", limpiarFormulario);
  $("#constructorForm").addEventListener("submit", (e) => { e.preventDefault(); guardar(); });
  $("#btnGuardarOtro").addEventListener("click", () => guardar({ otro: true }));
}

iniciar();
