// Efectos sonoros generados con Web Audio (sin archivos).
let ctx;
const audio = () => (ctx ??= new (window.AudioContext || window.webkitAudioContext)());

function notas(lista, { tipo = "triangle", dur = 0.14, vol = 0.18 } = {}) {
  const c = audio();
  lista.forEach((f, i) => {
    const o = c.createOscillator(), g = c.createGain();
    const t = c.currentTime + i * dur;
    o.type = tipo; o.frequency.value = f;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur * 1.8);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + dur * 2);
  });
}

export const sonido = {
  exito: () => notas([523, 659, 784, 1047]),
  nivel: () => notas([523, 659, 784, 1047, 784, 1047, 1319], { dur: 0.16 }),
  error: () => notas([392, 330], { tipo: "sine", dur: 0.2, vol: 0.12 }),
  tap: () => notas([880], { tipo: "sine", dur: 0.05, vol: 0.08 }),
  pagina: () => notas([659, 880], { dur: 0.1 }),
};
