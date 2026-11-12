import type { Rng } from './azar';
import { barajar, entero } from './azar';
import { formatoCLP } from './dinero';
import { TASA_PRIMERA_CATEGORIA } from './tributario';
import type { EjercicioCalculo, PreguntaCalculo } from './calculos';
import type { Pregunta } from './ejercicios';

/**
 * Estados financieros resumidos de un año, para analizar.
 * Montos en pesos; el balance siempre cuadra (las utilidades retenidas se ajustan).
 */
export interface AnioFinanciero {
  ventas: number;
  costoVentas: number;
  gastosAdm: number;
  depreciacion: number;
  gastosFinancieros: number;
  resultadoOperacional: number;
  resultadoAntesImpuesto: number;
  impuesto: number;
  utilidad: number;
  caja: number;
  clientes: number;
  inventario: number;
  activoFijo: number;
  proveedores: number;
  deudaCorto: number;
  deudaLargo: number;
  capital: number;
  retenidas: number;
}

export const activoCorriente = (a: AnioFinanciero) => a.caja + a.clientes + a.inventario;
export const pasivoCorriente = (a: AnioFinanciero) => a.proveedores + a.deudaCorto;
export const totalActivos = (a: AnioFinanciero) => activoCorriente(a) + a.activoFijo;
export const totalPasivos = (a: AnioFinanciero) => pasivoCorriente(a) + a.deudaLargo;
export const patrimonio = (a: AnioFinanciero) => a.capital + a.retenidas;

const redondear = (n: number, paso = 1_000) => Math.round(n / paso) * paso;

interface Parametros {
  ventas: number;
  margenCosto: number;
  gastoAdm: number;
  diasCobro: number;
  diasInventario: number;
  diasPago: number;
  caja: number;
  activoFijo: number;
  deudaCorto: number;
  deudaLargo: number;
  capital: number;
}

function construirAnio(p: Parametros): AnioFinanciero {
  const ventas = redondear(p.ventas, 100_000);
  const costoVentas = redondear(ventas * p.margenCosto);
  const gastosAdm = redondear(ventas * p.gastoAdm);
  const depreciacion = redondear(p.activoFijo * 0.1);
  const gastosFinancieros = redondear((p.deudaCorto + p.deudaLargo) * 0.08);
  const resultadoOperacional = ventas - costoVentas - gastosAdm - depreciacion;
  const resultadoAntesImpuesto = resultadoOperacional - gastosFinancieros;
  const impuesto = resultadoAntesImpuesto > 0 ? Math.round(resultadoAntesImpuesto * TASA_PRIMERA_CATEGORIA) : 0;
  const utilidad = resultadoAntesImpuesto - impuesto;
  const clientes = redondear((ventas * p.diasCobro) / 365);
  const inventario = redondear((costoVentas * p.diasInventario) / 365);
  const proveedores = redondear((costoVentas * p.diasPago) / 365);
  const activos = p.caja + clientes + inventario + p.activoFijo;
  const pasivos = proveedores + p.deudaCorto + p.deudaLargo;
  return {
    ventas,
    costoVentas,
    gastosAdm,
    depreciacion,
    gastosFinancieros,
    resultadoOperacional,
    resultadoAntesImpuesto,
    impuesto,
    utilidad,
    caja: p.caja,
    clientes,
    inventario,
    activoFijo: p.activoFijo,
    proveedores,
    deudaCorto: p.deudaCorto,
    deudaLargo: p.deudaLargo,
    capital: p.capital,
    retenidas: activos - pasivos - p.capital,
  };
}

/**
 * Empresa en dos años. Con `crisis`, el año 2 vende y gana más, pero cobra mucho más lento,
 * acumula inventario y se queda sin caja: la utilidad no se convierte en dinero.
 */
