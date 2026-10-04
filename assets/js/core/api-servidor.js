// Implementación "servidor": la app de Windows, que habla con el backend Flask local.
const BASE = "/api";

async function pedir(metodo, ruta, cuerpo) {
  const opciones = { method: metodo, headers: {} };
  if (cuerpo instanceof FormData) opciones.body = cuerpo;
  else if (cuerpo !== undefined) {
    opciones.headers["Content-Type"] = "application/json";
    opciones.body = JSON.stringify(cuerpo);
  }
  const res = await fetch(BASE + ruta, opciones);
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(datos.error || `Error ${res.status}`);
  return datos;
}

export const api = {
  perfil: () => pedir("GET", "/perfil"),
  actualizarPerfil: (datos) => pedir("PUT", "/perfil", datos),
  info: () => pedir("GET", "/info"),
  activarLicencia: (clave) => pedir("POST", "/licencia", { clave }),
  perfiles: () => pedir("GET", "/perfiles"),
  crearPerfil: (datos) => pedir("POST", "/perfiles", datos),
  activarPerfil: (id) => pedir("POST", `/perfiles/${id}/activar`),
  eliminarPerfil: (id) => pedir("DELETE", `/perfiles/${id}`),
  progreso: () => pedir("GET", "/progreso"),
  registrar: (area, itemId, correcto, nivel) => pedir("POST", "/progreso/evento", { area, itemId, correcto, nivel }),
  reiniciarProgreso: () => pedir("POST", "/progreso/reiniciar"),
  listar: (col) => pedir("GET", `/${col}`),
  crear: (col, datos) => pedir("POST", `/${col}`, datos),
  actualizar: (col, id, datos) => pedir("PUT", `/${col}/${id}`, datos),
  eliminar: (col, id) => pedir("DELETE", `/${col}/${id}`),
  async subir(archivo, nombre) {
    const fd = new FormData();
    fd.append("archivo", archivo, nombre || archivo.name);
    return (await pedir("POST", "/uploads", fd)).url;
  },
};

// Latido: avisa al servidor que la app sigue abierta. En la versión instalable (.exe)
// el servidor se apaga solo unos minutos después de cerrar la ventana.
const latir = () => fetch(BASE + "/latido").catch(() => {});
latir();
setInterval(latir, 20000);
