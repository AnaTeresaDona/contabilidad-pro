import type { ErrorDetectado, ResultadoValidacion } from './types';
import { cuenta } from './cuentas';
import { formatoCLP } from './dinero';

/**
 * Estados financieros básicos a partir de los saldos del mayor:
 * - Estado de Resultados: Ventas − Costo = Margen bruto − Gastos operacionales = Resultado operacional
 *   ± Partidas no operacionales = Resultado antes de impuesto.
 * - Balance General (Estado de Situación Financiera) clasificado en corriente y no corriente.
 */

export type Seccion = 'activo_corriente' | 'activo_no_corriente' | 'pasivo_corriente' | 'pasivo_no_corriente' | 'patrimonio' | 'resultados';
export type SeccionBG = Exclude<Seccion, 'resultados'>;

export const SECCIONES_BG: SeccionBG[] = ['activo_corriente', 'activo_no_corriente', 'pasivo_corriente', 'pasivo_no_corriente', 'patrimonio'];

export const ETIQUETA_SECCION: Record<Seccion, string> = {
  activo_corriente: 'Activo corriente',
  activo_no_corriente: 'Activo no corriente',
  pasivo_corriente: 'Pasivo corriente',
  pasivo_no_corriente: 'Pasivo no corriente',
  patrimonio: 'Patrimonio',
  resultados: 'Estado de Resultados',
};

/** Fila mínima para construir los estados: una cuenta con sus sumas del mayor. */
export interface FilaSaldo {
  cuentaId: string;
  debe: number;
  haber: number;
}

export interface LineaEstado {
  cuentaId: string;
  monto: number;
}

export function seccionDe(cuentaId: string): Seccion {
  const c = cuenta(cuentaId);
  switch (c.tipo) {
    case 'activo':
      return c.grupo === 'no_corriente' ? 'activo_no_corriente' : 'activo_corriente';
    case 'pasivo':
      return c.grupo === 'no_corriente' ? 'pasivo_no_corriente' : 'pasivo_corriente';
    case 'patrimonio':
      return 'patrimonio';
    default:
      return 'resultados';
  }
}

/** Saldo con signo: positivo cuando la cuenta tiene su saldo habitual (activo/gasto deudor; el resto acreedor). */
export function montoNormal(f: FilaSaldo): number {
  const t = cuenta(f.cuentaId).tipo;
  return t === 'activo' || t === 'gasto' ? f.debe - f.haber : f.haber - f.debe;
}

const suma = (xs: LineaEstado[]) => xs.reduce((a, x) => a + x.monto, 0);

export interface EstadoResultados {
  ventas: LineaEstado[];
  costo: LineaEstado[];
  margenBruto: number;
  gastosOperacionales: LineaEstado[];
  resultadoOperacional: number;
  otrosIngresos: LineaEstado[];
  otrosGastos: LineaEstado[];
  resultadoAntesImpuesto: number;
}

export function construirEERR(filas: FilaSaldo[]): EstadoResultados {
  const lineas = (pred: (tipo: string, grupo?: string) => boolean) =>
    filas
      .filter((f) => {
        const c = cuenta(f.cuentaId);
        return pred(c.tipo, c.grupo);
      })
      .map((f) => ({ cuentaId: f.cuentaId, monto: montoNormal(f) }));

  const ventas = lineas((t, g) => t === 'ingreso' && g !== 'no_operacional');
  const costo = lineas((t, g) => t === 'gasto' && g === 'costo');
  const gastosOperacionales = lineas((t, g) => t === 'gasto' && g !== 'costo' && g !== 'no_operacional');
  const otrosIngresos = lineas((t, g) => t === 'ingreso' && g === 'no_operacional');
  const otrosGastos = lineas((t, g) => t === 'gasto' && g === 'no_operacional');

  const margenBruto = suma(ventas) - suma(costo);
  const resultadoOperacional = margenBruto - suma(gastosOperacionales);
  const resultadoAntesImpuesto = resultadoOperacional + suma(otrosIngresos) - suma(otrosGastos);
  return { ventas, costo, margenBruto, gastosOperacionales, resultadoOperacional, otrosIngresos, otrosGastos, resultadoAntesImpuesto };
}

export interface TotalesBG {
  activoCorriente: number;
  activoNoCorriente: number;
  totalActivos: number;
  pasivoCorriente: number;
  pasivoNoCorriente: number;
  totalPasivos: number;
  patrimonio: number;
  totalPasivoPatrimonio: number;
}

