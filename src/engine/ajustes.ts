import type { Rng } from './azar';
import { elegirVarios, entero } from './azar';
import { formatoCLP } from './dinero';
import type { EjercicioCalculo } from './calculos';
import { construirBalance } from './balance8';
import { construirBG, construirEERR } from './estados';
import { generarTransaccion, type Plantilla, type Transaccion } from './plantillas';
import { mesConActivoFijo } from './ejercicios';

const ACTIVOS = [
  { nombre: 'un horno industrial', min: 3_000_000, max: 12_000_000, vida: [5, 10] },
  { nombre: 'una camioneta de reparto', min: 8_000_000, max: 18_000_000, vida: [5, 8] },
  { nombre: 'una amasadora', min: 1_500_000, max: 5_000_000, vida: [4, 8] },
] as const;

/** Depreciación lineal: anual, mensual y valor libro después de algunos años. */
export function calculoDepreciacion(rng: Rng): EjercicioCalculo {
  const a = ACTIVOS[Math.floor(rng() * ACTIVOS.length)];
  const costo = entero(rng, a.min, a.max, 100_000);
  const vida = entero(rng, a.vida[0], a.vida[1]);
  const residual = Math.round((costo * entero(rng, 5, 15)) / 100 / 10_000) * 10_000;
  const anios = entero(rng, 1, vida - 1);
  const anual = Math.round((costo - residual) / vida);
  const mensual = Math.round((costo - residual) / (vida * 12));
  const libro = costo - anual * anios;
  return {
    titulo: 'Depreciación lineal',
    enunciado: `La empresa compró ${a.nombre}. Se deprecia en línea recta: el mismo monto cada período, durante su vida útil, hasta llegar al valor residual.`,
    datos: [
      { etiqueta: 'Costo de adquisición', valor: formatoCLP(costo) },
      { etiqueta: 'Valor residual estimado', valor: formatoCLP(residual) },
      { etiqueta: 'Vida útil', valor: `${vida} años` },
    ],
    preguntas: [
      { id: 'anual', etiqueta: 'Depreciación anual', valor: anual, formula: `(${formatoCLP(costo)} − ${formatoCLP(residual)}) ÷ ${vida}` },
      { id: 'mensual', etiqueta: 'Depreciación mensual', valor: mensual, formula: `(${formatoCLP(costo)} − ${formatoCLP(residual)}) ÷ (${vida} × 12)` },
      {
        id: 'libro',
        etiqueta: `Valor libro al final del año ${anios}`,
        valor: libro,
        formula: `${formatoCLP(costo)} − ${formatoCLP(anual)} × ${anios} (costo − depreciación acumulada)`,
      },
    ],
    pista: 'Monto a depreciar = costo − valor residual. Depreciación anual = monto a depreciar ÷ años de vida útil. Valor libro = costo − depreciación acumulada.',
    fuente: 'NIIF para las PYMES, Sección 17 (Propiedades, planta y equipo)',
  };
}

/**
 * Reexpresión simplificada: un balance "antes de ajustes" y tres ajustes de auditoría.
 * Hay que calcular cómo quedan el resultado, los activos y los pasivos después de ajustar.
 */
export function calculoReexpresion(rng: Rng, plantillas: Plantilla[]): EjercicioCalculo {
  const { balance } = mesConActivoFijo(rng, plantillas, 3);
  const bg = construirBG(balance.filas);
  const t = bg.totales;
  const dep = entero(rng, 40_000, 250_000, 1_000);
  const det = entero(rng, 30_000, 300_000, 1_000);
  const prov = entero(rng, 200_000, 1_500_000, 10_000);
  const resultado = bg.resultado - dep - det - prov;
  return {
    titulo: 'Estados antes y después de los ajustes',
    enunciado:
      'El contador externo revisó el cierre y encontró tres ajustes sin registrar. Calcula cómo quedan las cifras principales después de ajustar. Pista: piensa qué cuenta de balance toca cada ajuste.',
    datos: [
      { etiqueta: 'Total activos (antes)', valor: formatoCLP(t.totalActivos) },
      { etiqueta: 'Total pasivos (antes)', valor: formatoCLP(t.totalPasivos) },
      { etiqueta: 'Resultado del ejercicio (antes)', valor: formatoCLP(bg.resultado) },
      { etiqueta: 'Ajuste 1 · Depreciación del mes', valor: formatoCLP(dep) },
      { etiqueta: 'Ajuste 2 · Deterioro de clientes', valor: formatoCLP(det) },
      { etiqueta: 'Ajuste 3 · Provisión por una demanda probable', valor: formatoCLP(prov) },
    ],
    preguntas: [
      {
        id: 'resultado',
        etiqueta: 'Resultado ajustado',
        valor: resultado,
        formula: `${formatoCLP(bg.resultado)} − ${formatoCLP(dep)} − ${formatoCLP(det)} − ${formatoCLP(prov)} (los tres ajustes son gastos)`,
      },
      {
        id: 'activos',
        etiqueta: 'Total activos ajustado',
        valor: t.totalActivos - dep - det,
        formula: `${formatoCLP(t.totalActivos)} − ${formatoCLP(dep)} − ${formatoCLP(det)} (la depreciación acumulada y la estimación de incobrables restan activos; la provisión no)`,
      },
      {
        id: 'pasivos',
        etiqueta: 'Total pasivos ajustado',
        valor: t.totalPasivos + prov,
        formula: `${formatoCLP(t.totalPasivos)} + ${formatoCLP(prov)} (la provisión es un pasivo nuevo)`,
      },
    ],
    pista: 'Los tres ajustes son gastos: bajan el resultado. La depreciación y el deterioro reducen activos (por sus cuentas complementarias). La provisión aumenta los pasivos.',
    fuente: 'NIIF para las PYMES, Secciones 11, 17 y 21',
  };
}

export interface DatosAjustesCierre {
  ajustes: Transaccion[];
  resultadoPrevio: number;
  resultadoAjustado: number;
}

/** Jefe del Nivel 4A: registrar tres ajustes de cierre y calcular el resultado ajustado. */
export function generarAjustesCierre(rng: Rng, mesPlantillas: Plantilla[], ajustes: Plantilla[], n = 3): DatosAjustesCierre {
  const { balance } = mesConActivoFijo(rng, mesPlantillas, 3);
  const resultadoPrevio = construirEERR(balance.filas).resultadoAntesImpuesto;
  const trans = elegirVarios(rng, ajustes, n).map((p) => generarTransaccion(p, rng));
  const efecto = construirEERR(construirBalance(trans.map((t) => t.asiento)).filas).resultadoAntesImpuesto;
  return { ajustes: trans, resultadoPrevio, resultadoAjustado: resultadoPrevio + efecto };
}
