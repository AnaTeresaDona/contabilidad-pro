import type { ErrorDetectado, ResultadoValidacion } from './types';
import { formatoCLP } from './dinero';

/**
 * Ejercicio de cálculo genérico: un enunciado con datos y una o más preguntas numéricas.
 * Sirve para depreciación, ajustes, Renta Líquida Imponible, ratios, etc.
 */
export interface PreguntaCalculo {
  id: string;
  etiqueta: string;
  valor: number;
  /** Cómo se calcula, en palabras y números. Se muestra en la auditoría si hay error. */
  formula: string;
  /** 'clp' (por defecto), 'numero', 'porcentaje' o 'veces' (ratios como 1,25 veces). */
  unidad?: 'clp' | 'numero' | 'porcentaje' | 'veces';
  /** Decimales aceptados (para ratios). Con 0 se exige el número exacto. */
  decimales?: number;
}

export interface EjercicioCalculo {
  titulo: string;
  enunciado: string;
  datos: { etiqueta: string; valor: string }[];
  preguntas: PreguntaCalculo[];
  pista: string;
  fuente: string;
}

export function formatearValor(p: PreguntaCalculo, v: number): string {
  const dec = p.decimales ?? 0;
  const num = v.toLocaleString('es-CL', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  switch (p.unidad) {
    case 'numero':
      return num;
    case 'porcentaje':
      return `${num}%`;
    case 'veces':
      return `${num} veces`;
    default:
      return formatoCLP(v);
  }
}

export function validarCalculo(ej: EjercicioCalculo, resp: Record<string, number | null>): ResultadoValidacion {
  const errores: ErrorDetectado[] = [];
  for (const p of ej.preguntas) {
    const r = resp[p.id];
    const tolerancia = p.decimales ? 0.5 * 10 ** -p.decimales : 0;
    if (r === null || r === undefined || Math.abs(r - p.valor) > tolerancia + 1e-9) {
      errores.push({
        tipo: 'calculo_incorrecto',
        detalle: `${p.etiqueta}: ${p.formula} = ${formatearValor(p, p.valor)}${r !== null && r !== undefined ? ` (pusiste ${formatearValor(p, r)})` : ''}.`,
        fuente: ej.fuente,
      });
    }
  }
  return { correcto: errores.length === 0, errores };
}
