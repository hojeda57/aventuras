// Implementación "local": versión web/móvil. Reproduce la lógica de backend/app.py en el navegador
// y guarda todo en el dispositivo (IndexedDB). Misma interfaz que api-servidor.js.
import { kv, archivos } from "./db-local.js";
import { verifyAsync } from "../vendor/noble-ed25519.js";
import { CLAVE_PUBLICA } from "../clave_publica.js";

const RAIZ = new URL("../../../", import.meta.url); // carpeta raíz de la app (donde está index.html)
const VERSION = "1.3.0";
const COLECCIONES = ["lectura", "matematicas", "ingles", "billetes", "productos"];
const AREAS = { lectura: "lectura", mate: "matematicas", ingles: "ingles", kiosco: "productos" };
const CONTADOR = { lectura: ["lectura", "dominada"], matematicas: ["mate", "superado"], ingles: ["ingles", "dominada"], productos: ["kiosco", "dominada"] };
const CLAVE_NIVEL = { lectura: "nivelLectura", mate: "nivelMate", ingles: "nivelIngles", kiosco: "nivelKiosco" };
const ACIERTOS_PARA_SUBIR = 8;
const PUNTOS_LECTURA = { palabra: 10, frase: 15, cuento: 30 };
const EDICION_POR_DEFECTO = { edicion: "familiar", marca: { nombre: "Aventuras", corto: "Aventuras" }, gratis: ["lectura", "mate"] };

const falla = (msg) => { throw new Error(msg); };
const nuevoId = (n = 8) => Array.from(crypto.getRandomValues(new Uint8Array(n / 2)), (b) => b.toString(16).padStart(2, "0")).join("");
const fechaLocal = (d = new Date()) => new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const ahoraLocal = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 19);
const copia = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)));

// ---------------------------------------------------------------- arranque: edición y contenidos iniciales
async function cargarJSON(ruta, defecto) {
  try {
    const r = await fetch(new URL(ruta, RAIZ));
    return r.ok ? await r.json() : defecto;
  } catch { return defecto; }
}

/** Las rutas "/uploads/x" de la semilla pasan a ser relativas a la app (sirve en cualquier carpeta del hosting). */
const corregirRutas = (items) => JSON.parse(JSON.stringify(items).replaceAll('"/uploads/', `"${new URL("uploads/", RAIZ).href}`));

const listo = (async () => {
  const edicion = { ...EDICION_POR_DEFECTO, ...(await cargarJSON("edicion.json", {})) };
  const indice = await cargarJSON("semilla/indice.json", { colecciones: [], perfiles: [] });
  for (const col of indice.colecciones) {
    if ((await kv.get(`col:${col}`)) === undefined) await kv.set(`col:${col}`, corregirRutas(await cargarJSON(`semilla/data/${col}.json`, [])));
  }
  if ((await kv.get("perfiles")) === undefined) {   // primera vez en este dispositivo
    const ids = [];
    for (const pid of indice.perfiles) {
      await kv.set(`perfil:${pid}`, await cargarJSON(`semilla/data/perfiles/${pid}/perfil.json`, {}));
      await kv.set(`historial:${pid}`, []);
      ids.push(pid);
    }
    await kv.set("perfiles", ids);
  }
  return edicion;
})();

// ---------------------------------------------------------------- perfiles
const idsPerfiles = async () => (await kv.get("perfiles")) || [];
async function perfilActivo() {
  const ids = await idsPerfiles();
  const pid = localStorage.getItem("perfilActivo");
  return ids.includes(pid) ? pid : ids[0] || null;
}
const leerPerfil = async (pid) => (pid ? (await kv.get(`perfil:${pid}`)) || {} : {});
const leerHistorial = async (pid) => (pid ? (await kv.get(`historial:${pid}`)) || [] : []);

function perfilNuevo(nombre, edad = 6, avatar = null, genero = "a") {
  return { nombre, edad, genero: genero === "o" ? "o" : "a", metaDiaria: 5, dificultadAdaptativa: true, puntos: 0,
    nivelLectura: 1, nivelMate: 1, nivelIngles: 1, nivelKiosco: 1, avatar: avatar || { cara: "🧒", accesorio: null } };
}

