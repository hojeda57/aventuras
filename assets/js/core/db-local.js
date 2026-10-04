// IndexedDB mínimo: un almacén clave→valor ("kv") y otro para archivos subidos ("archivos").
// También lo usa el service worker para servir las fotos y voces sin conexión.
export const NOMBRE_DB = "aventuras";

export function abrirDB() {
  return new Promise((resolver, rechazar) => {
    const req = indexedDB.open(NOMBRE_DB, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore("kv");
      req.result.createObjectStore("archivos");
    };
    req.onsuccess = () => resolver(req.result);
    req.onerror = () => rechazar(req.error);
  });
}

let conexion = null;
const db = () => (conexion ??= abrirDB());

async function operar(almacen, modo, accion) {
  const base = await db();
  return new Promise((resolver, rechazar) => {
    const tx = base.transaction(almacen, modo);
    const req = accion(tx.objectStore(almacen));
    tx.oncomplete = () => resolver(req?.result);
    tx.onerror = () => rechazar(tx.error);
  });
}

export const kv = {
  get: (clave) => operar("kv", "readonly", (s) => s.get(clave)),
  set: (clave, valor) => operar("kv", "readwrite", (s) => s.put(valor, clave)),
  del: (clave) => operar("kv", "readwrite", (s) => s.delete(clave)),
};
export const archivos = {
  get: (id) => operar("archivos", "readonly", (s) => s.get(id)),
  set: (id, blob) => operar("archivos", "readwrite", (s) => s.put(blob, id)),
};
