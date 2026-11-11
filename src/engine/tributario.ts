import trib from '../config/tributario.json';
import type { Rng } from './azar';
import { barajar, elegirVarios, entero } from './azar';
import { formatoCLP } from './dinero';
import type { EjercicioCalculo } from './calculos';
import type { ErrorDetectado, ResultadoValidacion } from './types';

export const TASA_PRIMERA_CATEGORIA: number = trib.tasaPrimeraCategoria;
const TASA_TEXTO = `${Math.round(TASA_PRIMERA_CATEGORIA * 100)}%`;

/** Cómo afecta una partida a la Renta Líquida Imponible, partiendo del resultado contable antes de impuesto. */
export type AjusteRLI = 'agregado' | 'deduccion' | 'sin_ajuste';

export const ETIQUETA_AJUSTE: Record<AjusteRLI, string> = {
  agregado: 'Agregado (suma)',
  deduccion: 'Deducción (resta)',
  sin_ajuste: 'Sin ajuste',
};

/** Partida del banco de contenido: texto, tipo de ajuste y rango de montos. */
export interface PartidaBanco {
  id: string;
  texto: string;
  tipo: AjusteRLI;
  min: number;
  max: number;
  paso: number;
  explicacion: string;
  fuente: string;
}

export interface Partida extends PartidaBanco {
  monto: number;
}

/** Elige partidas variadas: algunas que se agregan, otras que se deducen y otras sin ajuste. */
export function elegirPartidas(rng: Rng, banco: PartidaBanco[], agregados: number, deducciones: number, sinAjuste: number): Partida[] {
  const de = (t: AjusteRLI, n: number) => elegirVarios(rng, banco.filter((p) => p.tipo === t), n);
  return barajar(rng, [...de('agregado', agregados), ...de('deduccion', deducciones), ...de('sin_ajuste', sinAjuste)]).map((p) => ({
    ...p,
    monto: entero(rng, p.min, p.max, p.paso),
  }));
}

export function totalPorTipo(partidas: Partida[], tipo: AjusteRLI): number {
  return partidas.filter((p) => p.tipo === tipo).reduce((a, p) => a + p.monto, 0);
}

export function impuestoPrimeraCategoria(rli: number): number {
  return rli > 0 ? Math.round(rli * TASA_PRIMERA_CATEGORIA) : 0;
}

export interface DatosOperacionRenta {
  resultadoContable: number;
  partidas: Partida[];
  ppm: number;
  rli: number;
  impuesto: number;
  /** Positivo: se paga en abril. Negativo: el SII devuelve. */
  saldo: number;
}

export function generarOperacionRenta(rng: Rng, banco: PartidaBanco[], n: { agregados: number; deducciones: number; sinAjuste: number }): DatosOperacionRenta {
  const resultadoContable = entero(rng, 25_000_000, 90_000_000, 100_000);
  const partidas = elegirPartidas(rng, banco, n.agregados, n.deducciones, n.sinAjuste);
  const rli = resultadoContable + totalPorTipo(partidas, 'agregado') - totalPorTipo(partidas, 'deduccion');
  const impuesto = impuestoPrimeraCategoria(rli);
  // A veces los PPM superan el impuesto (devolución) y a veces no (saldo a pagar).
  const ppm = Math.round((impuesto * entero(rng, 70, 120)) / 100 / 1_000) * 1_000;
  return { resultadoContable, partidas, ppm, rli, impuesto, saldo: impuesto - ppm };
}

/** Cálculo de la RLI y del impuesto: las partidas se muestran sin decir si se agregan o se deducen. */
export function calculoRLI(rng: Rng, banco: PartidaBanco[]): EjercicioCalculo {
  const d = generarOperacionRenta(rng, banco, { agregados: 2, deducciones: 1, sinAjuste: 1 });
  const ag = totalPorTipo(d.partidas, 'agregado');
  const de = totalPorTipo(d.partidas, 'deduccion');
  return {
    titulo: 'Renta Líquida Imponible',
    enunciado:
      'Parte del resultado contable antes de impuesto. Suma los gastos que la ley no acepta (agregados), resta las partidas que no tributan o que la ley permite rebajar (deducciones) e ignora las que ya están bien. Luego aplica la tasa del régimen general.',
    datos: [
      { etiqueta: 'Resultado contable antes de impuesto', valor: formatoCLP(d.resultadoContable) },
      ...d.partidas.map((p) => ({ etiqueta: p.texto, valor: formatoCLP(p.monto) })),
      { etiqueta: 'Tasa del Impuesto de Primera Categoría', valor: TASA_TEXTO },
    ],
    preguntas: [
      {
        id: 'agregados',
        etiqueta: 'Total agregados',
        valor: ag,
        formula: d.partidas.filter((p) => p.tipo === 'agregado').map((p) => formatoCLP(p.monto)).join(' + ') + ' (gastos rechazados o no aceptados aún)',
      },
      { id: 'deducciones', etiqueta: 'Total deducciones', valor: de, formula: d.partidas.filter((p) => p.tipo === 'deduccion').map((p) => formatoCLP(p.monto)).join(' + ') },
      { id: 'rli', etiqueta: 'Renta Líquida Imponible', valor: d.rli, formula: `${formatoCLP(d.resultadoContable)} + ${formatoCLP(ag)} − ${formatoCLP(de)}` },
      { id: 'impuesto', etiqueta: 'Impuesto de Primera Categoría', valor: d.impuesto, formula: `${formatoCLP(d.rli)} × ${TASA_TEXTO}` },
    ],
    pista:
      'Agregados: multas fiscales, provisiones y estimaciones aún no pagadas, deterioros contables, gastos sin respaldo o no necesarios. Deducciones: dividendos de otras S.A. chilenas, mayor depreciación acelerada, gastos de años anteriores pagados este año. Lo demás no se ajusta.',
    fuente: `LIR, arts. 29 a 33 (Renta Líquida Imponible); ${trib.fuentePrimeraCategoria}`,
  };
}

