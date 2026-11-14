import type { Rng } from './azar';
import { barajar, entero } from './azar';
import { formatoCLP } from './dinero';
import { TASA_PRIMERA_CATEGORIA } from './tributario';
import type { DatosDecision, EjercicioCalculo, PreguntaCalculo } from './calculos';
import type { Pregunta } from './ejercicios';
import type { EjercicioOrdenar } from './ordenar';

/**
 * De la NIC 1 a la NIIF 18 (Nivel 9): las cinco categorías del estado del resultado,
 * los subtotales obligatorios, las medidas del rendimiento definidas por la gerencia (MPM)
 * y la reexpresión del comparativo en la transición (vigente desde el 1 de enero de 2027).
 */

const clp = formatoCLP;
const mil = (rng: Rng, min: number, max: number) => entero(rng, min, max) * 1_000;
const exacto = (id: string, etiqueta: string, valor: number, formula: string): PreguntaCalculo => ({ id, etiqueta, valor: Math.round(valor), formula });

/** Un estado del resultado de la ferretería, con partidas de las tres primeras categorías. */
export interface ResultadoNiif18 {
  ventas: number;
  costo: number;
  gastosOperacion: number;
  reestructuracion: number;
  asociadas: number;
  interesesGanados: number;
  interesesPrestamo: number;
  interesesArriendo: number;
}

export function generarResultado(rng: Rng): ResultadoNiif18 {
  const ventas = mil(rng, 300_000, 900_000);
  return {
    ventas,
    costo: Math.round((ventas * entero(rng, 50, 62)) / 100 / 1000) * 1000,
    gastosOperacion: Math.round((ventas * entero(rng, 15, 24)) / 100 / 1000) * 1000,
    reestructuracion: mil(rng, 3_000, 15_000),
    asociadas: mil(rng, 2_000, 20_000),
    interesesGanados: mil(rng, 1_000, 8_000),
    interesesPrestamo: mil(rng, 4_000, 18_000),
    interesesArriendo: mil(rng, 1_000, 6_000),
  };
}

export function subtotales(r: ResultadoNiif18) {
  const operacion = r.ventas - r.costo - r.gastosOperacion - r.reestructuracion;
  const antesFinanciacion = operacion + r.asociadas + r.interesesGanados;
  const antesImpuestos = antesFinanciacion - r.interesesPrestamo - r.interesesArriendo;
  const impuesto = Math.round(antesImpuestos * TASA_PRIMERA_CATEGORIA);
  return { operacion, antesFinanciacion, antesImpuestos, impuesto, periodo: antesImpuestos - impuesto };
}

const datosResultado = (r: ResultadoNiif18) => [
  { etiqueta: 'Ingresos de actividades ordinarias', valor: clp(r.ventas) },
  { etiqueta: 'Costo de ventas', valor: clp(r.costo) },
  { etiqueta: 'Gastos de administración y ventas', valor: clp(r.gastosOperacion) },
  { etiqueta: 'Gastos de reestructuración', valor: clp(r.reestructuracion) },
  { etiqueta: 'Participación en ganancias de asociadas (método de la participación)', valor: clp(r.asociadas) },
  { etiqueta: 'Intereses ganados en depósitos a plazo (equivalentes al efectivo)', valor: clp(r.interesesGanados) },
  { etiqueta: 'Intereses del préstamo bancario', valor: clp(r.interesesPrestamo) },
  { etiqueta: 'Intereses del pasivo por arrendamiento (NIIF 16)', valor: clp(r.interesesArriendo) },
];

