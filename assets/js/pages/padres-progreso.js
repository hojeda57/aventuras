import { api } from "../core/api.js";
import { $, esc, toast } from "../core/dom.js";
import { FIGURITAS } from "../core/constantes.js";
import { renderHeader } from "../components/header.js";
import { renderFooter } from "../components/footer.js";
import { exigirAdulto } from "../components/gate-padres.js";
import { avatarHTML } from "../components/nina-barra.js";

const e = { perfil: null, progreso: null, perfiles: [] };

async function iniciar() {
  await exigirAdulto();
  try { [e.perfil, e.progreso, e.perfiles] = await Promise.all([api.perfil(), api.progreso(), api.perfiles()]); }
  catch (err) { toast(`No se pudo conectar con el servidor: ${err.message}`, "error"); return; }
  render();
  if (location.hash === "#config") $("#config")?.scrollIntoView();
}

const tarjeta = (emoji, valor, etiqueta) => `
  <div class="bg-surface-container-lowest rounded-lg p-space-md shadow-sm flex items-center gap-space-sm">
    <span class="text-[36px]">${emoji}</span>
    <div><p class="font-headline-md text-headline-md">${valor}</p><p class="font-body-sm text-body-sm text-on-surface-variant">${etiqueta}</p></div>
  </div>`;

function barraPct(titulo, pct) {
  return `<div>
    <div class="flex justify-between font-label-md text-label-md mb-1"><span>${titulo}</span><span>${pct == null ? "sin datos" : pct + "%"}</span></div>
    <div class="h-3 rounded-full bg-surface-container-high overflow-hidden"><div class="h-full rounded-full ${pct >= 80 ? "bg-tertiary-container" : pct >= 60 ? "bg-primary-container" : "bg-error"}" style="width:${pct ?? 0}%"></div></div>
  </div>`;
}

function nivelArea(area, clave, titulo) {
  const p = e.progreso, n = p[clave] || 1, ac = p.aciertosPorNivel[area]?.[n] ?? 0, meta = p.aciertosParaSubir;
  return `<div class="bg-surface-container-lowest rounded-lg p-space-md shadow-sm">
    <div class="flex items-center justify-between mb-space-sm">
      <h3 class="font-headline-sm text-headline-sm">${titulo}</h3>
      <div class="flex items-center gap-1" role="group" aria-label="Cambiar nivel de ${titulo}">
        <button type="button" data-nivel="${clave}" data-delta="-1" ${n <= 1 ? "disabled" : ""} aria-label="Bajar nivel" class="w-9 h-9 rounded-full bg-surface-container disabled:opacity-30">−</button>
        <span class="px-3 font-label-lg text-label-lg">Nivel ${n}</span>
        <button type="button" data-nivel="${clave}" data-delta="1" ${n >= 3 ? "disabled" : ""} aria-label="Subir nivel" class="w-9 h-9 rounded-full bg-surface-container disabled:opacity-30">+</button>
      </div>
    </div>
    <div class="h-3 rounded-full bg-surface-container-high overflow-hidden"><div class="h-full bg-secondary rounded-full" style="width:${Math.min(100, (ac / meta) * 100)}%"></div></div>
    <p class="font-body-sm text-body-sm text-on-surface-variant mt-1">${Math.min(ac, meta)} de ${meta} aciertos ${n < 3 ? `para pasar al nivel ${n + 1}` : "para el diploma final"}</p>
  </div>`;
}

