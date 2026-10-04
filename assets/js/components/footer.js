import { info } from "../core/app.js";

export function renderFooter(el) {
  el.innerHTML = `
  <footer class="w-full bg-surface-container-low py-space-lg mt-space-xl">
    <div class="max-w-[1200px] mx-auto px-margin flex flex-col md:flex-row items-center justify-between gap-space-md">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-tertiary-fixed flex items-center justify-center">
          <span class="material-symbols-outlined text-on-tertiary-fixed text-[22px]">psychology</span>
        </div>
        <div>
          <p class="font-label-md text-label-md text-on-surface">Consejo del día</p>
          <p class="font-body-sm text-body-sm text-on-surface-variant">Sesiones breves de 10 a 15 minutos rinden más que una larga.</p>
        </div>
      </div>
      <span class="font-body-sm text-body-sm text-on-surface-variant"><span data-marca></span> · <a href="../legal/privacidad.html" class="underline">Privacidad</a> · <a href="../legal/terminos.html" class="underline">Términos</a></span>
    </div>
  </footer>`;
  info().then(({ marca, version }) => el.querySelectorAll("[data-marca]").forEach((m) => (m.textContent = `${marca.nombre} ${version || ""}`)));
}