/** Calcular los subtotales obligatorios de la NIIF 18. */
export function calculoSubtotalesNiif18(rng: Rng): EjercicioCalculo {
  const r = generarResultado(rng);
  const s = subtotales(r);
  return {
    titulo: 'Los subtotales de la NIIF 18',
    enunciado: `Clasifica cada partida en su categoría y calcula los subtotales del nuevo estado del resultado. Tasa de impuesto: ${Math.round(TASA_PRIMERA_CATEGORIA * 100)}% sobre el resultado antes de impuestos.`,
    datos: barajar(rng, datosResultado(r)),
    preguntas: [
      exacto('op', 'Resultado de operación', s.operacion, `${clp(r.ventas)} − ${clp(r.costo)} − ${clp(r.gastosOperacion)} − ${clp(r.reestructuracion)} (la reestructuración es de operación)`),
      exacto('afi', 'Resultado antes de financiación e impuestos a las ganancias', s.antesFinanciacion, `${clp(s.operacion)} + asociadas ${clp(r.asociadas)} + intereses ganados ${clp(r.interesesGanados)} (categoría de inversión)`),
      exacto('ai', 'Resultado antes de impuestos', s.antesImpuestos, `${clp(s.antesFinanciacion)} − ${clp(r.interesesPrestamo)} − ${clp(r.interesesArriendo)} (categoría de financiación)`),
      exacto('rp', 'Resultado del periodo', s.periodo, `${clp(s.antesImpuestos)} − impuesto ${clp(s.impuesto)}`),
    ],
    pista: 'Operación: todo lo del negocio, incluidos gastos inusuales como la reestructuración. Inversión: asociadas por el método de la participación y los rendimientos del efectivo. Financiación: intereses del préstamo y del pasivo por arrendamiento. Resultado de operación → + inversión = antes de financiación e impuestos → − financiación = antes de impuestos → − impuesto = resultado del periodo.',
    fuente: 'NIIF 18, párrafos 47, 53, 59 y 69 a 72',
  };
}

/** Reexpresar el resultado de operación que se presentaba con la NIC 1. */
export function calculoReexpresionNic1(rng: Rng): EjercicioCalculo {
  const r = generarResultado(rng);
  const perdidaVenta = mil(rng, 1_000, 6_000);
  const s = subtotales(r);
  const nuevoOperacion = s.operacion - perdidaVenta;
  // Con la NIC 1 la ferretería presentaba un "resultado operacional" propio: sin la reestructuración
  // ni la pérdida por venta del camión (las dejaba en "otras ganancias y pérdidas") y con los intereses ganados dentro.
  const antiguo = nuevoOperacion + r.reestructuracion + perdidaVenta + r.interesesGanados;
  return {
    titulo: 'De la NIC 1 a la NIIF 18: el resultado de operación',
    enunciado:
      'Con la NIC 1, la ferretería mostraba un «resultado operacional» definido por ella misma: dejaba fuera la reestructuración y la pérdida por la venta de un camión (las mostraba más abajo como «otras pérdidas») e incluía los intereses ganados en depósitos. Reexprésalo según la NIIF 18 para el comparativo.',
    datos: [
      { etiqueta: '«Resultado operacional» presentado con NIC 1', valor: clp(antiguo) },
      { etiqueta: 'Gastos de reestructuración (estaban fuera)', valor: clp(r.reestructuracion) },
      { etiqueta: 'Pérdida por venta de un camión (estaba fuera)', valor: clp(perdidaVenta) },
      { etiqueta: 'Intereses ganados en depósitos (estaban dentro)', valor: clp(r.interesesGanados) },
    ],
    preguntas: [
      exacto('nuevo', 'Resultado de operación según NIIF 18', nuevoOperacion, `${clp(antiguo)} − ${clp(r.reestructuracion)} − ${clp(perdidaVenta)} − ${clp(r.interesesGanados)}`),
      exacto('dif', 'Diferencia en la conciliación (NIIF 18 − NIC 1)', nuevoOperacion - antiguo, `${clp(nuevoOperacion)} − ${clp(antiguo)}`),
    ],
    pista: 'En la NIIF 18 la categoría de operación es la «residual»: todo lo que no es inversión, financiación, impuestos ni discontinuadas, aunque sea inusual (reestructuración, pérdida por venta de activo fijo). Los intereses del efectivo y depósitos se van a inversión. La diferencia será negativa: escríbela con signo menos.',
    fuente: 'NIIF 18, párrafos 52, 53 y C3',
  };
}