function render() {
  const p = e.progreso, pf = e.perfil;
  renderHeader($("#app-header"), { activo: "progreso", perfil: pf });
  renderFooter($("#app-footer"));
  const max = Math.max(...p.semana.map((d) => d.total), 1);
  const dias = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  const figus = FIGURITAS.filter((f) => p.puntos >= f.puntos);

  if (pf.sinPerfil) {
    $("#app").innerHTML = `<p class="mt-space-xl text-center text-on-surface-variant">Todavía no hay jugadores. <a href="ajustes.html#jugadores" class="underline">Crear uno</a>.</p>`;
    return;
  }
  $("#app").innerHTML = `
    ${e.perfiles.length > 1 ? `<div class="mt-space-md flex gap-2 flex-wrap" role="group" aria-label="Elegir chico">
      ${e.perfiles.map((x) => `<button type="button" data-perfil="${esc(x.id)}" class="flex items-center gap-2 pl-1 pr-4 py-1 rounded-full ${x.activo ? "bg-secondary text-on-secondary" : "bg-surface-container-low hover:bg-surface-container-high"}">
        ${avatarHTML(x.avatar, "w-9 h-9 text-[20px]")}<span class="font-label-lg text-label-lg">${esc(x.nombre)}</span></button>`).join("")}
    </div>` : ""}
    <section class="mt-space-md flex items-center gap-space-md">
      ${avatarHTML(pf.avatar, "w-16 h-16 text-[40px]")}
      <div>
        <h1 class="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg">Progreso de ${esc(pf.nombre)}</h1>
        <p class="text-on-surface-variant">${p.totalIntentos ? `${p.totalIntentos} ejercicios intentados en total` : "Todavía no jugó. Tocá «Jugar» para empezar."}</p>
      </div>
    </section>

    <section class="grid grid-cols-2 md:grid-cols-4 gap-space-md">
      ${tarjeta("⭐", p.puntos, "estrellas ganadas")}
      ${tarjeta("🔥", p.racha, p.racha === 1 ? "día seguido" : "días seguidos")}
      ${tarjeta("🎯", `${p.hoy}/${p.metaDiaria}`, "aciertos hoy")}
      ${tarjeta("🃏", `${figus.length}/${FIGURITAS.length}`, "figuritas")}
    </section>

    <section class="grid grid-cols-1 md:grid-cols-2 gap-space-md">
      ${nivelArea("lectura", "nivelLectura", "📖 Lectura")}
      ${nivelArea("mate", "nivelMate", "🔢 Números")}
      ${nivelArea("ingles", "nivelIngles", "🏰 Inglés")}
      ${nivelArea("kiosco", "nivelKiosco", "🏪 Kiosco")}
    </section>

    <section class="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
      <div class="bg-surface-container-lowest rounded-lg p-space-md shadow-sm space-y-space-sm">
        <h2 class="font-headline-sm text-headline-sm">Aciertos por tema</h2>
        ${barraPct("Lectura", p.porcentajes.lectura)}${barraPct("Sumas", p.porcentajes.suma)}
        ${barraPct("Restas", p.porcentajes.resta)}${barraPct("Contar", p.porcentajes.contar)}
        ${barraPct("Inglés", p.porcentajes.ingles)}${barraPct("Kiosco (plata)", p.porcentajes.kiosco)}
      </div>
      <div class="bg-surface-container-lowest rounded-lg p-space-md shadow-sm">
        <h2 class="font-headline-sm text-headline-sm mb-space-sm">Últimos 7 días</h2>
        <div class="flex items-end gap-2 h-36">
          ${p.semana.map((d) => `<div class="flex-1 flex flex-col items-center justify-end h-full gap-1">
            <span class="font-label-sm text-label-sm">${d.total || ""}</span>
            <div class="w-full rounded-t-[0.5rem] bg-secondary" style="height:${Math.max(4, (d.total / max) * 100)}%"></div>
            <span class="font-label-sm text-label-sm text-on-surface-variant">${dias[new Date(d.fecha + "T12:00").getDay()]}</span></div>`).join("")}
        </div>
      </div>
    </section>

    <section class="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
      <div class="bg-surface-container-lowest rounded-lg p-space-md shadow-sm">
        <h2 class="font-headline-sm text-headline-sm mb-space-sm">Para practicar más</h2>
        ${p.paraPracticar.length ? `<ul class="space-y-2">${p.paraPracticar.map((x) => `
          <li class="flex justify-between gap-2 p-2 rounded bg-surface-container-low"><span>${{ lectura: "📖", mate: "🔢", ingles: "🏰", kiosco: "🏪" }[x.area]} ${esc(x.nombre)}</span>
          <span class="font-label-sm text-label-sm text-on-surface-variant">${x.fallas} ${x.fallas === 1 ? "vez" : "veces"} sin lograrlo</span></li>`).join("")}</ul>`
          : `<p class="text-on-surface-variant">Nada pendiente por ahora.</p>`}
      </div>
      <div class="bg-surface-container-lowest rounded-lg p-space-md shadow-sm">
        <h2 class="font-headline-sm text-headline-sm mb-space-sm">Actividad reciente</h2>
        ${p.recientes.length ? `<ul class="space-y-1 max-h-72 overflow-y-auto">${p.recientes.map((x) => `
          <li class="flex justify-between gap-2 py-1.5 border-b border-surface-container-high">
            <span>${x.correcto ? "✅" : "🔁"} ${esc(x.nombre)} <span class="text-on-surface-variant font-body-sm">· N${x.nivel}</span></span>
            <span class="font-label-sm text-label-sm text-on-surface-variant whitespace-nowrap">${new Date(x.ts).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span></li>`).join("")}</ul>`
          : `<p class="text-on-surface-variant">Sin actividad todavía.</p>`}
      </div>
    </section>

    <section id="config" class="bg-surface-container-lowest rounded-lg p-space-md shadow-sm">
      <h2 class="font-headline-sm text-headline-sm mb-space-sm">Configuración</h2>
      <form id="formConfig" class="grid grid-cols-1 sm:grid-cols-5 gap-space-sm items-end">
        <label class="font-label-sm text-label-sm text-on-surface-variant">Nombre
          <input name="nombre" value="${esc(pf.nombre)}" required class="mt-1 w-full min-h-[44px] px-3 rounded bg-surface-container-low text-on-surface font-body-md"></label>
        <label class="font-label-sm text-label-sm text-on-surface-variant">Edad
          <input name="edad" type="number" min="3" max="12" value="${esc(pf.edad)}" class="mt-1 w-full min-h-[44px] px-3 rounded bg-surface-container-low text-on-surface font-body-md"></label>
        <label class="font-label-sm text-label-sm text-on-surface-variant">Elogios para
          <select name="genero" class="mt-1 w-full min-h-[44px] px-3 rounded bg-surface-container-low text-on-surface font-body-md">
            <option value="a" ${pf.genero !== "o" ? "selected" : ""}>nena («¡sos una genia!»)</option>
            <option value="o" ${pf.genero === "o" ? "selected" : ""}>nene («¡sos un genio!»)</option></select></label>
        <label class="font-label-sm text-label-sm text-on-surface-variant">Meta diaria (aciertos)
          <input name="metaDiaria" type="number" min="1" max="30" value="${esc(pf.metaDiaria)}" class="mt-1 w-full min-h-[44px] px-3 rounded bg-surface-container-low text-on-surface font-body-md"></label>
        <button class="min-h-[44px] rounded-full bg-primary-container text-on-primary-container font-label-lg text-label-lg">Guardar</button>
        <label class="sm:col-span-5 flex items-center gap-2 font-body-md">
          <input type="checkbox" name="dificultadAdaptativa" ${pf.dificultadAdaptativa !== false ? "checked" : ""} class="w-5 h-5 accent-[#006591]">
          Subir de nivel automáticamente al lograr ${p.aciertosParaSubir} aciertos</label>
      </form>
      <div class="mt-space-md pt-space-md border-t border-surface-container-high flex flex-wrap items-center justify-between gap-2">
        <p class="font-body-sm text-body-sm text-on-surface-variant">Reiniciar borra estrellas, niveles, figuritas e historial (no borra los contenidos).</p>
        <button id="btnReiniciar" type="button" class="px-4 min-h-[40px] rounded-full bg-error-container text-on-error-container font-label-md text-label-md">Reiniciar progreso</button>
      </div>
    </section>`;

  $("#app").onclick = async (ev) => {
    const elegir = ev.target.closest("[data-perfil]");
    if (elegir) { await api.activarPerfil(elegir.dataset.perfil); location.reload(); return; }
    const b = ev.target.closest("[data-nivel]");
    if (!b) return;
    const clave = b.dataset.nivel;
    try {
      e.perfil = await api.actualizarPerfil({ [clave]: (e.progreso[clave] || 1) + Number(b.dataset.delta) });
      e.progreso = await api.progreso();
      render();
      toast("Nivel actualizado");
    } catch (err) { toast(err.message, "error"); }
  };
  $("#formConfig").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const f = new FormData(ev.target);
    try {
      e.perfil = await api.actualizarPerfil({
        nombre: f.get("nombre").trim() || e.perfil.nombre, edad: Number(f.get("edad")),
        metaDiaria: Math.max(1, Number(f.get("metaDiaria"))), dificultadAdaptativa: f.has("dificultadAdaptativa"), genero: f.get("genero"),
      });
      e.progreso = await api.progreso();
      render();
      toast("Configuración guardada");
    } catch (err) { toast(err.message, "error"); }
  });
  $("#btnReiniciar").addEventListener("click", async () => {
    if (!confirm(`¿Reiniciar todo el progreso de ${e.perfil.nombre}? No se puede deshacer.`)) return;
    try { e.progreso = await api.reiniciarProgreso(); e.perfil = await api.perfil(); render(); toast("Progreso reiniciado"); }
    catch (err) { toast(err.message, "error"); }
  });
}

iniciar();
