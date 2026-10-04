import { api } from "../core/api.js";
import { guardiaNina } from "../components/nina-guardia.js";
import { $, $$, esc, toast } from "../core/dom.js";
import { ANIMOS, FIGURITAS, GRACIAS_KIOSCO, NIVELES_KIOSCO, frase, g } from "../core/constantes.js";
import { actualizarBarra, renderBarra } from "../components/nina-barra.js";
import { celebrar } from "../components/celebracion.js";
import { billeteHTML, pesos } from "../components/billete.js";
import { detener, hablar } from "../utils/audio.js";
import { sonido } from "../utils/sonidos.js";
import { azar, mezclar, solucion, sumaDeBilletes } from "../utils/plata.js";
import { dibujoHTML } from "../components/dibujo.js";

const POR_SESION = 5;
const FESTEJOS = ["globos", "cohetes", "estrellas", "confeti"];
const e = { perfil: null, progreso: null, billetes: [], productos: [], nivel: 1, sesion: [], idx: 0, ej: null,
  mostrador: [], intentos: 0, aciertos: 0, puntosInicio: 0, subio: false, ocupado: false };
const nombre = () => e.perfil?.nombre || "";
const billete = (valor) => e.billetes.find((b) => b.valor === valor) || { valor };
const valoresHasta = (max) => e.billetes.filter((b) => b.valor <= max).map((b) => b.valor);

// ------------------------------------------------------------------ inicio
async function iniciar() {
  if (!(await guardiaNina("kiosco"))) return;
  try {
    [e.perfil, e.progreso, e.billetes, e.productos] = await Promise.all([
      api.perfil(), api.progreso(), api.listar("billetes"), api.listar("productos")]);
  } catch (err) { toast(`No se pudo conectar: ${err.message}`, "error"); return; }
  e.billetes = e.billetes.filter((b) => b.activo).sort((a, b) => a.valor - b.valor);
  renderBarra($("#barra"), { perfil: e.perfil, progreso: e.progreso });
  e.nivel = e.progreso.nivelKiosco || 1;
  pantallaElegir();
}

const toldo = `<div class="h-10 rounded-t-[2rem]" style="background:repeating-linear-gradient(90deg,#f43f5e 0 48px,#ffffff 48px 96px)"></div>
  <div class="h-4" style="background:radial-gradient(circle at 24px -4px,#f43f5e 22px,transparent 23px) 0 0/48px 16px repeat-x"></div>`;