// ---------------------------------------------------------------- licencia
const b64d = (t) => Uint8Array.from(atob(t.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (t.length % 4)) % 4)), (c) => c.charCodeAt(0));
const hex = (h) => Uint8Array.from(h.match(/../g), (x) => parseInt(x, 16));

async function verificarClave(clave) {
  if (!CLAVE_PUBLICA || !clave) return null;
  try {
    const [datos, firma] = String(clave).replace(/\s+/g, "").split(".");
    const ok = await verifyAsync(b64d(firma), new TextEncoder().encode(datos), hex(CLAVE_PUBLICA));
    return ok ? JSON.parse(new TextDecoder().decode(b64d(datos))) : null;
  } catch { return null; }
}

async function estadoLicencia() {
  const edicion = await listo;
  if (edicion.edicion !== "comercial") return { activa: true, tipo: "familiar" };
  const datos = await verificarClave((await kv.get("licencia"))?.clave);
  return datos ? { activa: true, tipo: datos.k, titular: datos.t } : { activa: false };
}

async function areasDisponibles() {
  const edicion = await listo;
  const activa = (await estadoLicencia()).activa;
  return Object.fromEntries(Object.keys(AREAS).map((a) => [a, activa || edicion.gratis.includes(a)]));
}

async function info() {
  const e = await listo;
  return { version: VERSION, edicion: e.edicion, marca: e.marca, gratis: e.gratis, licencia: await estadoLicencia(), areas: await areasDisponibles() };
}

// ---------------------------------------------------------------- progreso
function nivelMate(r) {
  if (r.nivel) return r.nivel;
  const res = r.operacion === "suma" ? r.a + r.b : r.operacion === "resta" ? r.a - r.b : r.a;
  const mayor = Math.max(r.a, r.operacion === "contar" ? 0 : r.b, res);
  return mayor <= 5 ? 1 : mayor <= 10 ? 2 : 3;
}

function racha(hist) {
  const dias = new Set(hist.map((e) => e.fecha));
  const dia = new Date();
  if (!dias.has(fechaLocal(dia))) dia.setDate(dia.getDate() - 1);
  let n = 0;
  while (dias.has(fechaLocal(dia))) { n++; dia.setDate(dia.getDate() - 1); }
  return n;
}

const pct = (ev) => (ev.length ? Math.round((100 * ev.filter((e) => e.correcto).length) / ev.length) : null);

async function resumen() {
  const pid = await perfilActivo();
  const perfil = await leerPerfil(pid), hist = await leerHistorial(pid);
  const col = async (c) => (await kv.get(`col:${c}`)) || [];
  const nombres = new Map();
  (await col("lectura")).forEach((i) => nombres.set(`lectura|${i.id}`, i.texto));
  (await col("matematicas")).forEach((r) => nombres.set(`mate|${r.id}`, r.titulo));
  (await col("ingles")).forEach((v) => nombres.set(`ingles|${v.id}`, `${v.en} (${v.es})`));
  (await col("productos")).forEach((k) => nombres.set(`kiosco|${k.id}`, `Comprar ${k.nombre.toLowerCase()}`));
  const nombre = (e) => nombres.get(`${e.area}|${e.itemId}`) || "(eliminado)";

  const aciertos = Object.fromEntries(Object.keys(AREAS).map((a) => [a, { 1: 0, 2: 0, 3: 0 }]));
  const fallas = new Map();
  for (const e of hist) {
    if (e.correcto) aciertos[e.area] && (aciertos[e.area][e.nivel] += 1);
    else fallas.set(`${e.area}|${e.itemId}`, (fallas.get(`${e.area}|${e.itemId}`) || 0) + 1);
  }
  const hoy = fechaLocal();
  const semana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const f = fechaLocal(d);
    return { fecha: f, total: hist.filter((e) => e.fecha === f && e.correcto).length };
  });
  const mate = hist.filter((e) => e.area === "mate");
  return {
    nombre: perfil.nombre || "", puntos: perfil.puntos || 0,
    ...Object.fromEntries(Object.values(CLAVE_NIVEL).map((c) => [c, perfil[c] || 1])),
    metaDiaria: perfil.metaDiaria || 5,
    hoy: hist.filter((e) => e.fecha === hoy && e.correcto).length,
    racha: racha(hist), aciertosParaSubir: ACIERTOS_PARA_SUBIR, aciertosPorNivel: aciertos, semana,
    porcentajes: {
      lectura: pct(hist.filter((e) => e.area === "lectura")), ingles: pct(hist.filter((e) => e.area === "ingles")),
      kiosco: pct(hist.filter((e) => e.area === "kiosco")),
      suma: pct(mate.filter((e) => e.operacion === "suma")), resta: pct(mate.filter((e) => e.operacion === "resta")),
      contar: pct(mate.filter((e) => e.operacion === "contar")),
    },
    totalIntentos: hist.length,
    paraPracticar: [...fallas.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => {
      const [area, itemId] = k.split("|");
      return { area, itemId, nombre: nombre({ area, itemId }), fallas: n };
    }),
    recientes: hist.slice(-15).reverse().map((e) => ({ ...e, nombre: nombre(e) })),
  };
}