export function generarEmpresa(rng: Rng, crisis = false): { anio1: AnioFinanciero; anio2: AnioFinanciero } {
  for (let intento = 0; intento < 200; intento++) {
    const ventas1 = entero(rng, 300, 900, 10) * 1_000_000;
    const base: Parametros = {
      ventas: ventas1,
      margenCosto: entero(rng, 55, 62) / 100,
      gastoAdm: entero(rng, 18, 22) / 100,
      diasCobro: entero(rng, 25, 40),
      diasInventario: entero(rng, 30, 45),
      diasPago: entero(rng, 30, 45),
      caja: redondear(ventas1 * entero(rng, 6, 10) / 100, 100_000),
      activoFijo: redondear(ventas1 * entero(rng, 40, 60) / 100, 1_000_000),
      deudaCorto: redondear(ventas1 * entero(rng, 3, 6) / 100, 1_000_000),
      deudaLargo: redondear(ventas1 * entero(rng, 15, 25) / 100, 1_000_000),
      capital: redondear(ventas1 * entero(rng, 30, 40) / 100, 1_000_000),
    };
    const crece = crisis ? entero(rng, 20, 35) / 100 : entero(rng, 5, 15) / 100;
    const anio2p: Parametros = {
      ...base,
      ventas: base.ventas * (1 + crece),
      diasCobro: crisis ? base.diasCobro + entero(rng, 35, 50) : base.diasCobro + entero(rng, -3, 3),
      diasInventario: crisis ? base.diasInventario + entero(rng, 20, 35) : base.diasInventario + entero(rng, -3, 3),
      diasPago: base.diasPago + entero(rng, -2, 4),
      caja: crisis ? redondear(base.caja * entero(rng, 15, 30) / 100, 100_000) : redondear(base.caja * (1 + crece), 100_000),
      deudaCorto: crisis ? redondear(base.deudaCorto * entero(rng, 250, 400) / 100, 1_000_000) : base.deudaCorto,
    };
    const anio1 = construirAnio(base);
    const anio2 = construirAnio(anio2p);
    const sano = [anio1, anio2].every((a) => a.utilidad > 0 && a.retenidas > 0) && anio2.utilidad > anio1.utilidad;
    if (!sano) continue;
    if (crisis && (flujoOperacional(anio1, anio2) >= 0 || razonCorriente(anio2) >= razonCorriente(anio1))) continue;
    return { anio1, anio2 };
  }
  throw new Error('No se pudo generar una empresa coherente');
}

// ───────────── Razones ─────────────

export const razonCorriente = (a: AnioFinanciero) => activoCorriente(a) / pasivoCorriente(a);
export const pruebaAcida = (a: AnioFinanciero) => (activoCorriente(a) - a.inventario) / pasivoCorriente(a);
export const capitalTrabajo = (a: AnioFinanciero) => activoCorriente(a) - pasivoCorriente(a);
export const deudaPatrimonio = (a: AnioFinanciero) => totalPasivos(a) / patrimonio(a);
export const deudaActivos = (a: AnioFinanciero) => (totalPasivos(a) / totalActivos(a)) * 100;
export const coberturaIntereses = (a: AnioFinanciero) => a.resultadoOperacional / a.gastosFinancieros;
export const margenBruto = (a: AnioFinanciero) => ((a.ventas - a.costoVentas) / a.ventas) * 100;
export const margenOperacional = (a: AnioFinanciero) => (a.resultadoOperacional / a.ventas) * 100;
export const margenNeto = (a: AnioFinanciero) => (a.utilidad / a.ventas) * 100;
export const roa = (a: AnioFinanciero) => (a.utilidad / totalActivos(a)) * 100;
export const roe = (a: AnioFinanciero) => (a.utilidad / patrimonio(a)) * 100;
export const diasCobro = (a: AnioFinanciero) => (a.clientes / a.ventas) * 365;
export const diasInventario = (a: AnioFinanciero) => (a.inventario / a.costoVentas) * 365;
export const diasPago = (a: AnioFinanciero) => (a.proveedores / a.costoVentas) * 365;
export const cicloCaja = (a: AnioFinanciero) => diasCobro(a) + diasInventario(a) - diasPago(a);
export const rotacionActivos = (a: AnioFinanciero) => a.ventas / totalActivos(a);

