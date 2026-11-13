import type { ErrorDetectado, ResultadoValidacion } from './types';
import { formatoCLP } from './dinero';
import type { Pregunta } from './ejercicios';

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
  /** Diferencia aceptada (por defecto, media unidad del último decimal). Útil para días o porcentajes. */
  tolerancia?: number;
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

/** Diferencia aceptada entre la respuesta y el valor correcto. */
export function toleranciaDe(p: PreguntaCalculo): number {
  return p.tolerancia ?? (p.decimales ? 0.5 * 10 ** -p.decimales : 0);
}

export function validarCalculo(ej: EjercicioCalculo, resp: Record<string, number | null>): ResultadoValidacion {
  const errores: ErrorDetectado[] = [];
  for (const p of ej.preguntas) {
    const r = resp[p.id];
    const tolerancia = toleranciaDe(p);
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

/**
 * Desafío de decisión: primero los números, luego un diagnóstico y una decisión de alternativas.
 * Lo usan los jefes de análisis financiero (crisis de caja) y de matemática financiera (créditos).
 */
export interface DatosDecision {
  calculo: EjercicioCalculo;
  diagnostico: Pregunta;
  decision: Pregunta;
  /** Títulos de las tres partes (por defecto, los de la crisis de caja). */
  partes?: [string, string, string];
  /** Texto del botón para presentar. */
  boton?: string;
  /** Tema para las estadísticas. */
  tema?: string;
}
