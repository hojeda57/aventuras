// Grabación de la voz de mamá/papá. Requiere HTTPS o localhost (restricción del navegador).
export class Grabador {
  #rec = null; #partes = []; #inicio = 0;

  get activo() { return this.#rec?.state === "recording"; }

  async iniciar() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.#partes = [];
    this.#rec = new MediaRecorder(stream);
    this.#rec.ondataavailable = (e) => e.data.size && this.#partes.push(e.data);
    this.#rec.start();
    this.#inicio = Date.now();
  }

  detener() {
    return new Promise((resolver) => {
      this.#rec.onstop = () => {
        this.#rec.stream.getTracks().forEach((t) => t.stop());
        const tipo = this.#rec.mimeType || "audio/webm";
        const ext = tipo.includes("mp4") ? "m4a" : tipo.includes("ogg") ? "ogg" : "webm";
        resolver({
          blob: new Blob(this.#partes, { type: tipo }),
          nombre: `voz.${ext}`,
          segundos: Math.max(1, Math.round((Date.now() - this.#inicio) / 1000)),
        });
      };
      this.#rec.stop();
    });
  }
}

export function mensajeErrorMicrofono(e) {
  if (e.name === "NotAllowedError") return "Permití el uso del micrófono en el navegador para grabar.";
  if (!window.isSecureContext) return "Para grabar, la app tiene que abrirse con https o desde localhost.";
  return "No se pudo acceder al micrófono.";
}
