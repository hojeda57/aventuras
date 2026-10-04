// Catálogos compartidos entre Zona de Papás y modo de juego.

export const CELEBRACIONES = {
  globos:    { emoji: "🎈", label: "Globos" },
  cohetes:   { emoji: "🚀", label: "Cohetes" },
  estrellas: { emoji: "⭐", label: "Estrellas" },
  confeti:   { emoji: "🎉", label: "Confeti" },
};

export const NIVELES = {
  1: { label: "Nivel 1", desc: "Inicial",  marca: "★",   badge: "bg-tertiary-fixed text-on-tertiary-fixed" },
  2: { label: "Nivel 2", desc: "Medio",    marca: "★★",  badge: "bg-primary-fixed text-on-primary-fixed" },
  3: { label: "Nivel 3", desc: "Avanzado", marca: "★★★", badge: "bg-secondary-fixed text-on-secondary-fixed" },
};

export const TIPOS_LECTURA = {
  palabra: { label: "Palabra", plural: "Palabras mágicas", icono: "spellcheck", chip: "bg-secondary-fixed text-on-secondary-fixed" },
  frase:   { label: "Frase",   plural: "Frases cortas",    icono: "chat",       chip: "bg-tertiary-fixed text-on-tertiary-fixed" },
  cuento:  { label: "Cuento",  plural: "Cuentos cortos",   icono: "menu_book",  chip: "bg-primary-fixed text-on-primary-fixed" },
};

/** Íconos Material disponibles como imagen de apoyo cuando no hay foto. */
export const ICONOS_LECTURA = [
  "pets", "cruelty_free", "flutter_dash", "emoji_nature", "sports_soccer", "toys",
  "icecream", "cake", "local_florist", "sunny", "house", "directions_car",
];

export const OPERACIONES = {
  suma:   { label: "Suma",   simbolo: "+", icono: "add",    punto: "bg-secondary",         color: "text-secondary" },
  resta:  { label: "Resta",  simbolo: "−", icono: "remove", punto: "bg-primary-container", color: "text-error" },
  contar: { label: "Contar", simbolo: "",  icono: "pin",    punto: "bg-tertiary",          color: "text-tertiary" },
};

export const OBJETOS_MATE = [
  { emoji: "🍎", label: "Manzanas" }, { emoji: "🐶", label: "Perritos" },
  { emoji: "🚗", label: "Autitos" },  { emoji: "⭐", label: "Estrellitas" },
  { emoji: "🧁", label: "Cupcakes" }, { emoji: "🚀", label: "Cohetes" },
  { emoji: "🐰", label: "Conejitos" },{ emoji: "🍪", label: "Galletas" },
  { emoji: "🐟", label: "Peces" },    { emoji: "🎈", label: "Globos" },
  { emoji: "🐦", label: "Pajaritos" },{ emoji: "🍬", label: "Caramelos" },
  { emoji: "✏️", label: "Lápices" },  { emoji: "🦋", label: "Mariposas" },
  { emoji: "🐥", label: "Pollitos" }, { emoji: "🍓", label: "Frutillas" },
];

export const AUTORES = ["Mamá", "Papá"];

// ---------------------------------------------------------------- Modo de juego

/** Figuritas del cofre: se desbloquean al llegar a los puntos indicados. */
export const FIGURITAS = [
  { emoji: "🦄", nombre: "Unicornio", puntos: 20 },   { emoji: "🐼", nombre: "Panda", puntos: 50 },
  { emoji: "🌈", nombre: "Arcoíris", puntos: 90 },    { emoji: "🦊", nombre: "Zorrito", puntos: 140 },
  { emoji: "🐬", nombre: "Delfín", puntos: 200 },     { emoji: "🍦", nombre: "Helado", puntos: 270 },
  { emoji: "🦒", nombre: "Jirafa", puntos: 350 },     { emoji: "🎠", nombre: "Calesita", puntos: 440 },
  { emoji: "🐙", nombre: "Pulpo", puntos: 540 },      { emoji: "🪐", nombre: "Planeta", puntos: 650 },
  { emoji: "🦜", nombre: "Loro", puntos: 770 },       { emoji: "🏰", nombre: "Castillo", puntos: 900 },
  { emoji: "🐳", nombre: "Ballena", puntos: 1050 },   { emoji: "🎡", nombre: "Vuelta al mundo", puntos: 1220 },
  { emoji: "🐉", nombre: "Dragón dorado", puntos: 1400 },
];

export const CARAS_AVATAR = ["👧", "👦", "👧🏻", "👦🏻", "👧🏽", "👦🏽", "👧🏾", "👦🏾", "🧚‍♀️", "🧙‍♂️", "👸", "🤴", "🦸‍♀️", "🦸‍♂️", "🐱", "🐶"];