/** Medida del rendimiento definida por la gerencia: el "resultado operacional ajustado". */
export function calculoMPM(rng: Rng): EjercicioCalculo {
  const operacion = mil(rng, 60_000, 200_000);
  const reestructuracion = mil(rng, 3_000, 15_000);
  const deterioro = mil(rng, 2_000, 12_000);
  const tasa = TASA_PRIMERA_CATEGORIA;
  const mpm = operacion + reestructuracion + deterioro;
  return {
    titulo: 'La medida del rendimiento definida por la gerencia',
    enunciado: `En sus comunicados a la prensa, Don Lucho informa un «resultado operacional ajustado» que excluye la reestructuración y el deterioro de una sucursal. Calcula la medida y el efecto en el impuesto de cada partida de la conciliación (tasa ${Math.round(tasa * 100)}%).`,
    datos: [
      { etiqueta: 'Resultado de operación (NIIF 18)', valor: clp(operacion) },
      { etiqueta: 'Gastos de reestructuración', valor: clp(reestructuracion) },
      { etiqueta: 'Deterioro de la sucursal (NIC 36)', valor: clp(deterioro) },
    ],
    preguntas: [
      exacto('mpm', 'Resultado operacional ajustado', mpm, `${clp(operacion)} + ${clp(reestructuracion)} + ${clp(deterioro)}`),
      exacto('t1', 'Efecto en impuesto de la reestructuración', reestructuracion * tasa, `${clp(reestructuracion)} × ${Math.round(tasa * 100)}%`),
      exacto('t2', 'Efecto en impuesto del deterioro', deterioro * tasa, `${clp(deterioro)} × ${Math.round(tasa * 100)}%`),
    ],
    pista: 'Una MPM es un subtotal propio que se usa en comunicaciones públicas para mostrar la visión de la gerencia. Se revela en una sola nota, con su conciliación con el subtotal NIIF más parecido (aquí, el resultado de operación) y, para cada partida conciliatoria, su efecto en el impuesto y en las participaciones no controladoras.',
    fuente: 'NIIF 18, párrafos 117, 118, 122 y 123',
  };
}

const LINEAS_NIIF18 = [
  { id: 'ing', texto: 'Ingresos de actividades ordinarias', por: 'El estado parte por los ingresos del negocio (categoría de operación).' },
  { id: 'cos', texto: 'Costo de ventas', por: 'Gasto de operación, presentado por función.' },
  { id: 'gop', texto: 'Gastos de administración, ventas y otros de operación', por: 'Siguen siendo de operación, aunque sean inusuales.' },
  { id: 'rop', texto: 'Resultado de operación', por: 'Primer subtotal obligatorio: todo lo de la categoría de operación.' },
  { id: 'inv', texto: 'Participación en asociadas e ingresos por inversiones', por: 'Categoría de inversión, después del resultado de operación.' },
  { id: 'rafi', texto: 'Resultado antes de financiación e impuestos a las ganancias', por: 'Segundo subtotal obligatorio: operación + inversión.' },
  { id: 'fin', texto: 'Gastos de financiación (intereses de préstamos y arriendos)', por: 'Categoría de financiación.' },
  { id: 'rai', texto: 'Resultado antes de impuestos', por: 'Después de la financiación.' },
  { id: 'imp', texto: 'Gasto por impuestos a las ganancias', por: 'Categoría de impuestos a las ganancias.' },
  { id: 'cont', texto: 'Resultado de operaciones continuadas', por: 'Antes de las discontinuadas.' },
  { id: 'disc', texto: 'Resultado de operaciones discontinuadas', por: 'Categoría de operaciones discontinuadas (NIIF 5).' },
  { id: 'per', texto: 'Resultado del periodo', por: 'Tercer subtotal obligatorio: la última línea.' },
];

/** Ordenar la nueva estructura del estado del resultado. */
export function ordenEstadoNiif18(rng: Rng): EjercicioOrdenar {
  const items = LINEAS_NIIF18;
  let mezcla = barajar(rng, items.map((i) => i.id));
  while (mezcla.every((id, i) => id === items[i].id)) mezcla = barajar(rng, mezcla);
  return {
    titulo: 'Ordena el estado del resultado NIIF 18',
    instruccion: 'Toca las líneas en el orden en que se presentan con la NIIF 18, de arriba hacia abajo.',
    items,
    mezcla,
    pista: 'Operación → Resultado de operación → Inversión → Resultado antes de financiación e impuestos → Financiación → Antes de impuestos → Impuestos → Continuadas → Discontinuadas → Resultado del periodo.',
    fuente: 'NIIF 18, párrafos 47 y 69 a 72',
    tema: 'Estructura NIIF 18',
  };
}

// ───────────── Jefe: reexpresar el comparativo 2026 ─────────────

