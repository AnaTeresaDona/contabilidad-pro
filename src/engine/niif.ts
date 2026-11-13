import type { Rng } from './azar';
import { barajar, elegirVarios, entero } from './azar';
import { formatoCLP } from './dinero';
import type { DatosDecision, EjercicioCalculo, PreguntaCalculo } from './calculos';
import type { Pregunta } from './ejercicios';

/**
 * Adopción de NIIF (Nivel 8): costo de un activo fijo (NIC 16), medición posterior
 * (revaluación NIC 16, valor razonable NIC 40), activos para la venta (NIIF 5),
 * corrección de errores (NIC 8) y el balance de apertura de la NIIF 1.
 */

const clp = formatoCLP;
const mil = (rng: Rng, min: number, max: number) => entero(rng, min, max) * 1_000;
const exacto = (id: string, etiqueta: string, valor: number, formula: string): PreguntaCalculo => ({ id, etiqueta, valor: Math.round(valor), formula });
const signo = (n: number) => (n < 0 ? `− ${clp(-n)}` : `+ ${clp(n)}`);

// ───────────── Paso básico: costo de un activo fijo ─────────────

/** Desembolsos de una compra: cuáles forman parte del costo según la NIC 16 y cuáles no. */
export function calculoCostoActivo(rng: Rng): EjercicioCalculo {
  const precio = mil(rng, 8_000, 40_000);
  const descuento = Math.round((precio * entero(rng, 0, 10)) / 100 / 1000) * 1000;
  const iva = Math.round((precio - descuento) * 0.19);
  const arancel = Math.round((precio * 0.06) / 1000) * 1000;
  const flete = mil(rng, 150, 900);
  const instalacion = mil(rng, 200, 1_500);
  const pruebas = mil(rng, 100, 600);
  const capacitacion = mil(rng, 150, 800);
  const mantencion = mil(rng, 100, 500);
  const publicidad = mil(rng, 200, 1_200);
  const costo = precio - descuento + arancel + flete + instalacion + pruebas;
  const vida = entero(rng, 5, 12);
  const residual = Math.round((costo * entero(rng, 0, 10)) / 100 / 1000) * 1000;
  const datos = [
    { etiqueta: 'Precio de compra (lista)', valor: clp(precio) },
    ...(descuento ? [{ etiqueta: 'Descuento comercial obtenido', valor: clp(descuento) }] : []),
    { etiqueta: 'IVA crédito fiscal (recuperable)', valor: clp(iva) },
    { etiqueta: 'Derechos de aduana (arancel)', valor: clp(arancel) },
    { etiqueta: 'Flete hasta la bodega', valor: clp(flete) },
    { etiqueta: 'Instalación y montaje', valor: clp(instalacion) },
    { etiqueta: 'Pruebas de funcionamiento', valor: clp(pruebas) },
    { etiqueta: 'Capacitación del personal', valor: clp(capacitacion) },
    { etiqueta: 'Mantención del primer mes', valor: clp(mantencion) },
    { etiqueta: 'Publicidad del nuevo producto', valor: clp(publicidad) },
    { etiqueta: 'Vida útil', valor: `${vida} años` },
    { etiqueta: 'Valor residual', valor: clp(residual) },
  ];
  return {
    titulo: 'El costo de la máquina importada',
    enunciado: 'La ferretería importó una máquina cortadora. Revisa cada desembolso y calcula el costo inicial según la NIC 16, y luego la depreciación lineal anual.',
    datos: barajar(rng, datos.slice(0, -2)).concat(datos.slice(-2)),
    preguntas: [
      exacto('costo', 'Costo inicial de la máquina', costo, `precio${descuento ? ' − descuento' : ''} + arancel + flete + instalación + pruebas = ${clp(costo)} (sin IVA recuperable, capacitación, mantención ni publicidad)`),
      exacto('dep', 'Depreciación anual (lineal)', (costo - residual) / vida, `(${clp(costo)} − ${clp(residual)}) ÷ ${vida}`),
    ],
    pista: 'Entra al costo todo lo necesario para dejar el activo listo para funcionar: precio neto de descuentos, aranceles e impuestos no recuperables, flete, instalación y pruebas. No entran el IVA recuperable, la capacitación, la mantención ni la publicidad. Depreciación = (costo − valor residual) ÷ vida útil.',
    fuente: 'NIC 16, párrafos 16 a 20',
  };
}