/** Saldo de la declaración anual: impuesto menos PPM pagados durante el año. */
export function calculoF22(rng: Rng): EjercicioCalculo {
  const rli = entero(rng, 20_000_000, 120_000_000, 10_000);
  const impuesto = impuestoPrimeraCategoria(rli);
  const ppm = Math.round((impuesto * entero(rng, 70, 125)) / 100 / 1_000) * 1_000;
  return {
    titulo: 'Operación Renta: el Formulario 22',
    enunciado:
      'En abril se declara el impuesto anual. Los PPM pagados mes a mes son anticipos: se descuentan del impuesto. Si pagaste más de lo que correspondía, el SII te devuelve la diferencia (escríbela con signo menos).',
    datos: [
      { etiqueta: 'Renta Líquida Imponible del año', valor: formatoCLP(rli) },
      { etiqueta: 'Tasa del Impuesto de Primera Categoría', valor: TASA_TEXTO },
      { etiqueta: 'PPM pagados durante el año', valor: formatoCLP(ppm) },
    ],
    preguntas: [
      { id: 'impuesto', etiqueta: 'Impuesto de Primera Categoría', valor: impuesto, formula: `${formatoCLP(rli)} × ${TASA_TEXTO}` },
      {
        id: 'saldo',
        etiqueta: 'Saldo a pagar (negativo = devolución)',
        valor: impuesto - ppm,
        formula: `${formatoCLP(impuesto)} − ${formatoCLP(ppm)} de PPM`,
      },
    ],
    pista: 'Impuesto = RLI × tasa. Saldo = impuesto − PPM. Si el resultado es negativo, es una devolución.',
    fuente: 'LIR, arts. 20, 65 y 84 (PPM); Formulario 22 del SII',
  };
}

/** Valida la clasificación de partidas (agregado, deducción o sin ajuste). */
export function validarClasificacionPartidas(partidas: Partida[], resp: Record<string, AjusteRLI | null>): ErrorDetectado[] {
  return partidas
    .filter((p) => resp[p.id] !== p.tipo)
    .map((p) => ({
      tipo: 'clasificacion_tributaria',
      detalle: `"${p.texto}" es ${ETIQUETA_AJUSTE[p.tipo].toLowerCase()}${resp[p.id] ? `, no ${ETIQUETA_AJUSTE[resp[p.id]!].toLowerCase()}` : ''}. ${p.explicacion}`,
      fuente: p.fuente,
    }));
}

export interface RespuestaOperacionRenta {
  clasificacion: Record<string, AjusteRLI | null>;
  rli: number | null;
  impuesto: number | null;
  saldo: number | null;
}

/** Valida el jefe del Nivel 5: clasificación de partidas y cálculos del F22. */
export function validarOperacionRenta(d: DatosOperacionRenta, r: RespuestaOperacionRenta): ResultadoValidacion {
  const errores = validarClasificacionPartidas(d.partidas, r.clasificacion);
  const ag = totalPorTipo(d.partidas, 'agregado');
  const de = totalPorTipo(d.partidas, 'deduccion');
  const fuente = 'LIR, arts. 20, 29 a 33; Formulario 22 del SII';
  if (r.rli !== d.rli)
    errores.push({ tipo: 'calculo_incorrecto', detalle: `RLI: ${formatoCLP(d.resultadoContable)} + agregados ${formatoCLP(ag)} − deducciones ${formatoCLP(de)} = ${formatoCLP(d.rli)}.`, fuente });
  if (r.impuesto !== d.impuesto)
    errores.push({ tipo: 'calculo_incorrecto', detalle: `Impuesto: ${formatoCLP(d.rli)} × ${TASA_TEXTO} = ${formatoCLP(d.impuesto)}.`, fuente });
  if (r.saldo !== d.saldo)
    errores.push({
      tipo: 'calculo_incorrecto',
      detalle: `Saldo del F22: ${formatoCLP(d.impuesto)} − PPM ${formatoCLP(d.ppm)} = ${formatoCLP(d.saldo)}${d.saldo < 0 ? ' (devolución)' : ' (a pagar)'}.`,
      fuente,
    });
  return { correcto: errores.length === 0, errores };
}