const conOrden = (rng: Rng, id: string, pregunta: string, correcta: string, otras: string[], explicacion: string, fuente: string): Pregunta => {
  const opciones = barajar(rng, [correcta, ...otras]);
  return { id, pregunta, opciones, correcta: opciones.indexOf(correcta), explicacion, fuente };
};

export function generarTransicionNiif18(rng: Rng): DatosDecision & { resultado: ResultadoNiif18 } {
  const r = generarResultado(rng);
  const s = subtotales(r);
  const antiguo = s.operacion + r.reestructuracion + r.interesesGanados;
  const calculo: EjercicioCalculo = {
    titulo: 'El comparativo 2026 bajo NIIF 18',
    enunciado: `La ferretería presentará sus primeros estados con NIIF 18 al 31-12-2027 y debe reexpresar 2026. Con la NIC 1 mostraba un «resultado operacional» de ${clp(antiguo)} (sin la reestructuración y con los intereses ganados). Arma los subtotales NIIF 18 de 2026. Impuesto: ${Math.round(TASA_PRIMERA_CATEGORIA * 100)}%.`,
    datos: barajar(rng, datosResultado(r)),
    preguntas: [
      exacto('op', 'Resultado de operación 2026 (NIIF 18)', s.operacion, `${clp(r.ventas)} − ${clp(r.costo)} − ${clp(r.gastosOperacion)} − ${clp(r.reestructuracion)}`),
      exacto('dif', 'Diferencia con el «resultado operacional» NIC 1', s.operacion - antiguo, `${clp(s.operacion)} − ${clp(antiguo)}`),
      exacto('afi', 'Resultado antes de financiación e impuestos', s.antesFinanciacion, `${clp(s.operacion)} + ${clp(r.asociadas)} + ${clp(r.interesesGanados)}`),
      exacto('ai', 'Resultado antes de impuestos', s.antesImpuestos, `${clp(s.antesFinanciacion)} − ${clp(r.interesesPrestamo)} − ${clp(r.interesesArriendo)}`),
      exacto('rp', 'Resultado del periodo', s.periodo, `${clp(s.antesImpuestos)} − ${clp(s.impuesto)}`),
    ],
    pista: 'Operación incluye la reestructuración; inversión, las asociadas y los intereses ganados; financiación, los intereses del préstamo y del arriendo. La diferencia con la NIC 1 será negativa: escríbela con signo menos.',
    fuente: 'NIIF 18, párrafos 47 a 72 y C3',
  };
  const diagnostico = conOrden(
    rng,
    'n18-diagnostico',
    '¿Cambia el resultado del periodo por pasar de la NIC 1 a la NIIF 18?',
    'No: la NIIF 18 cambia la presentación (categorías y subtotales), no el reconocimiento ni la medición. El resultado del periodo queda igual.',
    [
      'Sí: siempre baja, porque los gastos inusuales ahora son de operación.',
      'Sí: sube, porque los intereses de los arriendos dejan de ser gasto.',
      'Depende de la tasa de impuesto vigente en 2027.',
    ],
    'Se mueven partidas entre categorías y aparecen subtotales nuevos, pero las partidas se miden igual que antes.',
    'NIIF 18, párrafos 1 y 47',
  );
  const decision = conOrden(
    rng,
    'n18-decision',
    '¿Qué exige la transición en los primeros estados anuales con NIIF 18?',
    'Aplicarla retroactivamente, reexpresar el comparativo 2026 y conciliar cada partida del estado del resultado entre lo presentado con NIC 1 y lo reexpresado con NIIF 18.',
    [
      'Aplicarla solo desde 2027, sin tocar el comparativo.',
      'Presentar 2026 con NIC 1 y 2027 con NIIF 18, sin conciliación.',
      'Reexpresar solo el resultado de operación, sin explicar las diferencias.',
    ],
    'La NIIF 18 se aplica retroactivamente (NIC 8) y en el primer año exige la conciliación partida por partida del periodo comparativo.',
    'NIIF 18, párrafos C1 a C3',
  );
  return {
    calculo,
    diagnostico,
    decision,
    partes: ['Parte 1 · Los números de 2026 con NIIF 18', 'Parte 2 · ¿Cambia la utilidad?', 'Parte 3 · La transición'],
    boton: 'Presentar a la auditora',
    tema: 'Transición a la NIIF 18',
    resultado: r,
  };
}
