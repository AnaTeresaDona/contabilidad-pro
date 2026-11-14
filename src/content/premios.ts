/** El camino de premios: parte bajo tierra y sube hasta las estrellas. */
export type Zona = 'subsuelo' | 'tierra' | 'bosque' | 'aire' | 'cielo' | 'espacio';

export interface Premio {
  id: string;
  /** Emoji del premio (o 'topo' / 'copihue', que se dibujan aparte: no hay emoji fiel). */
  emoji: string;
  nombre: string;
  frase: string;
  /** Chispas de saber necesarias. */
  umbral: number;
  zona: Zona;
}

export const ZONAS: Record<Zona, { nombre: string; fondo: string; texto: string }> = {
  subsuelo: { nombre: 'Bajo tierra', fondo: 'from-stone-800 to-amber-900', texto: 'text-amber-100' },
  tierra: { nombre: 'La pradera', fondo: 'from-lime-600 to-amber-700', texto: 'text-white' },
  bosque: { nombre: 'El bosque', fondo: 'from-sky-300 to-emerald-600', texto: 'text-emerald-950' },
  aire: { nombre: 'Entre las nubes', fondo: 'from-sky-500 to-sky-200', texto: 'text-sky-950' },
  cielo: { nombre: 'El cielo', fondo: 'from-indigo-800 to-sky-500', texto: 'text-white' },
  espacio: { nombre: 'Las estrellas', fondo: 'from-slate-950 to-indigo-900', texto: 'text-indigo-100' },
};

