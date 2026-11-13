import { infoError } from './errores';

/** Reglas del juego. Cambia estos números para ajustar la dificultad. */
export const REGLAS = {
  xpAcierto: 10,
  xpJefe: 50,
  comboDesde: 3,
  costoAuditoria: 2,
  danioLeve: 5,
  danioGrave: 15,
  curacionNivel: 25,
  triviaPreguntas: 8,
  triviaMinimo: 6,
  /** Chispas de saber: la moneda generosa que sube el camino de premios. */
  chispasAcierto: 15,
  chispasPrimerIntento: 10,
  chispasCombo: 5,
  chispasPaso: 60,
  chispasEstrella: 30,
  chispasNivel: 300,
  chispasDia: 40,
};

/** Chispas de un acierto: siempre se gana algo, aunque haya costado. */
export function chispasPorAcierto(combo: number, primerIntento: boolean): number {
  return REGLAS.chispasAcierto + (primerIntento ? REGLAS.chispasPrimerIntento : 0) + (combo >= REGLAS.comboDesde ? REGLAS.chispasCombo : 0);
}

/** Estrellas de un paso según el porcentaje de aciertos al primer intento. */
export function estrellasPorPrecision(precision: number): number {
  return precision >= 90 ? 3 : precision >= 70 ? 2 : 1;
}

export function chispasPorPaso(estrellas: number): number {
  return REGLAS.chispasPaso + estrellas * REGLAS.chispasEstrella;
}

/** XP de un acierto. Con pista o tras equivocarse se gana la mitad; con combo, el doble. */
export function xpPorAcierto(combo: number, conAyuda: boolean): number {
  const base = conAyuda ? REGLAS.xpAcierto / 2 : REGLAS.xpAcierto;
  return combo >= REGLAS.comboDesde ? base * 2 : base;
}

/** Daño a la caja: se aplica una vez por intento, según el error más grave. */
export function danioPorErrores(tipos: string[]): number {
  if (tipos.length === 0) return 0;
  return tipos.some((t) => infoError(t).severidad === 'grave') ? REGLAS.danioGrave : REGLAS.danioLeve;
}
