// Dibujos de prendas (estilo "hoja de la maestra"): contorno oscuro y relleno del color que se pida.
// Se usan en los juegos de inglés para contar, reconocer colores y escribir el nombre de cada prenda.
const T = "#37474f";                       // color del contorno
const D = `stroke="${T}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"`;
const linea = (d, extra = "") => `<path d="${d}" fill="none" ${D} ${extra}/>`;
const forma = (d, c) => `<path d="${d}" fill="${c}" ${D}/>`;
const boton = (x, y) => `<circle cx="${x}" cy="${y}" r="1.8" fill="${T}"/>`;

const DIBUJOS = {
  tshirt: (c) => forma("M31 18 L42 13 Q50 22 58 13 L69 18 L88 33 L78 45 L70 39 L70 88 L30 88 L30 39 L22 45 L12 33 Z", c)
    + linea("M42 13 Q50 26 58 13"),
  shirt: (c) => forma("M33 15 L44 11 L50 20 L56 11 L67 15 L83 25 L91 70 L80 73 L72 40 L72 90 L28 90 L28 40 L20 73 L9 70 L17 25 Z", c)
    + forma("M44 11 L50 27 L39 23 Z", c) + forma("M56 11 L50 27 L61 23 Z", c)
    + linea("M50 27 L50 90") + boton(54, 38) + boton(54, 52) + boton(54, 66) + boton(54, 80)
    + linea("M24 66 L20 73 M76 66 L80 73"),
  dress: (c) => forma("M39 9 L44 9 L45 26 L55 26 L56 9 L61 9 L63 30 Q67 35 64 41 L85 87 Q50 97 15 87 L36 41 Q33 35 37 30 Z", c)
    + linea("M36 41 Q50 45 64 41") + linea("M45 41 L40 48 M55 41 L60 48") + `<circle cx="50" cy="42" r="3" fill="${c}" ${D}/>`,
  shorts: (c) => forma("M21 18 L79 18 L87 72 L57 76 L50 42 L43 76 L13 72 Z", c)
    + linea("M21 28 L79 28") + linea("M47 28 Q45 36 42 38 M53 28 Q55 36 58 38"),
  skirt: (c) => forma("M33 20 L67 20 L87 80 Q50 90 13 80 Z", c)
    + linea("M33 29 L67 29") + linea("M42 29 L35 84 M50 29 L50 87 M58 29 L65 84"),
  pants: (c) => forma("M27 9 L73 9 L77 93 L56 93 L50 35 L44 93 L23 93 Z", c)
    + linea("M27 18 L73 18") + linea("M50 18 L50 35") + linea("M30 18 Q32 28 40 28 M70 18 Q68 28 60 28"),
  socks: (c) => {
    const una = (dx) => `<g transform="translate(${dx} 0)">${forma("M14 8 L32 8 L32 55 L44 67 Q51 77 41 83 L22 83 Q11 83 13 70 Z", c)}${linea("M14 16 L32 16 M14 22 L32 22")}</g>`;
    return una(4) + una(36);
  },
  shoes: (c) => {
    const uno = (dy, dx) => `<g transform="translate(${dx} ${dy})">${forma("M6 46 Q8 30 22 30 L34 30 Q40 40 54 42 L74 46 Q86 48 86 58 L86 62 L6 62 Z", c)}${linea("M6 56 L86 56")}${linea("M30 34 L36 38 M34 32 L40 36")}</g>`;
    return uno(-6, 12) + uno(22, 0);
  },
  hat: (c) => `<ellipse cx="50" cy="64" rx="45" ry="14" fill="${c}" ${D}/>`
    + forma("M27 63 Q27 29 50 29 Q73 29 73 63 Z", c)
    + forma("M28 52 Q50 58 72 52 L72 60 Q50 66 28 60 Z", "#ffffff") + `<circle cx="66" cy="57" r="5" fill="#f06292" ${D}/>`,
  jacket: (c) => forma("M31 14 L42 10 Q50 16 58 10 L69 14 L87 30 L88 82 L76 82 L74 44 L74 88 L26 88 L26 44 L24 82 L12 82 L13 30 Z", c)
    + forma("M42 10 Q50 20 58 10 L60 6 Q50 14 40 6 Z", c) + linea("M50 17 L50 88")
    + linea("M26 80 L74 80") + linea("M34 58 L42 58 L42 68 M66 58 L58 58 L58 68") + `<rect x="47" y="19" width="6" height="7" rx="1.5" fill="#cfd8dc" ${D}/>`,
  sweater: (c) => forma("M31 16 L42 12 Q50 20 58 12 L69 16 L85 30 L92 78 L80 81 L72 43 L72 85 L28 85 L28 43 L20 81 L8 78 L15 30 Z", c)
    + linea("M42 12 Q50 24 58 12") + linea("M28 77 L72 77") + linea("M9 71 L21 74 M91 71 L79 74")
    + linea("M33 77 L33 85 M39 77 L39 85 M45 77 L45 85 M51 77 L51 85 M57 77 L57 85 M63 77 L63 85 M69 77 L69 85", 'stroke-width="1.6"'),
  cap: (c) => forma("M16 62 Q16 24 48 24 Q76 24 78 60 Z", c)
    + forma("M66 56 Q94 56 97 68 Q80 72 60 66 Z", c) + linea("M48 24 L48 62 M32 30 Q36 44 34 62") + `<circle cx="48" cy="24" r="3" fill="${c}" ${D}/>`,
  sunglasses: (c) => `<g fill="none" stroke="${T}" stroke-width="8" stroke-linecap="round"><path d="M10 44 L3 34 M90 44 L97 34 M43 46 Q50 41 57 46"/></g>`
    + `<g fill="none" stroke="${c}" stroke-width="4.5" stroke-linecap="round"><path d="M10 44 L3 34 M90 44 L97 34 M43 46 Q50 41 57 46"/></g>`
    + `<rect x="10" y="38" width="33" height="25" rx="10" fill="#263238" stroke="${T}" stroke-width="7"/>`
    + `<rect x="10" y="38" width="33" height="25" rx="10" fill="#263238" stroke="${c}" stroke-width="3.5"/>`
    + `<rect x="57" y="38" width="33" height="25" rx="10" fill="#263238" stroke="${T}" stroke-width="7"/>`
    + `<rect x="57" y="38" width="33" height="25" rx="10" fill="#263238" stroke="${c}" stroke-width="3.5"/>`
    + linea("M16 44 L24 44 M63 44 L71 44", 'stroke="#90a4ae"'),
  glasses: (c) => `<g fill="none" stroke="${T}" stroke-width="8" stroke-linecap="round"><path d="M11 48 L3 38 M89 48 L97 38 M41 50 Q50 44 59 50"/></g>`
    + `<g fill="none" stroke="${c}" stroke-width="4.5" stroke-linecap="round"><path d="M11 48 L3 38 M89 48 L97 38 M41 50 Q50 44 59 50"/></g>`
    + `<circle cx="26" cy="52" r="15" fill="#e3f2fd" stroke="${T}" stroke-width="7"/><circle cx="26" cy="52" r="15" fill="#e3f2fd" stroke="${c}" stroke-width="3.5"/>`
    + `<circle cx="74" cy="52" r="15" fill="#e3f2fd" stroke="${T}" stroke-width="7"/><circle cx="74" cy="52" r="15" fill="#e3f2fd" stroke="${c}" stroke-width="3.5"/>`
    + linea("M19 46 Q22 43 26 43 M67 46 Q70 43 74 43", 'stroke="#90caf9"'),
  coat: (c) => forma("M32 11 L44 7 L50 24 L56 7 L68 11 L86 27 L91 75 L80 77 L74 40 L77 94 L23 94 L26 40 L20 77 L9 75 L14 27 Z", c)
    + forma("M44 7 L50 24 L42 34 L38 16 Z", c) + forma("M56 7 L50 24 L58 34 L62 16 Z", c)
    + linea("M26 57 L74 57") + boton(43, 44) + boton(57, 44) + boton(43, 68) + boton(57, 68) + boton(43, 80) + boton(57, 80),
  suit: (c) => forma("M30 70 L70 70 L72 97 L54 97 L50 78 L46 97 L28 97 Z", c)
    + forma("M30 11 L44 7 L50 30 L56 7 L70 11 L86 27 L90 68 L80 70 L74 40 L74 72 L26 72 L26 40 L20 70 L10 68 L14 27 Z", c)
    + forma("M44 7 L50 30 L56 7 Z", "#ffffff") + forma("M48 12 L52 12 L54 26 L50 31 L46 26 Z", "#e53935")
    + linea("M44 7 L40 34 L50 30 M56 7 L60 34 L50 30") + boton(50, 46) + boton(50, 58),
  gloves: (c) => {
    const uno = (dx, giro) => `<g transform="translate(${dx} 6) scale(0.62) rotate(${giro} 50 50)">`
      + forma("M30 92 L30 62 L22 42 Q20 34 27 34 L34 48 L34 22 Q34 15 39.5 15 Q45 15 45 22 L45 44 L46 16 Q46 10 51.5 10 Q57 10 57 16 L57 44 L58 20 Q58 14 63.5 14 Q69 14 69 20 L69 50 L71 32 Q72 26 77 28 Q81 30 80 37 L75 66 L72 92 Z", c)
      + forma("M28 80 L74 80 L74 96 L28 96 Z", c) + linea("M28 88 L74 88") + `</g>`;
    return uno(-2, -12) + uno(36, 12);
  },
  flipflops: (c) => {
    const una = (dx) => `<g transform="translate(${dx} 0)">${forma("M24 8 Q40 8 40 36 Q40 58 36 78 Q32 92 22 90 Q11 88 13 70 Q15 50 11 30 Q11 8 24 8 Z", c)}`
      + `<path d="M25 24 L13 50 M25 24 L39 50" fill="none" stroke="${T}" stroke-width="7" stroke-linecap="round"/>`
      + `<path d="M25 24 L13 50 M25 24 L39 50" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>`
      + `<circle cx="25" cy="24" r="3" fill="${T}"/></g>`;
    return una(6) + una(46);
  },
  sandals: (c) => {
    const una = (dx) => `<g transform="translate(${dx} 0)">${forma("M24 10 Q40 10 40 38 Q40 60 36 78 Q32 92 22 90 Q11 88 13 70 Q15 50 11 32 Q11 10 24 10 Z", "#d7b98e")}`
      + forma("M10 24 L41 24 L41 34 L10 34 Z", c) + forma("M12 46 L40 46 L40 56 L12 56 Z", c)
      + forma("M14 70 L36 70 L35 79 L15 79 Z", c) + `<circle cx="38" cy="51" r="2.2" fill="#cfd8dc" ${D}/></g>`;
    return una(6) + una(46);
  },
  boots: (c) => {
    const una = (dx, dy) => `<g transform="translate(${dx} ${dy})">${forma("M14 8 L40 8 L40 60 Q60 60 68 72 L68 82 L14 82 Z", c)}${linea("M14 74 L68 74")}${linea("M12 8 L42 8", 'stroke-width="4"')}</g>`;
    return una(2, 8) + una(30, 2);
  },
  scarf: (c) => forma("M18 30 Q50 46 82 30 L82 46 Q50 62 18 46 Z", c)
    + forma("M54 50 L70 46 L76 86 L60 88 Z", c) + forma("M40 50 L52 52 L50 82 L36 80 Z", c)
    + linea("M38 80 L37 88 M42 81 L41 89 M46 81 L45 89 M50 82 L50 90 M61 88 L61 96 M65 88 L65 96 M69 87 L70 95 M73 87 L74 95")
    + linea("M25 34 L25 49 M35 38 L35 53 M65 38 L65 53 M75 34 L75 49", 'stroke-opacity="0.5"'),
};