export interface BalanceGeneral {
  secciones: Record<SeccionBG, LineaEstado[]>;
  /** Resultado del ejercicio (positivo = utilidad). Se presenta dentro del Patrimonio. */
  resultado: number;
  totales: TotalesBG;
}

export function calcularTotalesBG(secciones: Record<SeccionBG, LineaEstado[]>, resultadoEnPatrimonio: number): TotalesBG {
  const activoCorriente = suma(secciones.activo_corriente);
  const activoNoCorriente = suma(secciones.activo_no_corriente);
  const pasivoCorriente = suma(secciones.pasivo_corriente);
  const pasivoNoCorriente = suma(secciones.pasivo_no_corriente);
  const patrimonio = suma(secciones.patrimonio) + resultadoEnPatrimonio;
  return {
    activoCorriente,
    activoNoCorriente,
    totalActivos: activoCorriente + activoNoCorriente,
    pasivoCorriente,
    pasivoNoCorriente,
    totalPasivos: pasivoCorriente + pasivoNoCorriente,
    patrimonio,
    totalPasivoPatrimonio: pasivoCorriente + pasivoNoCorriente + patrimonio,
  };
}

export function seccionesVacias(): Record<SeccionBG, LineaEstado[]> {
  return { activo_corriente: [], activo_no_corriente: [], pasivo_corriente: [], pasivo_no_corriente: [], patrimonio: [] };
}

export function construirBG(filas: FilaSaldo[]): BalanceGeneral {
  const secciones = seccionesVacias();
  for (const f of filas) {
    const s = seccionDe(f.cuentaId);
    if (s !== 'resultados') secciones[s].push({ cuentaId: f.cuentaId, monto: montoNormal(f) });
  }
  const resultado = construirEERR(filas).resultadoAntesImpuesto;
  return { secciones, resultado, totales: calcularTotalesBG(secciones, resultado) };
}

export interface RespuestaEERR {
  margenBruto: number | null;
  resultadoOperacional: number | null;
  resultadoAntesImpuesto: number | null;
}

export function validarEERR(e: EstadoResultados, r: RespuestaEERR): ResultadoValidacion {
  const errores: ErrorDetectado[] = [];
  const revisar = (valor: number | null, correcto: number, nombre: string, formula: string) => {
    if (valor !== correcto)
      errores.push({
        tipo: 'subtotal_eerr',
        detalle: `${nombre}: ${formula} = ${formatoCLP(correcto)}${valor !== null ? ` (pusiste ${formatoCLP(valor)})` : ''}.`,
      });
  };
  revisar(r.margenBruto, e.margenBruto, 'Margen bruto', 'Ventas − Costo de ventas');
  revisar(r.resultadoOperacional, e.resultadoOperacional, 'Resultado operacional', 'Margen bruto − Gastos de administración y ventas');
  revisar(
    r.resultadoAntesImpuesto,
    e.resultadoAntesImpuesto,
    'Resultado antes de impuesto',
    'Resultado operacional + Ingresos no operacionales − Gastos no operacionales',
  );
  return { correcto: errores.length === 0, errores };
}

/** `resp` asigna una sección a cada cuenta; la clave "resultado" es la línea del resultado del ejercicio. */
export function validarBG(bg: BalanceGeneral, resp: Record<string, SeccionBG | null>): ResultadoValidacion {
  const errores: ErrorDetectado[] = [];
  for (const s of SECCIONES_BG)
    for (const l of bg.secciones[s]) {
      if (resp[l.cuentaId] === s) continue;
      const c = cuenta(l.cuentaId);
      const motivo =
        s === 'activo_no_corriente'
          ? 'es un bien que la empresa usará por más de 12 meses (activo fijo)'
          : s === 'activo_corriente'
            ? 'se convierte en dinero o se usa dentro de los próximos 12 meses'
            : s === 'pasivo_no_corriente'
              ? 'se paga en un plazo mayor a 12 meses'
              : s === 'pasivo_corriente'
                ? 'se paga dentro de los próximos 12 meses'
                : 'es un aporte o una ganancia que pertenece a los dueños';
      errores.push({ tipo: 'seccion_balance', detalle: `${c.nombre} va en ${ETIQUETA_SECCION[s]}: ${motivo}.` });
    }
  if (resp.resultado !== 'patrimonio')
    errores.push({
      tipo: 'seccion_balance',
      detalle: `El resultado del ejercicio (${formatoCLP(bg.resultado)}) va en Patrimonio: la ${bg.resultado >= 0 ? 'utilidad' : 'pérdida'} pertenece a los dueños hasta que se reparta o se cubra.`,
    });
  return { correcto: errores.length === 0, errores };
}