// ───────────── Paso intermedio ─────────────

/** Medición posterior: revaluación de PPE (NIC 16) y valor razonable de una propiedad de inversión (NIC 40). */
export function calculoMedicionPosterior(rng: Rng): EjercicioCalculo {
  const costo = mil(rng, 80_000, 200_000);
  const anios = entero(rng, 2, 8);
  const vida = 40;
  const depAcum = Math.round((costo / vida) * anios);
  const libros = costo - depAcum;
  const vr = Math.round((libros * entero(rng, 108, 140)) / 100 / 1000) * 1000;
  const pi = mil(rng, 60_000, 150_000);
  const piVr = Math.round((pi * entero(rng, 88, 120)) / 100 / 1000) * 1000;
  return {
    titulo: 'Revaluación y valor razonable',
    enunciado: `La ferretería usa su local de ventas (propiedad, planta y equipo con el modelo de revaluación) y además arrienda a terceros una bodega (propiedad de inversión al valor razonable). Al cierre, un tasador entrega los valores razonables.`,
    datos: [
      { etiqueta: 'Local: costo', valor: clp(costo) },
      { etiqueta: 'Local: depreciación acumulada', valor: clp(depAcum) },
      { etiqueta: 'Local: valor razonable (tasación)', valor: clp(vr) },
      { etiqueta: 'Bodega arrendada: valor en libros', valor: clp(pi) },
      { etiqueta: 'Bodega arrendada: valor razonable', valor: clp(piVr) },
    ],
    preguntas: [
      exacto('libros', 'Importe en libros del local', libros, `${clp(costo)} − ${clp(depAcum)}`),
      exacto('superavit', 'Superávit de revaluación (patrimonio, ORI)', vr - libros, `${clp(vr)} − ${clp(libros)}`),
      exacto('pi', 'Ganancia (o pérdida) de la bodega en resultados', piVr - pi, `${clp(piVr)} − ${clp(pi)}`),
    ],
    pista: 'Importe en libros = costo − depreciación acumulada (− deterioro). En la NIC 16, un aumento por revaluación va a otro resultado integral, como superávit de revaluación en patrimonio. En la NIC 40 con valor razonable, el cambio va directo a resultados (y la bodega no se deprecia). Si la bodega bajó, escribe el número con signo menos.',
    fuente: 'NIC 16, párrafos 31 y 39; NIC 40, párrafo 35',
  };
}

/** Activo no corriente mantenido para la venta (NIIF 5): menor valor entre libros y valor razonable menos costos de venta. */
export function calculoMantenidoVenta(rng: Rng): EjercicioCalculo {
  const costo = mil(rng, 20_000, 80_000);
  const depAcum = Math.round((costo * entero(rng, 30, 70)) / 100 / 1000) * 1000;
  const libros = costo - depAcum;
  const vr = Math.round((libros * entero(rng, 70, 130)) / 100 / 1000) * 1000;
  const costosVenta = mil(rng, 300, 2_000);
  const neto = vr - costosVenta;
  const medido = Math.min(libros, neto);
  return {
    titulo: 'El camión que se va a vender',
    enunciado: 'El directorio aprobó vender el camión de reparto: está disponible para la venta inmediata, ya se busca comprador y se espera venderlo dentro de 12 meses. Clasifícalo según la NIIF 5 y mídelo.',
    datos: [
      { etiqueta: 'Costo del camión', valor: clp(costo) },
      { etiqueta: 'Depreciación acumulada', valor: clp(depAcum) },
      { etiqueta: 'Valor razonable', valor: clp(vr) },
      { etiqueta: 'Costos de venta (comisión y trámites)', valor: clp(costosVenta) },
    ],
    preguntas: [
      exacto('libros', 'Importe en libros', libros, `${clp(costo)} − ${clp(depAcum)}`),
      exacto('neto', 'Valor razonable menos costos de venta', neto, `${clp(vr)} − ${clp(costosVenta)}`),
      exacto('medido', 'Valor a presentar como mantenido para la venta', medido, `el menor entre ${clp(libros)} y ${clp(neto)}`),
      exacto('perdida', 'Pérdida por deterioro', libros - medido, `${clp(libros)} − ${clp(medido)}`),
    ],
    pista: 'NIIF 5: se mide al menor valor entre el importe en libros y el valor razonable menos los costos de venta. La diferencia es una pérdida por deterioro. Desde la clasificación, el activo deja de depreciarse y se presenta aparte en el balance.',
    fuente: 'NIIF 5, párrafos 6 a 8, 15 y 25',
  };
}