// Prendas que van "de a par": en el juego de contar no se usan con 1 (sería "one glasses")
export const PRENDAS_PAR = new Set(["pants", "shorts", "socks", "shoes", "gloves", "boots", "sandals", "flipflops", "glasses", "sunglasses"]);

export const hayDibujo = (clave) => !!DIBUJOS[clave];

export function prendaSVG(clave, color = "#90caf9", tam = 120, titulo = "") {
  const dib = DIBUJOS[clave];
  if (!dib) return "";
  const medida = typeof tam === "number" ? `width="${tam}" height="${tam}" style="display:inline-block;overflow:visible"`
    : `style="width:${tam};height:auto;display:block;overflow:visible"`;   // tamaño CSS (se adapta a la pantalla)
  return `<svg viewBox="0 0 100 100" ${medida} role="img" aria-label="${titulo}">${dib(color)}</svg>`;
}

// Mancha de pintura (como en la evaluación) para los juegos de colores
export function manchaSVG(color, tam = 150) {
  const borde = color.toLowerCase() === "#ffffff" ? "#b0bec5" : "rgba(0,0,0,0.15)";
  return `<svg viewBox="0 0 100 100" width="${tam}" height="${tam}" role="img" aria-label="color" style="display:inline-block">
    <path d="M50 12 Q60 4 66 14 Q78 8 80 22 Q94 24 88 38 Q98 48 87 58 Q94 72 80 74 Q80 90 64 86 Q56 98 46 88 Q32 96 30 82 Q14 84 16 68 Q4 60 13 48 Q4 36 17 30 Q16 14 32 18 Q38 6 50 12 Z"
      fill="${color}" stroke="${borde}" stroke-width="2.5"/>
    <ellipse cx="38" cy="36" rx="9" ry="5" fill="#ffffff" opacity="0.35" transform="rotate(-25 38 36)"/></svg>`;
}
