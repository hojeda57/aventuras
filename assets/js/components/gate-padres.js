// Control parental simple: una multiplicación que un chico de 6 años no resuelve.
// No es seguridad real (no protege la API); sólo evita entrar por accidente a la Zona de Papás.
const CLAVE = "zonaPapas";

export function exigirAdulto() {
  if (sessionStorage.getItem(CLAVE) === "ok") return Promise.resolve();
  return new Promise((resolver) => {
    const a = 6 + Math.floor(Math.random() * 4), b = 3 + Math.floor(Math.random() * 7);
    const capa = document.createElement("div");
    capa.className = "fixed inset-0 z-[200] bg-surface flex items-center justify-center p-4";
    capa.innerHTML = `
      <form class="bg-surface-container-lowest rounded-lg shadow-md p-space-lg max-w-sm w-full text-center space-y-space-md">
        <span class="material-symbols-outlined text-primary text-[40px]">lock</span>
        <h1 class="font-headline-md text-headline-md">Zona de papás</h1>
        <label for="gateInput" class="block text-on-surface-variant">Para entrar, respondé: ¿cuánto es ${a} × ${b}?</label>
        <input id="gateInput" inputmode="numeric" autocomplete="off" class="w-full min-h-[52px] text-center font-headline-md text-headline-md rounded bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-secondary">
        <p id="gateError" class="text-error font-label-sm text-label-sm min-h-[16px]" aria-live="polite"></p>
        <button class="btn-tactil w-full py-3 rounded-full bg-primary-container text-on-primary-container font-label-lg text-label-lg shadow-[0_3px_0_0_#b45309]">Entrar</button>
        <a href="../nina/index.html" class="block font-label-md text-label-md text-secondary">Volver a jugar</a>
      </form>`;
    capa.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      if (Number(capa.querySelector("#gateInput").value) === a * b) {
        sessionStorage.setItem(CLAVE, "ok");
        capa.remove();
        resolver();
      } else {
        capa.querySelector("#gateError").textContent = "Respuesta incorrecta.";
        capa.querySelector("#gateInput").value = "";
      }
    });
    document.body.append(capa);
    capa.querySelector("#gateInput").focus();
  });
}