// ───────────── Paso avanzado ─────────────

/** Corrección retrospectiva de un error de un período anterior (NIC 8). */
export function calculoErrorNIC8(rng: Rng): EjercicioCalculo {
  const omitida = mil(rng, 1_500, 9_000);
  const utilidadAnterior = mil(rng, 20_000, 60_000);
  const acumulados = mil(rng, 40_000, 150_000);
  const neto = mil(rng, 60_000, 200_000);
  return {
    titulo: 'Un error del año pasado (NIC 8)',
    enunciado: `Al preparar los estados de este año, descubres que el año pasado no se registró la depreciación de un vehículo por ${clp(omitida)}. Es un error material de un período anterior. Corrígelo según la NIC 8 (sin considerar impuestos).`,
    datos: [
      { etiqueta: 'Depreciación omitida el año pasado', valor: clp(omitida) },
      { etiqueta: 'Utilidad informada el año pasado', valor: clp(utilidadAnterior) },
      { etiqueta: 'Resultados acumulados al inicio de este año', valor: clp(acumulados) },
      { etiqueta: 'Activo fijo neto informado al cierre del año pasado', valor: clp(neto) },
    ],
    preguntas: [
      exacto('util', 'Utilidad reexpresada del año pasado (comparativo)', utilidadAnterior - omitida, `${clp(utilidadAnterior)} − ${clp(omitida)}`),
      exacto('acum', 'Resultados acumulados iniciales reexpresados', acumulados - omitida, `${clp(acumulados)} − ${clp(omitida)}`),
      exacto('neto', 'Activo fijo neto reexpresado del año pasado', neto - omitida, `${clp(neto)} − ${clp(omitida)}`),
      exacto('gasto', 'Depreciación omitida que va al resultado de este año', 0, 'nada: el error se corrige contra los saldos iniciales, no contra el resultado del año actual'),
    ],
    pista: 'La NIC 8 corrige los errores de períodos anteriores de forma retrospectiva: se reexpresa la información comparativa y se ajustan los saldos iniciales (resultados acumulados). El resultado de este año no se toca.',
    fuente: 'NIC 8, párrafos 41 a 49',
  };
}

/** Ajustes de transición: del patrimonio PCGA al patrimonio NIIF (NIIF 1). */
export interface AjusteTransicion {
  id: string;
  texto: (m: number) => string;
  /** Efecto en activos, pasivos y patrimonio por cada peso de ajuste. */
  activo: number;
  pasivo: number;
  explicacion: string;
}