export const PREMIOS: Premio[] = [
  { id: 'papita', emoji: '🥔', nombre: 'Papita', frase: 'Todo gran contador empezó bajo tierra.', umbral: 0, zona: 'subsuelo' },
  { id: 'topo', emoji: 'topo', nombre: 'Topo', frase: 'Cava túneles entre el Debe y el Haber.', umbral: 60, zona: 'subsuelo' },
  { id: 'lombriz', emoji: '🪱', nombre: 'Lombriz', frase: 'Pequeña, pero abona tu conocimiento.', umbral: 150, zona: 'subsuelo' },
  { id: 'hongo', emoji: '🍄', nombre: 'Hongo', frase: 'Creciste en la oscuridad del Libro Diario.', umbral: 280, zona: 'subsuelo' },
  { id: 'brote', emoji: '🌱', nombre: 'Brote', frase: '¡Saliste a la superficie!', umbral: 450, zona: 'tierra' },
  { id: 'caracol', emoji: '🐌', nombre: 'Caracol', frase: 'Lento pero seguro, como un buen cierre de mes.', umbral: 650, zona: 'tierra' },
  { id: 'chinita', emoji: '🐞', nombre: 'Chinita', frase: 'Trae suerte… y cuadraturas.', umbral: 900, zona: 'tierra' },
  { id: 'copihue', emoji: 'copihue', nombre: 'Copihue', frase: 'La flor nacional florece con tu esfuerzo.', umbral: 1200, zona: 'tierra' },
  { id: 'conejo', emoji: '🐇', nombre: 'Conejo', frase: 'Saltas de un nivel a otro.', umbral: 1550, zona: 'tierra' },
  { id: 'arbol', emoji: '🌳', nombre: 'Árbol', frase: 'Raíces firmes, ramas que crecen.', umbral: 1950, zona: 'bosque' },
  { id: 'ardilla', emoji: '🐿️', nombre: 'Ardilla', frase: 'Ahorra para el invierno: ¡provisiones!', umbral: 2400, zona: 'bosque' },
  { id: 'buho', emoji: '🦉', nombre: 'Búho', frase: 'Sabio como un auditor.', umbral: 2900, zona: 'bosque' },
  { id: 'mariposa', emoji: '🦋', nombre: 'Mariposa', frase: 'Te transformaste: ya no eres la papita del comienzo.', umbral: 3450, zona: 'aire' },
  { id: 'picaflor', emoji: '🐦', nombre: 'Picaflor', frase: 'Rápido y preciso con los números.', umbral: 4050, zona: 'aire' },
  { id: 'volantin', emoji: '🪁', nombre: 'Volantín', frase: 'Tu conocimiento ya vuela alto.', umbral: 4700, zona: 'aire' },
  { id: 'globo', emoji: '🎈', nombre: 'Globo', frase: 'Subes y subes sin parar.', umbral: 5400, zona: 'aire' },
  { id: 'condor', emoji: '🦅', nombre: 'Cóndor', frase: 'Dominas la cordillera de las NIIF.', umbral: 6200, zona: 'aire' },
  { id: 'nube', emoji: '☁️', nombre: 'Nube', frase: 'Estás sobre las nubes.', umbral: 7050, zona: 'cielo' },
  { id: 'arcoiris', emoji: '🌈', nombre: 'Arcoíris', frase: 'Después de la Operación Renta, siempre sale el sol.', umbral: 8000, zona: 'cielo' },
  { id: 'sol', emoji: '☀️', nombre: 'El Sol', frase: 'Brillas con luz propia.', umbral: 9000, zona: 'cielo' },
  { id: 'unicornio', emoji: '🦄', nombre: 'Unicornio volador', frase: 'Un contador que sabe NIIF y SII: ¡casi mitológico!', umbral: 10200, zona: 'cielo' },
  { id: 'luna', emoji: '🌙', nombre: 'La Luna', frase: 'Estudias hasta de noche.', umbral: 11500, zona: 'espacio' },
  { id: 'estrella', emoji: '⭐', nombre: 'Estrella', frase: 'Ya eres una estrella de la contabilidad.', umbral: 13000, zona: 'espacio' },
  { id: 'fugaz', emoji: '🌠', nombre: 'Estrella fugaz', frase: 'Pide un deseo: ¡un balance que cuadre a la primera!', umbral: 14700, zona: 'espacio' },
  { id: 'saturno', emoji: '🪐', nombre: 'Saturno', frase: 'Tus conocimientos tienen anillos.', umbral: 16500, zona: 'espacio' },
  { id: 'cometa', emoji: '☄️', nombre: 'Cometa', frase: 'Dejas una estela de asientos perfectos.', umbral: 18500, zona: 'espacio' },
  { id: 'galaxia', emoji: '🌌', nombre: 'Vía Láctea', frase: 'Tu saber ya no cabe en un planeta.', umbral: 21000, zona: 'espacio' },
  { id: 'unicornio_real', emoji: '👑', nombre: 'Corona del Unicornio Real', frase: 'Leyenda de la contabilidad chilena.', umbral: 24000, zona: 'espacio' },
  { id: 'constelacion', emoji: '✨', nombre: 'Constelación Contable', frase: 'Tu nombre quedó escrito en las estrellas. ¡Eres leyenda!', umbral: 28000, zona: 'espacio' },
];

/** Cuántos premios hay desbloqueados con estas chispas (al menos la papita). */
export function premiosDesbloqueados(chispas: number): number {
  return PREMIOS.filter((p) => chispas >= p.umbral).length;
}

export function premioActual(chispas: number): Premio {
  return PREMIOS[premiosDesbloqueados(chispas) - 1];
}

export function siguientePremio(chispas: number): Premio | null {
  return PREMIOS[premiosDesbloqueados(chispas)] ?? null;
}

/** Avance (0 a 1) hacia el siguiente premio. */
export function avanceAlSiguiente(chispas: number): number {
  const actual = premioActual(chispas);
  const sig = siguientePremio(chispas);
  if (!sig) return 1;
  return (chispas - actual.umbral) / (sig.umbral - actual.umbral);
}

/** Premios sin emoji propio: se dibujan en pantalla y en texto se usa este reemplazo. */
const EMOJI_TEXTO: Record<string, string> = { topo: '🐾', copihue: '🇨🇱' };

/** Emoji para usar en texto (compartir, avisos): los premios dibujados usan un reemplazo. */
export const emojiTexto = (p: { emoji: string }) => EMOJI_TEXTO[p.emoji] ?? p.emoji;