/** Flujo operacional por método indirecto (simplificado): utilidad + depreciación − aumentos de capital de trabajo. */
export function flujoOperacional(a1: AnioFinanciero, a2: AnioFinanciero): number {
  return a2.utilidad + a2.depreciacion - (a2.clientes - a1.clientes) - (a2.inventario - a1.inventario) + (a2.proveedores - a1.proveedores);
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const r1 = (n: number) => Math.round(n * 10) / 10;
const clp = formatoCLP;

const veces = (id: string, etiqueta: string, valor: number, formula: string): PreguntaCalculo => ({
  id,
  etiqueta: `${etiqueta} (veces, 2 decimales)`,
  valor: r2(valor),
  formula,
  unidad: 'veces',
  decimales: 2,
  tolerancia: 0.011,
});
const porcentaje = (id: string, etiqueta: string, valor: number, formula: string): PreguntaCalculo => ({
  id,
  etiqueta: `${etiqueta} (%, 1 decimal)`,
  valor: r1(valor),
  formula,
  unidad: 'porcentaje',
  decimales: 1,
  tolerancia: 0.11,
});
const dias = (id: string, etiqueta: string, valor: number, formula: string, tolerancia = 1): PreguntaCalculo => ({
  id,
  etiqueta: `${etiqueta} (días)`,
  valor: Math.round(valor),
  formula,
  unidad: 'numero',
  tolerancia,
});

// ───────────── Ejercicios de cálculo ─────────────

export function calculoLiquidez(rng: Rng): EjercicioCalculo {
  const a = generarEmpresa(rng).anio2;
  const ac = activoCorriente(a);
  const pc = pasivoCorriente(a);
  return {
    titulo: 'Liquidez: ¿podemos pagar lo que vence pronto?',
    enunciado: 'Con el balance del año, calcula los indicadores de liquidez de Empanadas La Tía S.A.',
    datos: [
      { etiqueta: 'Caja', valor: clp(a.caja) },
      { etiqueta: 'Clientes', valor: clp(a.clientes) },
      { etiqueta: 'Inventario', valor: clp(a.inventario) },
      { etiqueta: 'Proveedores', valor: clp(a.proveedores) },
      { etiqueta: 'Deuda bancaria de corto plazo', valor: clp(a.deudaCorto) },
    ],
    preguntas: [
      veces('rc', 'Razón corriente', razonCorriente(a), `activo corriente ${clp(ac)} ÷ pasivo corriente ${clp(pc)}`),
      veces('pa', 'Prueba ácida', pruebaAcida(a), `(${clp(ac)} − inventario ${clp(a.inventario)}) ÷ ${clp(pc)}`),
      { id: 'ct', etiqueta: 'Capital de trabajo', valor: capitalTrabajo(a), formula: `${clp(ac)} − ${clp(pc)}` },
    ],
    pista: 'Activo corriente = caja + clientes + inventario. Pasivo corriente = proveedores + deuda de corto plazo. La prueba ácida saca el inventario, que es lo más lento en convertirse en dinero.',
    fuente: 'Análisis financiero: razones de liquidez',
  };
}

export function calculoEndeudamiento(rng: Rng): EjercicioCalculo {
  const a = generarEmpresa(rng).anio2;
  return {
    titulo: 'Endeudamiento y solvencia',
    enunciado: '¿Cuánto de la empresa se financia con deuda y cuántas veces el negocio cubre sus intereses?',
    datos: [
      { etiqueta: 'Total pasivos', valor: clp(totalPasivos(a)) },
      { etiqueta: 'Patrimonio', valor: clp(patrimonio(a)) },
      { etiqueta: 'Total activos', valor: clp(totalActivos(a)) },
      { etiqueta: 'Resultado operacional', valor: clp(a.resultadoOperacional) },
      { etiqueta: 'Gastos financieros (intereses)', valor: clp(a.gastosFinancieros) },
    ],
    preguntas: [
      veces('dp', 'Deuda / Patrimonio', deudaPatrimonio(a), `${clp(totalPasivos(a))} ÷ ${clp(patrimonio(a))}`),
      porcentaje('da', 'Deuda / Activos', deudaActivos(a), `${clp(totalPasivos(a))} ÷ ${clp(totalActivos(a))} × 100`),
      veces('ci', 'Cobertura de intereses', coberturaIntereses(a), `${clp(a.resultadoOperacional)} ÷ ${clp(a.gastosFinancieros)}`),
    ],
    pista: 'Deuda/Patrimonio = pasivos ÷ patrimonio. Deuda/Activos = pasivos ÷ activos × 100. Cobertura = resultado operacional ÷ intereses.',
    fuente: 'Análisis financiero: razones de endeudamiento',
  };
}

export function calculoRentabilidad(rng: Rng): EjercicioCalculo {
  const a = generarEmpresa(rng).anio2;
  return {
    titulo: 'Rentabilidad',
    enunciado: '¿Cuánto gana la empresa por cada $100 que vende, que tiene invertidos y que aportaron los dueños?',
    datos: [
      { etiqueta: 'Ventas', valor: clp(a.ventas) },
      { etiqueta: 'Costo de ventas', valor: clp(a.costoVentas) },
      { etiqueta: 'Utilidad del ejercicio', valor: clp(a.utilidad) },
      { etiqueta: 'Total activos', valor: clp(totalActivos(a)) },
      { etiqueta: 'Patrimonio', valor: clp(patrimonio(a)) },
    ],
    preguntas: [
      porcentaje('mb', 'Margen bruto', margenBruto(a), `(${clp(a.ventas)} − ${clp(a.costoVentas)}) ÷ ${clp(a.ventas)} × 100`),
      porcentaje('mn', 'Margen neto', margenNeto(a), `${clp(a.utilidad)} ÷ ${clp(a.ventas)} × 100`),
      porcentaje('roa', 'ROA', roa(a), `${clp(a.utilidad)} ÷ ${clp(totalActivos(a))} × 100`),
      porcentaje('roe', 'ROE', roe(a), `${clp(a.utilidad)} ÷ ${clp(patrimonio(a))} × 100`),
    ],
    pista: 'Margen bruto = (ventas − costo) ÷ ventas. Margen neto = utilidad ÷ ventas. ROA = utilidad ÷ activos. ROE = utilidad ÷ patrimonio. Todo × 100.',
    fuente: 'Análisis financiero: razones de rentabilidad',
  };
}

export function calculoActividad(rng: Rng): EjercicioCalculo {
  const a = generarEmpresa(rng).anio2;
  return {
    titulo: 'Actividad: ¿qué tan rápido gira el dinero?',
    enunciado: 'Calcula los días que tarda cada etapa del ciclo del dinero. Usa 365 días y redondea al día.',
    datos: [
      { etiqueta: 'Ventas', valor: clp(a.ventas) },
      { etiqueta: 'Costo de ventas', valor: clp(a.costoVentas) },
      { etiqueta: 'Clientes', valor: clp(a.clientes) },
      { etiqueta: 'Inventario', valor: clp(a.inventario) },
      { etiqueta: 'Proveedores', valor: clp(a.proveedores) },
    ],
    preguntas: [
      dias('dc', 'Días de cobro', diasCobro(a), `${clp(a.clientes)} ÷ ${clp(a.ventas)} × 365`),
      dias('di', 'Días de inventario', diasInventario(a), `${clp(a.inventario)} ÷ ${clp(a.costoVentas)} × 365`),
      dias('dpg', 'Días de pago', diasPago(a), `${clp(a.proveedores)} ÷ ${clp(a.costoVentas)} × 365`),
      dias('cc', 'Ciclo de conversión de caja', cicloCaja(a), 'días de cobro + días de inventario − días de pago', 2),
    ],
    pista:
      'Días de cobro = clientes ÷ ventas × 365. Días de inventario = inventario ÷ costo de ventas × 365. Días de pago = proveedores ÷ costo de ventas × 365. Ciclo de caja = cobro + inventario − pago.',
    fuente: 'Análisis financiero: razones de actividad',
  };
}

export function calculoVerticalHorizontal(rng: Rng): EjercicioCalculo {
  const { anio1, anio2 } = generarEmpresa(rng);
  const var1 = ((anio2.ventas - anio1.ventas) / anio1.ventas) * 100;
  const var2 = ((anio2.utilidad - anio1.utilidad) / anio1.utilidad) * 100;
  const vert = (anio2.costoVentas / anio2.ventas) * 100;
  return {
    titulo: 'Análisis vertical y horizontal',
    enunciado:
      'El análisis vertical compara cada partida con un total del mismo año (por ejemplo, % de las ventas). El horizontal compara la misma partida entre dos años (variación %).',
    datos: [
      { etiqueta: 'Ventas año 1', valor: clp(anio1.ventas) },
      { etiqueta: 'Ventas año 2', valor: clp(anio2.ventas) },
      { etiqueta: 'Costo de ventas año 2', valor: clp(anio2.costoVentas) },
      { etiqueta: 'Utilidad año 1', valor: clp(anio1.utilidad) },
      { etiqueta: 'Utilidad año 2', valor: clp(anio2.utilidad) },
    ],
    preguntas: [
      porcentaje('vert', 'Vertical: costo de ventas como % de las ventas (año 2)', vert, `${clp(anio2.costoVentas)} ÷ ${clp(anio2.ventas)} × 100`),
      porcentaje('hv', 'Horizontal: variación de las ventas', var1, `(${clp(anio2.ventas)} − ${clp(anio1.ventas)}) ÷ ${clp(anio1.ventas)} × 100`),
      porcentaje('hu', 'Horizontal: variación de la utilidad', var2, `(${clp(anio2.utilidad)} − ${clp(anio1.utilidad)}) ÷ ${clp(anio1.utilidad)} × 100`),
    ],
    pista: 'Vertical = partida ÷ total del mismo año × 100. Horizontal = (año 2 − año 1) ÷ año 1 × 100.',
    fuente: 'Análisis financiero: análisis vertical y horizontal',
  };
}

export function calculoFlujoOperacional(rng: Rng): EjercicioCalculo {
  const { anio1, anio2 } = generarEmpresa(rng, rng() < 0.5);
  const dC = anio2.clientes - anio1.clientes;
  const dI = anio2.inventario - anio1.inventario;
  const dP = anio2.proveedores - anio1.proveedores;
  const flujo = flujoOperacional(anio1, anio2);
  return {
    titulo: 'Flujo de efectivo operacional (método indirecto)',
    enunciado:
      'La utilidad no es lo mismo que la caja. Parte de la utilidad, suma lo que no es salida de dinero (depreciación) y ajusta por los cambios del capital de trabajo.',
    datos: [
      { etiqueta: 'Utilidad del año 2', valor: clp(anio2.utilidad) },
      { etiqueta: 'Depreciación del año 2', valor: clp(anio2.depreciacion) },
      { etiqueta: 'Clientes: año 1 → año 2', valor: `${clp(anio1.clientes)} → ${clp(anio2.clientes)}` },
      { etiqueta: 'Inventario: año 1 → año 2', valor: `${clp(anio1.inventario)} → ${clp(anio2.inventario)}` },
      { etiqueta: 'Proveedores: año 1 → año 2', valor: `${clp(anio1.proveedores)} → ${clp(anio2.proveedores)}` },
    ],
    preguntas: [
      {
        id: 'flujo',
        etiqueta: 'Flujo operacional (negativo si sale más de lo que entra)',
        valor: flujo,
        formula: `${clp(anio2.utilidad)} + ${clp(anio2.depreciacion)} − ${clp(dC)} (más clientes) − ${clp(dI)} (más inventario) + ${clp(dP)} (más proveedores)`,
      },
    ],
    pista: 'Si clientes o inventario aumentan, la caja baja (se resta el aumento). Si proveedores aumenta, la caja sube (se suma el aumento). La depreciación se suma porque no salió dinero.',
    fuente: 'NIC 7 Estado de flujos de efectivo, párrafos 18 a 20',
  };
}

// ───────────── Jefe: la crisis de caja ─────────────

export interface DatosCrisis {
  anio1: AnioFinanciero;
  anio2: AnioFinanciero;
  calculo: EjercicioCalculo;
  diagnostico: Pregunta;
  decision: Pregunta;
}

const conOrden = (rng: Rng, id: string, pregunta: string, correcta: string, otras: string[], explicacion: string, fuente: string): Pregunta => {
  const opciones = barajar(rng, [correcta, ...otras]);
  return { id, pregunta, opciones, correcta: opciones.indexOf(correcta), explicacion, fuente };
};

export function generarCrisis(rng: Rng): DatosCrisis {
  const { anio1, anio2 } = generarEmpresa(rng, true);
  const calculo: EjercicioCalculo = {
    titulo: 'La crisis de caja',
    enunciado: 'Compara los dos años y calcula los indicadores clave.',
    datos: [
      { etiqueta: 'Ventas', valor: `${clp(anio1.ventas)} → ${clp(anio2.ventas)}` },
      { etiqueta: 'Utilidad', valor: `${clp(anio1.utilidad)} → ${clp(anio2.utilidad)}` },
      { etiqueta: 'Depreciación (año 2)', valor: clp(anio2.depreciacion) },
      { etiqueta: 'Caja', valor: `${clp(anio1.caja)} → ${clp(anio2.caja)}` },
      { etiqueta: 'Clientes', valor: `${clp(anio1.clientes)} → ${clp(anio2.clientes)}` },
      { etiqueta: 'Inventario', valor: `${clp(anio1.inventario)} → ${clp(anio2.inventario)}` },
      { etiqueta: 'Proveedores', valor: `${clp(anio1.proveedores)} → ${clp(anio2.proveedores)}` },
      { etiqueta: 'Deuda bancaria de corto plazo', valor: `${clp(anio1.deudaCorto)} → ${clp(anio2.deudaCorto)}` },
    ],
    preguntas: [
      veces('rc1', 'Razón corriente año 1', razonCorriente(anio1), `${clp(activoCorriente(anio1))} ÷ ${clp(pasivoCorriente(anio1))}`),
      veces('rc2', 'Razón corriente año 2', razonCorriente(anio2), `${clp(activoCorriente(anio2))} ÷ ${clp(pasivoCorriente(anio2))}`),
      dias('dc1', 'Días de cobro año 1', diasCobro(anio1), `${clp(anio1.clientes)} ÷ ${clp(anio1.ventas)} × 365`),
      dias('dc2', 'Días de cobro año 2', diasCobro(anio2), `${clp(anio2.clientes)} ÷ ${clp(anio2.ventas)} × 365`),
      {
        id: 'flujo',
        etiqueta: 'Flujo operacional del año 2',
        valor: flujoOperacional(anio1, anio2),
        formula: 'utilidad + depreciación − aumento de clientes − aumento de inventario + aumento de proveedores',
      },
    ],
    pista: 'Activo corriente = caja + clientes + inventario. Pasivo corriente = proveedores + deuda de corto plazo. Días de cobro = clientes ÷ ventas × 365.',
    fuente: 'Análisis financiero; NIC 7',
  };
  const diagnostico = conOrden(
    rng,
    'crisis-diagnostico',
    '¿Cuál es el diagnóstico de la crisis?',
    'La empresa es rentable, pero cobra mucho más lento y acumula inventario: la utilidad queda atrapada en capital de trabajo y no llega a la caja.',
    [
      'La empresa vende con pérdida: el margen bruto es negativo.',
      'El problema es que el patrimonio es demasiado grande.',
      'La caja bajó por pagar demasiado IVA.',
    ],
    'La utilidad creció, pero los clientes y el inventario crecieron mucho más: el flujo operacional es negativo y la razón corriente cayó porque la empresa se endeudó a corto plazo para financiarse.',
    'Análisis financiero; NIC 7',
  );
  const decision = conOrden(
    rng,
    'crisis-decision',
    '¿Qué le recomiendas al directorio?',
    'Acortar los plazos de cobro, reducir el inventario y renegociar la deuda de corto plazo a largo plazo.',
    [
      'Repartir un dividendo extraordinario para tranquilizar a los accionistas.',
      'Bajar los precios para vender aún más al crédito.',
      'Comprar otra planta financiada con deuda de corto plazo.',
    ],
    'Hay que liberar la caja atrapada en clientes e inventario y calzar los plazos: el capital de trabajo permanente debe financiarse con recursos de largo plazo.',
    'Análisis financiero: gestión del capital de trabajo',
  );
  return { anio1, anio2, calculo, diagnostico, decision };
}