async function registrar(area, itemId, correcto, nivelPedido) {
  await listo;
  if (!AREAS[area]) falla("Área inválida");
  const pid = await perfilActivo();
  if (!pid) falla("Primero hay que crear un perfil");
  if (!(await areasDisponibles())[area]) falla("Esta aventura está en la versión completa");
  const perfil = await leerPerfil(pid);
  const item = ((await kv.get(`col:${AREAS[area]}`)) || []).find((i) => i.id === itemId) || falla("No existe ese ejercicio");
  let nivel, puntos;
  if (area === "lectura") { nivel = item.nivel || 1; puntos = (PUNTOS_LECTURA[item.tipo] || 10) + 5 * (nivel - 1); }
  else if (area === "ingles" || area === "kiosco") {
    const tope = perfil[CLAVE_NIVEL[area]] || 1;
    nivel = Math.max(1, Math.min(Number(nivelPedido) || tope, tope)); puntos = 10 + 5 * (nivel - 1);
  } else { nivel = nivelMate(item); puntos = item.puntos || 10; }

  const ts = ahoraLocal();
  const evento = { ts, fecha: ts.slice(0, 10), area, itemId, nivel, correcto: Boolean(correcto), puntos: correcto ? puntos : 0 };
  if (area === "mate") evento.operacion = item.operacion;
  const hist = await leerHistorial(pid);
  hist.push(evento);
  await kv.set(`historial:${pid}`, hist);

  const clave = CLAVE_NIVEL[area];
  let subio = false;
  if (correcto) {
    perfil.puntos = (perfil.puntos || 0) + puntos;
    const actual = perfil[clave] || 1;
    const aciertos = hist.filter((e) => e.area === area && e.correcto && e.nivel === actual).length;
    if (perfil.dificultadAdaptativa !== false && nivel === actual && actual < 3 && aciertos >= ACIERTOS_PARA_SUBIR) {
      perfil[clave] = actual + 1; subio = true;
    }
    await kv.set(`perfil:${pid}`, perfil);
  }
  return { puntosGanados: evento.puntos, subioNivel: subio, nivel: perfil[clave] || 1, progreso: await resumen() };
}

// ---------------------------------------------------------------- interfaz pública (igual a api-servidor.js)
const validar = (col) => COLECCIONES.includes(col) || falla(`Colección desconocida: ${col}`);
const sinContadores = (d) => { const x = { ...d }; delete x.id; delete x.dominada; delete x.superado; return x; };