export const AJUSTES_TRANSICION: AjusteTransicion[] = [
  { id: 'organizacion', texto: (m) => `Gastos de organización activados por ${clp(m)}: no cumplen la definición de activo`, activo: -1, pasivo: 0, explicacion: 'Se eliminan: los gastos de puesta en marcha no son un activo bajo NIIF (NIC 38).' },
  { id: 'incobrables', texto: (m) => `Clientes con pérdidas esperadas por ${clp(m)} sin estimar`, activo: -1, pasivo: 0, explicacion: 'Se valoriza: se reconoce el deterioro de las cuentas por cobrar (NIIF 9).' },
  { id: 'vnr', texto: (m) => `Inventario con valor neto realizable ${clp(m)} bajo su costo`, activo: -1, pasivo: 0, explicacion: 'Se valoriza: el inventario va al menor entre costo y valor neto realizable (NIC 2).' },
  { id: 'terreno', texto: (m) => `Terreno tasado ${clp(m)} sobre su valor en libros, usado como costo atribuido`, activo: 1, pasivo: 0, explicacion: 'Se valoriza: la NIIF 1 permite usar el valor razonable como costo atribuido a la fecha de transición.' },
  { id: 'reparaciones', texto: (m) => `Provisión por reparaciones futuras de ${clp(m)} sin obligación presente`, activo: 0, pasivo: -1, explicacion: 'Se elimina: sin obligación presente no hay pasivo (NIC 37).' },
  { id: 'vacaciones', texto: (m) => `Vacaciones devengadas del personal por ${clp(m)} no registradas`, activo: 0, pasivo: 1, explicacion: 'Se reconoce el pasivo por beneficios a los empleados (NIC 19).' },
  { id: 'arriendo', texto: (m) => `Arriendo del local por 5 años: derecho de uso y pasivo por arrendamiento de ${clp(m)} no registrados`, activo: 1, pasivo: 1, explicacion: 'Se reconocen el activo por derecho de uso y el pasivo por el mismo monto (NIIF 16): no cambia el patrimonio.' },
  { id: 'porcion', texto: (m) => `Cuota del préstamo de largo plazo por ${clp(m)} que vence en los próximos 12 meses`, activo: 0, pasivo: 0, explicacion: 'Se reclasifica a pasivo corriente (NIC 1): no cambia los totales.' },
];

export interface BalanceApertura {
  activos: number;
  pasivos: number;
  ajustes: { id: string; texto: string; monto: number; activo: number; pasivo: number }[];
}

export function generarAjustes(rng: Rng, n: number) {
  return elegirVarios(rng, AJUSTES_TRANSICION, n).map((a) => {
    const monto = mil(rng, 1_000, 12_000);
    return { id: a.id, texto: a.texto(monto), monto, activo: a.activo * monto, pasivo: a.pasivo * monto, explicacion: a.explicacion };
  });
}

export function calculoAjustesTransicion(rng: Rng): EjercicioCalculo {
  const patrimonio = mil(rng, 80_000, 250_000);
  const ajustes = generarAjustes(rng, 4);
  const efecto = ajustes.reduce((s, a) => s + a.activo - a.pasivo, 0);
  return {
    titulo: 'Del patrimonio PCGA al patrimonio NIIF',
    enunciado: 'La ferretería prepara su balance de apertura bajo NIIF. Calcula el efecto de cada ajuste en el patrimonio y el patrimonio NIIF a la fecha de transición. Si el efecto total es negativo, escríbelo con signo menos.',
    datos: [{ etiqueta: 'Patrimonio según PCGA', valor: clp(patrimonio) }, ...ajustes.map((a, i) => ({ etiqueta: `Ajuste ${i + 1}`, valor: a.texto }))],
    preguntas: [
      exacto('efecto', 'Efecto total en resultados acumulados', efecto, ajustes.map((a, i) => `ajuste ${i + 1}: ${signo(a.activo - a.pasivo)}`).join('; ')),
      exacto('pat', 'Patrimonio NIIF a la fecha de transición', patrimonio + efecto, `${clp(patrimonio)} ${signo(efecto)}`),
    ],
    pista: 'Efecto en patrimonio = cambio en activos − cambio en pasivos. Eliminar un activo o reconocer un pasivo lo baja; eliminar un pasivo o revalorizar un activo lo sube. Reclasificar o reconocer un activo y un pasivo por el mismo monto no lo cambia. Todo se lleva a resultados acumulados.',
    fuente: 'NIIF 1, párrafos 10 y 11',
  };
}

// ───────────── Jefe: balance de apertura NIIF ─────────────

const conOrden = (rng: Rng, id: string, pregunta: string, correcta: string, otras: string[], explicacion: string, fuente: string): Pregunta => {
  const opciones = barajar(rng, [correcta, ...otras]);
  return { id, pregunta, opciones, correcta: opciones.indexOf(correcta), explicacion, fuente };
};