function pantallaElegir() {
  detener();
  const desbloqueado = e.progreso.nivelKiosco || 1;
  $("#app").innerHTML = `
    <section class="bg-white rounded-[2rem] shadow-[0_8px_0_0_#ffddb8] overflow-hidden max-w-4xl mx-auto">
      ${toldo}
      <div class="p-space-lg text-center">
        <h1 class="font-headline-xl-mobile text-headline-xl-mobile sm:font-headline-xl sm:text-headline-xl">🏪 El Kiosco de ${esc(nombre())}</h1>
        <p class="font-body-lg text-body-lg text-on-surface-variant">¡Vamos de compras! Aprendé cuánto vale cada billete.</p>
        <div class="flex justify-center gap-2 flex-wrap my-space-md">${e.billetes.filter((b) => b.valor <= 1000).map((b) => billeteHTML(b, { tam: "sm" })).join("")}</div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-space-md mt-space-md">
          ${[1, 2, 3].map((n) => {
            const m = NIVELES_KIOSCO[n], bloqueado = n > desbloqueado;
            return `<button type="button" data-nivel="${n}" ${bloqueado ? "disabled" : ""}
              class="btn-tactil rounded-[2rem] p-space-md shadow-[0_6px_0_0_rgba(0,0,0,0.1)] ${bloqueado ? "bg-surface-container opacity-60 cursor-not-allowed" : "bg-[linear-gradient(160deg,#fff3c4,#ffddb8)] hover:-translate-y-1 transition-transform"}">
              <span class="block text-[64px] leading-none">${bloqueado ? "🔒" : m.emoji}</span>
              <span class="block font-label-lg text-label-lg mt-2">${"⭐".repeat(n)} Nivel ${n}</span>
              <span class="block font-headline-sm text-headline-sm">${m.titulo}</span>
            </button>`;
          }).join("")}
        </div>
        ${desbloqueado < 3 ? `<p class="mt-space-md font-label-lg text-label-lg text-on-surface-variant">🔒 El nivel siguiente se abre con ${e.progreso.aciertosParaSubir} compras correctas en tu nivel.</p>` : ""}
      </div>
    </section>`;
  $$("[data-nivel]").forEach((b) => b.addEventListener("click", () => { e.nivel = Number(b.dataset.nivel); empezar(); }));
}

function empezar() {
  if (!e.billetes.length || !e.productos.length) { toast("Faltan billetes o productos (Zona de papás → Kiosco).", "error"); return; }
  const productos = [...e.productos].sort((a, b) => (a.dominada || 0) - (b.dominada || 0) || Math.random() - 0.5);
  Object.assign(e, { sesion: productos.slice(0, POR_SESION), idx: 0, aciertos: 0, puntosInicio: e.progreso.puntos, subio: false });
  pantallaJuego();
}

// ------------------------------------------------------------------ ejercicios
function armarEjercicio(producto) {
  const cfg = NIVELES_KIOSCO[e.nivel];
  const valores = valoresHasta(cfg.maxBillete);
  const tipo = azar(cfg.tipos);
  if (tipo === "reconocer") {
    const objetivo = azar(valores);
    return { tipo, producto, objetivo, opciones: mezclar([objetivo, ...mezclar(valores.filter((v) => v !== objetivo)).slice(0, 2)]) };
  }
  if (tipo === "pagarUno") return { tipo, producto, precio: azar(valores), billetera: valores };
  if (tipo === "juntar") {
    const { total } = sumaDeBilletes(valores, 2 + Math.floor(Math.random() * 2), cfg.maxTotal);
    return { tipo, producto, precio: total, billetera: valores };
  }
  if (tipo === "vuelto") {
    const grandes = e.billetes.map((b) => b.valor).filter((v) => v >= 50 && v <= Math.max(1000, cfg.maxBillete));
    const pago = azar(grandes.length ? grandes : [100]);
    const paso = pago >= 500 ? 100 : pago >= 100 ? 10 : 10;
    const posibles = Array.from({ length: pago / paso - 1 }, (_, i) => (i + 1) * paso);
    const precio = azar(posibles);
    const vuelto = pago - precio;
    const opciones = new Set([vuelto]);
    for (const d of mezclar([paso, -paso, 2 * paso, -2 * paso])) {
      if (opciones.size === 3) break;
      if (vuelto + d > 0 && vuelto + d < pago) opciones.add(vuelto + d);
    }
    return { tipo, producto, precio, pago, vuelto, opciones: mezclar([...opciones]) };
  }
  // alcanza: ¿le alcanza con la plata que tiene?
  const { total, elegidos } = sumaDeBilletes(valores, 2 + Math.floor(Math.random() * 2), cfg.maxTotal);
  const delta = azar([10, 20, 50, 100].filter((d) => d < total));
  const precio = Math.random() < 0.5 ? total - delta : total + delta;
  return { tipo, producto, precio, monedero: elegidos, total, alcanza: precio <= total };
}

function consigna(ej) {
  const p = ej.producto.nombre.toLowerCase();
  switch (ej.tipo) {
    case "reconocer": return `¿Cuál es el billete de ${ej.objetivo} pesos? ¡Tocalo!`;
    case "pagarUno": return `¡Hola, ${nombre()}! ${ej.producto.nombre} cuesta ${ej.precio} pesos. Pagá con un billete.`;
    case "juntar": return `${ej.producto.nombre} cuesta ${ej.precio} pesos. Juntá los billetes para pagar justo.`;
    case "vuelto": return `Comprás ${p} de ${ej.precio} pesos y pagás con ${ej.pago}. ¿Cuánto vuelto te doy?`;
    default: return `Tenés estos billetes. ${ej.producto.nombre} cuesta ${ej.precio} pesos. ¿Te alcanza?`;
  }
}

// ------------------------------------------------------------------ pantalla
function pantallaJuego() {
  const ej = (e.ej = armarEjercicio(e.sesion[e.idx]));
  e.mostrador = []; e.intentos = 0;
  const texto = consigna(ej);
  const puntos = e.sesion.map((_, i) => `<span class="w-4 h-4 rounded-full ${i < e.idx ? "bg-tertiary-container" : i === e.idx ? "bg-[#f43f5e] scale-125" : "bg-white"}"></span>`).join("");
  const conPrecio = ej.tipo !== "reconocer";

  $("#app").innerHTML = `
    <div class="flex items-center justify-between mb-space-sm max-w-5xl mx-auto">
      <a href="kiosco.html" class="font-label-lg text-label-lg text-secondary">← Cambiar nivel</a>
      <div class="flex gap-2 items-center" aria-label="Progreso">${puntos}</div>
    </div>
    <section id="kiosco" class="bg-white rounded-[2rem] shadow-[0_8px_0_0_#ffddb8] overflow-hidden max-w-5xl mx-auto">
      ${toldo}
      <div class="p-space-md sm:p-space-lg">
        <div class="flex items-start gap-space-sm mb-space-md">
          <span class="text-[56px] leading-none shrink-0" aria-hidden="true">👩‍🦱</span>
          <div class="relative bg-[#fff3c4] rounded-[1.5rem] px-space-md py-space-sm font-headline-sm text-headline-sm flex-1">
            <span id="globo">${esc(texto)}</span>
            <button id="btnOir" type="button" aria-label="Escuchar" class="ml-2 align-middle w-10 h-10 rounded-full bg-white text-[20px]">🔊</button>
          </div>
        </div>

        <div class="grid grid-cols-1 ${conPrecio ? "md:grid-cols-[220px_1fr]" : ""} gap-space-md items-stretch">
          ${conPrecio ? `
          <div id="producto" class="rounded-[1.75rem] bg-surface-container-low p-space-md text-center flex flex-col items-center justify-center transition-transform duration-700">
            ${dibujoHTML(ej.producto, { clases: "text-[96px]", tamImg: "w-36 h-36", defecto: "🛍️" })}
            <span class="font-headline-sm text-headline-sm mt-1">${esc(ej.producto.nombre)}</span>
            <span class="mt-2 px-4 py-1.5 rounded-[0.75rem] bg-[#fdd835] text-[#3e2723] font-bold text-[30px] shadow-[0_3px_0_0_#c6a700] -rotate-3">${pesos(ej.precio)}</span>
          </div>` : ""}
          <div id="zona">${zonaHTML(ej)}</div>
        </div>
        <p id="estado" class="text-center font-headline-sm text-headline-sm min-h-[32px] mt-space-md" aria-live="polite"></p>
      </div>
    </section>
    ${["pagarUno", "juntar"].includes(ej.tipo) ? `
    <section class="max-w-5xl mx-auto mt-space-md bg-[#795548] rounded-[2rem] p-space-md shadow-[0_6px_0_0_#4e342e]">
      <p class="text-white font-label-lg text-label-lg mb-2">👛 Tu billetera — tocá un billete para ponerlo en el mostrador</p>
      <div id="billetera" class="flex flex-wrap justify-center gap-space-sm">
        ${ej.billetera.map((v) => `<button type="button" data-billetera="${v}" class="btn-tactil rounded-md hover:-translate-y-1 transition-transform" aria-label="Billete de ${v} pesos">${billeteHTML(billete(v), { tam: "md" })}</button>`).join("")}
      </div>
    </section>` : ""}`;

  $("#btnOir").addEventListener("click", () => { sonido.tap(); hablar(consigna(ej)); });
  $("#app").onclick = alTocar;
  setTimeout(() => hablar(texto), 300);
}

function zonaHTML(ej) {
  if (ej.tipo === "reconocer")
    return `<div class="flex flex-wrap justify-center gap-space-md py-space-md">
      ${ej.opciones.map((v) => `<button type="button" data-op="${v}" class="btn-tactil p-2 rounded-[1rem] border-4 border-transparent hover:-translate-y-1 transition-transform" aria-label="Billete">${billeteHTML(billete(v), { tam: "lg" })}</button>`).join("")}
    </div>`;
  if (ej.tipo === "vuelto")
    return `<div class="rounded-[1.75rem] bg-surface-container-low p-space-md text-center h-full flex flex-col justify-center">
      <p class="font-label-lg text-label-lg mb-2">Pagaste con:</p>
      <div class="flex justify-center">${billeteHTML(billete(ej.pago), { tam: "lg" })}</div>
      <p class="font-headline-sm text-headline-sm mt-space-md">¿Cuánto vuelto?</p>
      <div class="flex justify-center gap-space-sm mt-2 flex-wrap">
        ${ej.opciones.map((v) => `<button type="button" data-op="${v}" class="btn-tactil min-w-[110px] px-5 py-3 rounded-full bg-white border-4 border-surface-container-high text-[30px] font-bold shadow-[0_4px_0_0_#dee8ff]">${pesos(v)}</button>`).join("")}
      </div></div>`;
  if (ej.tipo === "alcanza")
    return `<div class="rounded-[1.75rem] bg-surface-container-low p-space-md text-center h-full flex flex-col justify-center">
      <p class="font-label-lg text-label-lg mb-2">👛 Tenés:</p>
      <div class="flex justify-center gap-2 flex-wrap">${ej.monedero.map((v) => billeteHTML(billete(v), { tam: "md" })).join("")}</div>
      <p class="font-headline-sm text-headline-sm mt-space-md">¿Te alcanza para comprarlo?</p>
      <div class="flex justify-center gap-space-md mt-2">
        <button type="button" data-op="si" class="btn-tactil px-8 py-4 rounded-full bg-tertiary text-on-tertiary font-headline-md text-headline-md shadow-[0_4px_0_0_#004e34]">👍 Sí</button>
        <button type="button" data-op="no" class="btn-tactil px-8 py-4 rounded-full bg-error text-on-error font-headline-md text-headline-md shadow-[0_4px_0_0_#93000a]">👎 No</button>
      </div></div>`;
  const total = e.mostrador.reduce((a, b) => a + b, 0);
  return `<div class="rounded-[1.75rem] border-4 border-dashed border-[#d7ccc8] bg-[#efebe9] p-space-md h-full flex flex-col">
    <p class="font-label-lg text-label-lg text-[#5d4037]">🧾 Mostrador</p>
    <div id="mostrador" class="flex-1 flex flex-wrap items-center justify-center gap-2 min-h-[110px] py-2">
      ${e.mostrador.length ? e.mostrador.map((v, i) => `<button type="button" data-quitar="${i}" aria-label="Sacar billete de ${v}" class="btn-tactil">${billeteHTML(billete(v), { tam: "md" })}</button>`).join("")
        : `<span class="text-on-surface-variant font-body-lg">Poné acá los billetes 👇</span>`}
    </div>
    <div class="flex items-center justify-between gap-space-sm flex-wrap">
      <span class="font-headline-sm text-headline-sm">${ej.tipo === "juntar" ? `Pusiste: <b>${pesos(total)}</b>` : ""}</span>
      <button type="button" id="btnPagar" ${e.mostrador.length ? "" : "disabled"} class="btn-tactil px-8 py-4 rounded-full bg-tertiary text-on-tertiary font-headline-md text-headline-md shadow-[0_4px_0_0_#004e34] disabled:opacity-40">💳 Pagar</button>
    </div>
  </div>`;
}

const redibujarZona = () => { $("#zona").innerHTML = zonaHTML(e.ej); };

// ------------------------------------------------------------------ interacción
async function alTocar(ev) {
  if (e.ocupado) return;
  const ej = e.ej;
  const deBilletera = ev.target.closest("[data-billetera]");
  if (deBilletera) {
    const v = Number(deBilletera.dataset.billetera);
    sonido.tap();
    hablar(`${v}`);
    e.mostrador = ej.tipo === "pagarUno" ? [v] : [...e.mostrador, v].slice(0, 8);
    return redibujarZona();
  }
  const quitar = ev.target.closest("[data-quitar]");
  if (quitar) { sonido.tap(); e.mostrador.splice(Number(quitar.dataset.quitar), 1); return redibujarZona(); }
  if (ev.target.closest("#btnPagar")) {
    const total = e.mostrador.reduce((a, b) => a + b, 0);
    if (total === ej.precio) return acierto();
    const falta = ej.precio - total;
    return fallo(falta > 0
      ? (ej.tipo === "juntar" ? `Te faltan ${pesos(falta)}. ¡Agregá otro billete!` : "Ese billete no alcanza. ¡Probá con otro!")
      : (ej.tipo === "juntar" ? `Pusiste ${pesos(-falta)} de más. ¡Tiene que ser justo!` : "Ese billete es de más. ¡Buscá el justo!"));
  }
  const op = ev.target.closest("[data-op]");
  if (op && !op.disabled) {
    const v = op.dataset.op;
    const correcto = ej.tipo === "reconocer" ? Number(v) === ej.objetivo
      : ej.tipo === "vuelto" ? Number(v) === ej.vuelto
      : (v === "si") === ej.alcanza;
    if (correcto) { op.classList.add("ring-4", "ring-tertiary-container", "rounded-[1rem]"); return acierto(); }
    op.disabled = true; op.classList.add("opacity-40", "sacudir");
    const msg = ej.tipo === "reconocer" ? `Ese es el de ${v}. ¡Buscá el de ${ej.objetivo}!`
      : ej.tipo === "vuelto" ? "Mmm, contá otra vez." : (ej.alcanza ? "¡Sí te alcanza! Sumá tus billetes." : "No te alcanza, sumá tus billetes.");
    return fallo(msg);
  }
}

async function fallo(mensaje) {
  e.ocupado = true;
  e.intentos++;
  sonido.error();
  const ej = e.ej;
  const max = ej.tipo === "alcanza" ? 1 : 3;
  $("#estado").textContent = `🧡 ${mensaje}`;
  await hablar(mensaje);

  if (e.intentos >= max) {
    let explica;
    if (ej.tipo === "alcanza") explica = `Tenías ${ej.total} pesos y cuesta ${ej.precio}. ${ej.alcanza ? "¡Te alcanzaba!" : "No alcanzaba."}`;
    else if (ej.tipo === "vuelto") explica = `El vuelto era ${ej.vuelto} pesos.`;
    else if (ej.tipo === "reconocer") explica = `Era este billete de ${ej.objetivo} pesos.`;
    else {
      const sol = solucion(ej.precio, ej.billetera) || [];
      e.mostrador = sol; redibujarZona();
      explica = `Se podía pagar con ${sol.join(" más ")}.`;
    }
    $(`[data-op="${ej.tipo === "reconocer" ? ej.objetivo : ej.tipo === "vuelto" ? ej.vuelto : ej.alcanza ? "si" : "no"}"]`)?.classList.add("latido", "ring-4", "ring-tertiary-container");
    $("#estado").textContent = `💜 ${explica}`;
    await hablar(explica);
    api.registrar("kiosco", ej.producto.id, false, e.nivel).catch(() => {});
    await new Promise((r) => setTimeout(r, 1200));
    e.ocupado = false;
    return siguiente();
  }
  if (e.intentos === 2 && ["pagarUno", "juntar"].includes(ej.tipo)) {  // pista: marcar billetes que sirven
    const sol = new Set(solucion(ej.precio, ej.billetera) || []);
    $$("[data-billetera]").forEach((b) => sol.has(Number(b.dataset.billetera)) && b.classList.add("latido"));
    $("#estado").textContent = "👀 Mirá los billetes que se mueven…";
  }
  e.ocupado = false;
}

async function acierto() {
  e.ocupado = true;
  const ej = e.ej;
  let res;
  try { res = await api.registrar("kiosco", ej.producto.id, true, e.nivel); }
  catch (err) { toast(err.message, "error"); e.ocupado = false; return; }
  e.progreso = res.progreso; e.aciertos++; e.subio ||= res.subioNivel;
  actualizarBarra(e.progreso);
  sonido.exito();
  const gracias = ej.tipo === "reconocer" ? `¡Muy bien, ${nombre()}! Ese es el billete de ${ej.objetivo}.`
    : ej.tipo === "alcanza" ? (ej.alcanza ? "¡Exacto! Te alcanza." : "¡Exacto! No te alcanzaba, ¡qué buena cuenta!")
    : frase(GRACIAS_KIOSCO, nombre()).replace("{p}", ej.producto.nombre.toLowerCase());
  $("#globo").textContent = gracias;
  const prod = $("#producto");
  if (prod && ej.tipo !== "alcanza") prod.style.transform = "translateY(-30px) scale(1.1) rotate(-6deg)";
  await Promise.all([
    hablar(gracias).then(() => hablar(g(`¡Sos {un} {genia}, ${nombre()}!`), { encolar: true })),
    celebrar({ tipo: azar(FESTEJOS), titulo: `¡Muy bien, ${nombre()}!`, subtitulo: ej.tipo === "reconocer" ? `Billete de ${pesos(ej.objetivo)}` : ej.producto.imagen ? ej.producto.nombre : `${ej.producto.emoji} ${ej.producto.nombre}`, puntos: res.puntosGanados }),
  ]);
  e.ocupado = false;
  siguiente();
}

function siguiente() {
  e.idx++;
  e.idx < e.sesion.length ? pantallaJuego() : pantallaFin();
}

async function pantallaFin() {
  const nuevas = FIGURITAS.filter((f) => f.puntos > e.puntosInicio && f.puntos <= e.progreso.puntos);
  $("#app").innerHTML = `
    <section class="bg-white rounded-[2rem] shadow-[0_8px_0_0_#ffddb8] overflow-hidden max-w-3xl mx-auto text-center">
      ${toldo}
      <div class="p-space-xl">
        <p class="text-[96px] leading-none">🛍️</p>
        <h1 class="font-headline-xl-mobile text-headline-xl-mobile sm:font-headline-xl sm:text-headline-xl mt-space-sm">¡Qué buenas compras!</h1>
        <p class="font-body-lg text-body-lg text-on-surface-variant mt-1">Hiciste bien ${e.aciertos} de ${e.sesion.length}</p>
        <p class="inline-block mt-space-md px-6 py-3 rounded-full bg-primary-fixed text-on-primary-fixed font-headline-md text-headline-md">+${e.progreso.puntos - e.puntosInicio} ⭐</p>
        ${nuevas.length ? `<div class="mt-space-lg p-space-md rounded-[2rem] bg-surface-container-low">
          <p class="font-headline-sm text-headline-sm">¡Figurita nueva en el cofre!</p>
          <p class="text-[72px] leading-tight">${nuevas.map((f) => f.emoji).join(" ")}</p></div>` : ""}
        <div class="flex flex-col sm:flex-row justify-center gap-space-md mt-space-lg">
          <button id="otra" type="button" class="btn-tactil px-7 py-4 rounded-full bg-[#f43f5e] text-white font-headline-sm text-headline-sm shadow-[0_4px_0_0_#9f1239]">🔁 Otra vez</button>
          <a href="kiosco.html" class="btn-tactil px-7 py-4 rounded-full bg-[#fff3c4] font-headline-sm text-headline-sm shadow-[0_4px_0_0_#fdd835]">💵 Elegir nivel</a>
          <a href="index.html" class="btn-tactil px-7 py-4 rounded-full bg-white border-2 border-surface-container-high font-headline-sm text-headline-sm">🏠 Mapa</a>
        </div>
      </div>
    </section>`;
  $("#otra").addEventListener("click", empezar);
  if (e.subio) {
    sonido.nivel();
    hablar(`¡Felicitaciones, ${nombre()}! ¡Subiste al nivel ${e.progreso.nivelKiosco} del kiosco!`);
    await celebrar({ tipo: "confeti", titulo: `¡Subiste al nivel ${e.progreso.nivelKiosco}!`, subtitulo: "Se abrieron compras nuevas", duracion: 4500 });
    e.nivel = e.progreso.nivelKiosco;
  } else {
    hablar(nuevas.length ? "¡Ganaste una figurita nueva!" : `¡Qué buenas compras, ${nombre()}!`);
  }
}

iniciar();
