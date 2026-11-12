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
  ejerciciosPractica: 8,
};

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