/** Accesorios del avatar, también por puntos. */
export const ACCESORIOS = [
  { emoji: "🎀", nombre: "Moño", puntos: 30 },       { emoji: "🌸", nombre: "Flor", puntos: 80 },
  { emoji: "👑", nombre: "Corona", puntos: 160 },    { emoji: "🕶️", nombre: "Anteojos", puntos: 260 },
  { emoji: "🎩", nombre: "Galera", puntos: 400 },    { emoji: "⭐", nombre: "Estrella", puntos: 600 },
];

export const ELOGIOS = [
  "¡Muy bien, {n}! ¡Lo leíste perfecto!", "¡Sos {un} {genia}, {n}!", "¡Qué bien que leés!",
  "¡Increíble! Cada día lo hacés mejor.", "¡Bravo, {n}! ¡Seguí así!", "¡Me encanta cómo leés!",
  "¡Excelente! ¡Sos {un} {campeona}!", "¡Guau! ¡Qué {lectora}!",
];
export const ELOGIOS_MATE = [
  "¡Muy bien, {n}! ¡Es correcto!", "¡Sos {un} {genia} de los números!", "¡Excelente cuenta, {n}!",
  "¡Bravo! ¡Lo resolviste!", "¡Qué rápida pensaste!", "¡Perfecto, {n}! ¡Seguí así!",
];
export const ANIMOS = [
  "¡Casi, {n}! Probemos otra vez.", "¡Muy cerca! Escuchá y probá de nuevo.",
  "No pasa nada, aprender es probar. ¡Otra vez!", "¡Vos podés! Intentemos {juntas}.",
];
export const ANIMOS_MATE = [
  "¡Casi! Contemos {juntas}.", "¡Muy cerca! Miremos otra vez los dibujos.", "¡Vos podés! Probemos de nuevo.",
];

// Género del jugador para los elogios: "a" (nena) u "o" (nene). Lo fija guardiaNina al cargar el perfil.
const GENERO = { g: "a" };
export const fijarGenero = (g) => { GENERO.g = g === "o" ? "o" : "a"; };
const FORMAS = { un: ["una", "un"], genia: ["genia", "genio"], campeona: ["campeona", "campeón"], lectora: ["lectora", "lector"],
  juntas: ["juntas", "juntos"], bienvenida: ["bienvenida", "bienvenido"] };
/** Adapta {genia}, {juntas}, etc. al género del jugador. */
export const g = (texto) => texto.replace(/\{(\w+)\}/g, (m, k) => (FORMAS[k] ? FORMAS[k][GENERO.g === "o" ? 1 : 0] : m));
export const frase = (lista, nombre) => g(lista[Math.floor(Math.random() * lista.length)]).replaceAll("{n}", nombre);

// ---------------------------------------------------------------- Inglés
export const CATEGORIAS_INGLES = {
  colores:  { titulo: "Colores",       en: "Colors",          emoji: "🎨", fondo: "bg-[linear-gradient(160deg,#ffdad6,#f48fb1)]" },
  numeros:  { titulo: "Números",       en: "Numbers",         emoji: "🔢", fondo: "bg-[linear-gradient(160deg,#c9e6ff,#89ceff)]" },
  animales: { titulo: "Animales",      en: "Animals",         emoji: "🦁", fondo: "bg-[linear-gradient(160deg,#ffddb8,#ffb95f)]" },
  cuerpo:   { titulo: "Mi cuerpo",     en: "My body",         emoji: "✋", fondo: "bg-[linear-gradient(160deg,#6ffbbe,#4edea3)]" },
  dias:     { titulo: "Días",          en: "Days of the week", emoji: "📅", fondo: "bg-[linear-gradient(160deg,#ede9fe,#c4b5fd)]" },
  palabras: { titulo: "Palabras",      en: "Words",           emoji: "👋", fondo: "bg-[linear-gradient(160deg,#fff3c4,#fdd835)]" },
};
export const ELOGIOS_INGLES = ["Great job", "Very good", "Excellent", "Well done", "Amazing", "Super"];

// ---------------------------------------------------------------- Kiosco
export const NIVELES_KIOSCO = {
  1: { titulo: "Conocer los billetes", emoji: "💵", tipos: ["reconocer", "pagarUno"], maxBillete: 500 },
  2: { titulo: "Juntar plata", emoji: "🪙", tipos: ["juntar", "juntar", "pagarUno"], maxBillete: 500, maxTotal: 1000 },
  3: { titulo: "El vuelto", emoji: "🧾", tipos: ["vuelto", "alcanza", "juntar"], maxBillete: 1000, maxTotal: 1000 },
};
export const GRACIAS_KIOSCO = ["¡Gracias! Acá tenés tu {p}.", "¡Justo! Tomá tu {p}.", "¡Perfecto! Que disfrutes tu {p}."];