export const api = {
  async perfil() {
    await listo;
    const pid = await perfilActivo();
    return pid ? { ...(await leerPerfil(pid)), id: pid } : { sinPerfil: true, nombre: "" };
  },
  async actualizarPerfil(datos) {
    const pid = await perfilActivo() || falla("Primero hay que crear un perfil");
    const perfil = { ...(await leerPerfil(pid)), ...sinContadores(datos) };
    await kv.set(`perfil:${pid}`, perfil);
    return { ...perfil, id: pid };
  },
  info,
  async activarLicencia(clave) {
    if (!(await verificarClave(clave))) falla("La clave no es válida. Revisá que esté completa, sin espacios de más.");
    await kv.set("licencia", { clave: String(clave).replace(/\s+/g, ""), activada: ahoraLocal() });
    return info();
  },
  async perfiles() {
    await listo;
    const activo = await perfilActivo();
    return Promise.all((await idsPerfiles()).map(async (id) => {
      const p = await leerPerfil(id);
      return { id, nombre: p.nombre || "", edad: p.edad, avatar: p.avatar, puntos: p.puntos || 0, activo: id === activo };
    }));
  },
  async crearPerfil(datos) {
    await listo;
    const nombre = String(datos.nombre || "").trim().slice(0, 20) || falla("Falta el nombre");
    const id = "p" + nuevoId(6);
    await kv.set(`perfil:${id}`, perfilNuevo(nombre, Number(datos.edad) || 6, datos.avatar, datos.genero));
    await kv.set(`historial:${id}`, []);
    await kv.set("perfiles", [...(await idsPerfiles()), id]);
    localStorage.setItem("perfilActivo", id);
    return { id, nombre };
  },
  async activarPerfil(id) {
    (await idsPerfiles()).includes(id) || falla("No existe ese perfil");
    localStorage.setItem("perfilActivo", id);
    return { ok: true };
  },
  async eliminarPerfil(id) {
    const ids = await idsPerfiles();
    ids.includes(id) || falla("No existe ese perfil");
    await kv.set("perfiles", ids.filter((x) => x !== id));
    await kv.del(`perfil:${id}`); await kv.del(`historial:${id}`);
    return { ok: true };
  },
  async progreso() { await listo; return resumen(); },
  registrar,
  async reiniciarProgreso() {
    const pid = await perfilActivo() || falla("No hay perfil");
    const perfil = await leerPerfil(pid);
    const cara = perfil.avatar?.cara || "🧒";
    Object.assign(perfil, { puntos: 0, avatar: { cara, accesorio: null } }, Object.fromEntries(Object.values(CLAVE_NIVEL).map((c) => [c, 1])));
    await kv.set(`perfil:${pid}`, perfil);
    await kv.set(`historial:${pid}`, []);
    return resumen();
  },
  async listar(col) {
    await listo; validar(col);
    const items = copia((await kv.get(`col:${col}`)) || []);
    if (CONTADOR[col]) {
      const [area, campo] = CONTADOR[col];
      const logrados = new Map();
      (await leerHistorial(await perfilActivo())).forEach((e) => e.area === area && e.correcto && logrados.set(e.itemId, (logrados.get(e.itemId) || 0) + 1));
      items.forEach((i) => (i[campo] = logrados.get(i.id) || 0));
    }
    return items;
  },
  async crear(col, datos) {
    await listo; validar(col);
    const items = (await kv.get(`col:${col}`)) || [];
    const nuevo = { id: nuevoId(), ...sinContadores(datos) };
    items.unshift(nuevo);
    await kv.set(`col:${col}`, items);
    return nuevo;
  },
  async actualizar(col, id, datos) {
    await listo; validar(col);
    const items = (await kv.get(`col:${col}`)) || [];
    const item = items.find((i) => i.id === id) || falla("No existe ese elemento");
    Object.assign(item, sinContadores(datos));
    await kv.set(`col:${col}`, items);
    return item;
  },
  async eliminar(col, id) {
    await listo; validar(col);
    const items = (await kv.get(`col:${col}`)) || [];
    const restantes = items.filter((i) => i.id !== id);
    restantes.length < items.length || falla("No existe ese elemento");
    await kv.set(`col:${col}`, restantes);
    return { ok: true };
  },
  /** Guarda la foto o la voz en el dispositivo; el service worker la sirve en <raíz>/archivos/<id>. */
  async subir(archivo, nombre) {
    const ext = (nombre || archivo.name || "").split(".").pop().toLowerCase() || "bin";
    const tipo = archivo.type?.startsWith("audio") || ["webm", "ogg", "m4a", "mp3", "wav", "mp4"].includes(ext) ? "audio" : "imagen";
    const id = `${tipo}_${nuevoId(10)}.${ext}`;
    await archivos.set(id, archivo);
    return new URL(`archivos/${id}`, RAIZ).href;
  },
};

// Instalación y funcionamiento sin conexión
if ("serviceWorker" in navigator) navigator.serviceWorker.register(new URL("sw.js", RAIZ)).catch(() => {});
