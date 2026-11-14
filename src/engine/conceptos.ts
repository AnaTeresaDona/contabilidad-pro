import type { Rng } from './azar';
import { barajar } from './azar';

/**
 * Repaso de conceptos: preguntas de alternativas con una respuesta completa y correcta,
 * dos correctas pero incompletas (enseñan a precisar) y dos incorrectas.
 * Solo la completa cuenta como buena.
 */
export interface PreguntaConcepto {
  id: string;
  pregunta: string;
  completa: string;
  incompletas: { texto: string; falta: string }[];
  incorrectas: string[];
  explicacion: string;
  fuente: string;
}

export type TipoAlternativa = 'completa' | 'incompleta' | 'incorrecta';

export interface Alternativa {
  texto: string;
  tipo: TipoAlternativa;
  /** Solo en las incompletas: qué le falta. */
  falta?: string;
}

export interface PreguntaSesion {
  pregunta: PreguntaConcepto;
  alternativas: Alternativa[];
}

/** Respuesta de una pregunta: el índice elegido, o null si se saltó o no se alcanzó a responder. */
export type Respuesta = number | null;

export function alternativasDe(rng: Rng, p: PreguntaConcepto): Alternativa[] {
  return barajar(rng, [
    { texto: p.completa, tipo: 'completa' as const },
    ...p.incompletas.map((i) => ({ texto: i.texto, tipo: 'incompleta' as const, falta: i.falta })),
    ...p.incorrectas.map((texto) => ({ texto, tipo: 'incorrecta' as const })),
  ]);
}

/** Arma una sesión con hasta `n` preguntas al azar del banco, con las alternativas barajadas. */
export function armarSesion(rng: Rng, banco: PreguntaConcepto[], n = 10): PreguntaSesion[] {
  return barajar(rng, banco)
    .slice(0, n)
    .map((pregunta) => ({ pregunta, alternativas: alternativasDe(rng, pregunta) }));
}

export interface ResultadoSesion {
  total: number;
  buenas: number;
  malas: number;
  /** Malas porque se eligió una alternativa correcta pero incompleta. */
  incompletas: number;
  noRespondidas: number;
  pctBuenas: number;
  pctMalas: number;
  pctNoRespondidas: number;
  /** Preguntas para el refuerzo: las malas (incluidas las incompletas). */
  paraReforzar: PreguntaConcepto[];
  /** Las no respondidas, por si se quieren repasar también. */
  sinResponder: PreguntaConcepto[];
}

const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);

export function resultadoSesion(sesion: PreguntaSesion[], respuestas: Respuesta[]): ResultadoSesion {
  let buenas = 0;
  let incompletas = 0;
  let incorrectas = 0;
  const paraReforzar: PreguntaConcepto[] = [];
  const sinResponder: PreguntaConcepto[] = [];
  sesion.forEach((s, i) => {
    const r = respuestas[i];
    if (r === null || r === undefined) {
      sinResponder.push(s.pregunta);
      return;
    }
    const tipo = s.alternativas[r]?.tipo;
    if (tipo === 'completa') buenas++;
    else {
      if (tipo === 'incompleta') incompletas++;
      else incorrectas++;
      paraReforzar.push(s.pregunta);
    }
  });
  const total = sesion.length;
  const malas = incompletas + incorrectas;
  const noRespondidas = sinResponder.length;
  return {
    total,
    buenas,
    malas,
    incompletas,
    noRespondidas,
    pctBuenas: pct(buenas, total),
    pctMalas: pct(malas, total),
    // Que los tres porcentajes sumen 100 aunque haya redondeos.
    pctNoRespondidas: total ? 100 - pct(buenas, total) - pct(malas, total) : 0,
    paraReforzar,
    sinResponder,
  };
}