export function generarAperturaNIIF(rng: Rng): DatosDecision & { balance: BalanceApertura } {
  const activos = mil(rng, 250_000, 600_000);
  const pasivos = Math.round((activos * entero(rng, 35, 60)) / 100 / 1000) * 1000;
  const ajustes = generarAjustes(rng, 5);
  const dA = ajustes.reduce((s, a) => s + a.activo, 0);
  const dP = ajustes.reduce((s, a) => s + a.pasivo, 0);
  const patrimonio = activos - pasivos;
  const calculo: EjercicioCalculo = {
    titulo: 'El balance de apertura NIIF',
    enunciado: 'La auditora revisó el balance PCGA de la Ferretería El Roble a la fecha de transición y encontró estas diferencias. Arma el balance de apertura bajo NIIF y la conciliación del patrimonio. Si el efecto es negativo, escríbelo con signo menos.',
    datos: [
      { etiqueta: 'Total activos PCGA', valor: clp(activos) },
      { etiqueta: 'Total pasivos PCGA', valor: clp(pasivos) },
      ...ajustes.map((a, i) => ({ etiqueta: `Hallazgo ${i + 1}`, valor: a.texto })),
    ],
    preguntas: [
      exacto('pcga', 'Patrimonio PCGA', patrimonio, `${clp(activos)} − ${clp(pasivos)}`),
      exacto('act', 'Total activos NIIF', activos + dA, `${clp(activos)} ${signo(dA)}`),
      exacto('pas', 'Total pasivos NIIF', pasivos + dP, `${clp(pasivos)} ${signo(dP)}`),
      exacto('efecto', 'Efecto de la adopción en resultados acumulados', dA - dP, `cambio en activos ${signo(dA)} − cambio en pasivos ${signo(dP)}`),
      exacto('niif', 'Patrimonio NIIF', patrimonio + dA - dP, `${clp(activos + dA)} − ${clp(pasivos + dP)}`),
    ],
    pista: 'Para cada hallazgo, decide si cambia los activos, los pasivos o solo los reclasifica. Patrimonio NIIF = activos NIIF − pasivos NIIF, y la diferencia con el patrimonio PCGA es el ajuste a resultados acumulados.',
    fuente: 'NIIF 1, párrafos 10, 11, 23 y 24',
  };
  const diagnostico = conOrden(
    rng,
    'apertura-diagnostico',
    '¿Dónde se registran los ajustes de la adopción por primera vez?',
    'Directamente en patrimonio (resultados acumulados) a la fecha de transición, no en el resultado del año.',
    [
      'En el Estado de Resultados del primer año bajo NIIF, como otros ingresos o gastos.',
      'No se registran: solo se informan en una nota.',
      'En una cuenta de activo transitoria hasta que la auditora los apruebe.',
    ],
    'Los ajustes corresponden a hechos de períodos anteriores medidos con otra norma: llevarlos a resultados distorsionaría el desempeño del año.',
    'NIIF 1, párrafo 11',
  );
  const decision = conOrden(
    rng,
    'apertura-decision',
    '¿Qué debe incluir el primer juego de estados financieros bajo NIIF?',
    'Al menos un año comparativo bajo NIIF y las conciliaciones del patrimonio y del resultado entre PCGA y NIIF, explicando los ajustes.',
    [
      'Solo el balance del año actual, sin comparativos.',
      'Los estados bajo PCGA sin cambios y una declaración de que se adoptarán las NIIF más adelante.',
      'Solo las normas que convengan a la empresa, aplicando versiones anteriores de las NIIF.',
    ],
    'La NIIF 1 exige comparabilidad y transparencia: información comparativa y conciliaciones que expliquen cómo la transición afectó el patrimonio y el resultado.',
    'NIIF 1, párrafos 21, 23 y 24',
  );
  return {
    calculo,
    diagnostico,
    decision,
    partes: ['Parte 1 · El balance de apertura', 'Parte 2 · ¿Dónde van los ajustes?', 'Parte 3 · El primer informe NIIF'],
    boton: 'Entregar a la auditora',
    tema: 'Balance de apertura NIIF',
    balance: { activos, pasivos, ajustes: ajustes.map(({ id, texto, monto, activo, pasivo }) => ({ id, texto, monto, activo, pasivo })) },
  };
}
