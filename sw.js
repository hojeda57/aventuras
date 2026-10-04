// Service worker de la versión web/móvil. construir_web.py reemplaza VERSION y ARCHIVOS.
const VERSION = "1.3.0-73a5ecf74b";
const ARCHIVOS = ["./", "assets/css/base.css", "assets/css/fuentes.css", "assets/css/tailwind.css", "assets/fonts/material-symbols-outlined.woff2", "assets/fonts/quicksand-latin-500-normal.woff2", "assets/fonts/quicksand-latin-600-normal.woff2", "assets/fonts/quicksand-latin-700-normal.woff2", "assets/img/.gitkeep", "assets/img/billetes/10.png", "assets/img/billetes/100.png", "assets/img/billetes/1000.png", "assets/img/billetes/10000.png", "assets/img/billetes/20.png", "assets/img/billetes/200.png", "assets/img/billetes/2000.png", "assets/img/billetes/20000.png", "assets/img/billetes/50.png", "assets/img/billetes/500.png", "assets/img/iconos/apple-touch-icon.png", "assets/img/iconos/icono-192.png", "assets/img/iconos/icono-512.png", "assets/img/iconos/icono-maskable-512.png", "assets/js/clave_publica.js", "assets/js/components/billete.js", "assets/js/components/celebracion.js", "assets/js/components/dibujo.js", "assets/js/components/footer.js", "assets/js/components/gate-padres.js", "assets/js/components/header.js", "assets/js/components/lectura-card.js", "assets/js/components/modal.js", "assets/js/components/nina-barra.js", "assets/js/components/nina-guardia.js", "assets/js/components/reto-card.js", "assets/js/core/api-local.js", "assets/js/core/api-servidor.js", "assets/js/core/api.js", "assets/js/core/app.js", "assets/js/core/constantes.js", "assets/js/core/db-local.js", "assets/js/core/dom.js", "assets/js/modo.js", "assets/js/pages/nina-ingles.js", "assets/js/pages/nina-kiosco.js", "assets/js/pages/nina-leer.js", "assets/js/pages/nina-mapa.js", "assets/js/pages/nina-mate.js", "assets/js/pages/nina-premios.js", "assets/js/pages/padres-ajustes.js", "assets/js/pages/padres-ingles.js", "assets/js/pages/padres-kiosco.js", "assets/js/pages/padres-lectura.js", "assets/js/pages/padres-matematicas.js", "assets/js/pages/padres-progreso.js", "assets/js/utils/audio.js", "assets/js/utils/grabador.js", "assets/js/utils/mate.js", "assets/js/utils/plata.js", "assets/js/utils/reconocimiento.js", "assets/js/utils/silabas.js", "assets/js/utils/sonidos.js", "assets/js/vendor/noble-ed25519.js", "edicion.json", "index.html", "legal/privacidad.html", "legal/terminos.html", "manifest.webmanifest", "nina/index.html", "nina/ingles.html", "nina/kiosco.html", "nina/leer.html", "nina/mate.html", "nina/premios.html", "padres/ajustes.html", "padres/ingles.html", "padres/kiosco.html", "padres/lectura.html", "padres/matematicas.html", "padres/progreso.html", "semilla/data/billetes.json", "semilla/data/ingles.json", "semilla/data/lectura.json", "semilla/data/matematicas.json", "semilla/data/perfiles/p1/historial.json", "semilla/data/perfiles/p1/perfil.json", "semilla/data/productos.json", "semilla/indice.json"];
const CACHE = `aventuras-${VERSION}`;
const TIPOS = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif",
  webm: "audio/webm", ogg: "audio/ogg", m4a: "audio/mp4", mp4: "audio/mp4", mp3: "audio/mpeg", wav: "audio/wav" };

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((claves) => Promise.all(claves.filter((k) => k.startsWith("aventuras-") && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Fotos y voces que la familia guardó en el dispositivo (IndexedDB "aventuras" → "archivos")
function leerArchivo(id) {
  return new Promise((resolver) => {
    const req = indexedDB.open("aventuras", 1);
    req.onupgradeneeded = () => { req.result.createObjectStore("kv"); req.result.createObjectStore("archivos"); };
    req.onsuccess = () => {
      const g = req.result.transaction("archivos").objectStore("archivos").get(id);
      g.onsuccess = () => resolver(g.result || null);
      g.onerror = () => resolver(null);
    };
    req.onerror = () => resolver(null);
  });
}

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  const marca = url.pathname.indexOf("/archivos/");
  if (marca !== -1) {
    const id = decodeURIComponent(url.pathname.slice(marca + "/archivos/".length));
    e.respondWith(leerArchivo(id).then((blob) => blob
      ? new Response(blob, { headers: { "Content-Type": blob.type || TIPOS[id.split(".").pop()] || "application/octet-stream" } })
      : new Response("", { status: 404 })));
    return;
  }
  // Primero lo guardado (funciona sin internet); si no está, de la red y se guarda para la próxima.
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((guardado) => guardado || fetch(e.request).then((resp) => {
    if (resp.ok) { const copia = resp.clone(); caches.open(CACHE).then((c) => c.put(e.request, copia)); }
    return resp;
  })));
});
