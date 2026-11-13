import type { Rng } from './azar';
import { barajar, elegir, entero } from './azar';
import { formatoCLP } from './dinero';
import type { DatosDecision, EjercicioCalculo, PreguntaCalculo } from './calculos';
import type { Pregunta } from './ejercicios';

/**
 * Matemática financiera (Nivel 7): interés simple y compuesto, reajustes en UF,
 * descuento de documentos, tasas equivalentes y anualidades (cuotas de crédito).
 * Las tasas se guardan como fracción (0,12 = 12%).
 */

const clp = formatoCLP;
const pct = (t: number, dec = 2) => `${(t * 100).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: dec })}%`;
const num = (n: number, dec = 2) => n.toLocaleString('es-CL', { minimumFractionDigits: dec, maximumFractionDigits: dec });

/** Tolerancia para montos que pasan por potencias: 0,05% del valor (mínimo $2), por redondeos intermedios. */
const tolMonto = (v: number) => Math.max(2, Math.round(Math.abs(v) * 0.0005));

const monto = (id: string, etiqueta: string, valor: number, formula: string, exacto = false): PreguntaCalculo => ({
  id,
  etiqueta,
  valor: Math.round(valor),
  formula,
  tolerancia: exacto ? 1 : tolMonto(valor),
});

const porcentaje = (id: string, etiqueta: string, tasa: number, formula: string, decimales = 2): PreguntaCalculo => ({
  id,
  etiqueta,
  valor: Math.round(tasa * 100 * 10 ** decimales) / 10 ** decimales,
  formula,
  unidad: 'porcentaje',
  decimales,
  tolerancia: decimales >= 3 ? 0.005 : decimales === 2 ? 0.02 : 0.1,
});

const numero = (id: string, etiqueta: string, valor: number, formula: string, decimales = 0, tolerancia?: number): PreguntaCalculo => ({
  id,
  etiqueta,
  valor: Math.round(valor * 10 ** decimales) / 10 ** decimales,
  formula,
  unidad: 'numero',
  decimales,
  tolerancia,
});

// ───────────── Fórmulas ─────────────

export const interesSimple = (c: number, i: number, n: number) => c * i * n;
export const montoCompuesto = (c: number, i: number, n: number) => c * (1 + i) ** n;
/** Tasa efectiva anual de una tasa nominal anual j capitalizable m veces al año. */
export const efectivaAnual = (j: number, m: number) => (1 + j / m) ** m - 1;
/** Tasa nominal anual capitalizable m veces al año, equivalente a una efectiva anual. */
export const nominalDesdeEfectiva = (tea: number, m: number) => m * ((1 + tea) ** (1 / m) - 1);
/** Cuota fija (sistema francés) de un préstamo P a tasa i por período durante n períodos. */
export const cuotaFija = (p: number, i: number, n: number) => (p * i) / (1 - (1 + i) ** -n);
/** Valor futuro de n depósitos iguales A al final de cada período. */
export const valorFuturoAnualidad = (a: number, i: number, n: number) => (a * ((1 + i) ** n - 1)) / i;

const DIA = 86_400_000;
/** Días exactos entre dos fechas (cuenta el día final, no el inicial). */
export const diasEntre = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DIA);
const fecha = (d: Date) => d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });

const CAPITALIZACION = [
  { m: 12, nombre: 'mensualmente', periodo: 'mes' },
  { m: 4, nombre: 'trimestralmente', periodo: 'trimestre' },
  { m: 3, nombre: 'cuatrimestralmente', periodo: 'cuatrimestre' },
  { m: 2, nombre: 'semestralmente', periodo: 'semestre' },
] as const;

// ───────────── Paso básico ─────────────

/** Interés simple: interés y monto, o despejar la tasa o el plazo. */
export function calculoInteresSimple(rng: Rng): EjercicioCalculo {
  const c = entero(rng, 10, 120) * 100_000;
  const tasa = entero(rng, 6, 24) / 100;
  const meses = entero(rng, 3, 18);
  const i = interesSimple(c, tasa, meses / 12);
  const m = c + i;
  const despejar = rng() < 0.5;
  if (!despejar)
    return {
      titulo: 'Interés simple: ¿cuánto pagaremos?',
      enunciado: `La Tía Rosa pide un préstamo de ${clp(c)} a una tasa de interés simple de ${pct(tasa)} anual, a ${meses} meses. ¿Cuánto paga de interés y cuánto en total al vencimiento?`,
      datos: [
        { etiqueta: 'Capital (C)', valor: clp(c) },
        { etiqueta: 'Tasa anual (i)', valor: pct(tasa) },
        { etiqueta: 'Plazo (n)', valor: `${meses} meses` },
      ],
      preguntas: [
        monto('i', 'Interés (I)', i, `${clp(c)} × ${pct(tasa)} × ${meses}/12`, true),
        monto('m', 'Monto al vencimiento (M)', m, `${clp(c)} + ${clp(i)} = C × (1 + i × n)`, true),
      ],
      pista: 'I = C × i × n. La tasa y el plazo deben estar en la misma unidad: si la tasa es anual, el plazo va en años (meses ÷ 12). M = C + I.',
      fuente: 'Matemática financiera: interés simple',
    };
  return {
    titulo: 'Interés simple: despejar la tasa y el plazo',
    enunciado: `Un depósito de ${clp(c)} se convirtió en ${clp(m)} después de ${meses} meses, con interés simple. ¿Qué tasa anual pagó? Y con esa misma tasa, ¿cuántos meses habría tardado en ganar ${clp(i * 2)} de interés?`,
    datos: [
      { etiqueta: 'Capital (C)', valor: clp(c) },
      { etiqueta: 'Monto (M)', valor: clp(m) },
      { etiqueta: 'Plazo', valor: `${meses} meses` },
    ],
    preguntas: [
      porcentaje('i', 'Tasa de interés anual', tasa, `I ÷ (C × n) = ${clp(i)} ÷ (${clp(c)} × ${meses}/12)`, 1),
      numero('n', 'Meses para ganar el doble de interés', meses * 2, `n = I ÷ (C × i) = ${clp(i * 2)} ÷ (${clp(c)} × ${pct(tasa)}) × 12`),
    ],
    pista: 'Primero el interés: I = M − C. Luego i = I ÷ (C × n), con n en años. Para el plazo: n = I ÷ (C × i), y lo pasas a meses multiplicando por 12.',
    fuente: 'Matemática financiera: interés simple',
  };
}

/** Reajuste de la UF por el IPC y valor en pesos de una deuda en UF. */
export function calculoReajusteUF(rng: Rng): EjercicioCalculo {
  const uf = entero(rng, 3_850_000, 4_050_000) / 100;
  const ipc = entero(rng, 1, 9) / 1000;
  const nueva = Math.round(uf * (1 + ipc) * 100) / 100;
  const deudaUF = entero(rng, 20, 400, 10);
  return {
    titulo: 'La UF y el IPC: reajustar una deuda',
    enunciado: `El crédito del local es de ${deudaUF} UF. Hoy la UF vale ${'$' + num(uf)} y el IPC del mes anterior fue ${pct(ipc, 1)}. ¿Cuánto valdrá la UF al cabo del período de reajuste y cuánto será la deuda en pesos?`,
    datos: [
      { etiqueta: 'UF inicial', valor: '$' + num(uf) },
      { etiqueta: 'Variación del IPC', valor: pct(ipc, 1) },
      { etiqueta: 'Deuda', valor: `${deudaUF} UF` },
    ],
    preguntas: [
      numero('uf', 'Valor de la UF reajustada', nueva, `${num(uf)} × (1 + ${num(ipc, 3)})`, 2, 0.02),
      monto('deuda', 'Deuda en pesos', deudaUF * nueva, `${deudaUF} UF × ${num(nueva)}`, true),
    ],
    pista: 'UF final = UF inicial × (1 + variación del IPC). Un 0,5% es 0,005. La deuda en pesos = cantidad de UF × valor de la UF.',
    fuente: 'Matemática financiera: reajustabilidad (UF e IPC)',
  };
}

/** Días exactos entre dos fechas e interés ordinario (360) y exacto (365). */
export function calculoDiasExactos(rng: Rng): EjercicioCalculo {
  const inicio = new Date(Date.UTC(2026, entero(rng, 0, 9), entero(rng, 1, 28)));
  const dias = entero(rng, 40, 220);
  const fin = new Date(inicio.getTime() + dias * DIA);
  const c = entero(rng, 20, 150) * 100_000;
  const tasa = entero(rng, 8, 20) / 100;
  return {
    titulo: 'Interés ordinario y exacto con tiempo exacto',
    enunciado: `Se invierten ${clp(c)} al ${pct(tasa)} anual simple desde el ${fecha(inicio)} hasta el ${fecha(fin)}. Cuenta los días exactos y calcula el interés con año comercial (360 días) y con año calendario (365 días).`,
    datos: [
      { etiqueta: 'Capital', valor: clp(c) },
      { etiqueta: 'Tasa anual', valor: pct(tasa) },
      { etiqueta: 'Desde', valor: fecha(inicio) },
      { etiqueta: 'Hasta', valor: fecha(fin) },
    ],
    preguntas: [
      numero('d', 'Días exactos', dias, `días del calendario entre ${fecha(inicio)} y ${fecha(fin)}`),
      monto('io', 'Interés ordinario (360)', interesSimple(c, tasa, dias / 360), `${clp(c)} × ${pct(tasa)} × ${dias}/360`, true),
      monto('ie', 'Interés exacto (365)', interesSimple(c, tasa, dias / 365), `${clp(c)} × ${pct(tasa)} × ${dias}/365`, true),
    ],
    pista: 'Tiempo exacto: cuenta los días reales de cada mes (31, 30, 28…), sin contar el día inicial. Interés ordinario o comercial usa 360; el exacto, 365. El de 360 siempre da un poco más.',
    fuente: 'Matemática financiera: interés ordinario y exacto',
  };
}

// ───────────── Paso intermedio ─────────────

/** Descuento comercial y racional de un pagaré. */
export function calculoDescuento(rng: Rng): EjercicioCalculo {
  const vn = entero(rng, 5, 80) * 100_000;
  const d = entero(rng, 9, 24) / 100;
  const dias = elegir(rng, [30, 45, 60, 90, 120, 150, 180]);
  const dc = interesSimple(vn, d, dias / 360);
  const vlr = vn / (1 + d * (dias / 360));
  return {
    titulo: 'Descontar un pagaré en el banco',
    enunciado: `Un cliente nos pagó con un pagaré de ${clp(vn)} que vence en ${dias} días. Lo llevamos al banco para recibir el dinero hoy, con una tasa de ${pct(d)} anual (año de 360 días).`,
    datos: [
      { etiqueta: 'Valor nominal (VN)', valor: clp(vn) },
      { etiqueta: 'Tasa anual', valor: pct(d) },
      { etiqueta: 'Días al vencimiento', valor: `${dias}` },
    ],
    preguntas: [
      monto('dc', 'Descuento comercial', dc, `${clp(vn)} × ${pct(d)} × ${dias}/360`, true),
      monto('vlc', 'Valor líquido (comercial)', vn - dc, `${clp(vn)} − ${clp(dc)}`, true),
      monto('vlr', 'Valor líquido (racional)', vlr, `${clp(vn)} ÷ (1 + ${pct(d)} × ${dias}/360)`, true),
    ],
    pista: 'Comercial: el descuento se calcula sobre el valor nominal, D = VN × d × n, y recibes VN − D. Racional: el interés se calcula sobre lo que recibes, VL = VN ÷ (1 + i × n). El racional siempre te deja recibir un poco más.',
    fuente: 'Matemática financiera: descuento comercial y racional',
  };
}

/** Interés compuesto con distintas capitalizaciones. */
export function calculoCompuesto(rng: Rng): EjercicioCalculo {
  const c = entero(rng, 10, 100) * 100_000;
  const j = entero(rng, 6, 24) / 100;
  const cap = elegir(rng, CAPITALIZACION);
  const anios = entero(rng, 1, 5);
  const n = cap.m * anios;
  const m = montoCompuesto(c, j / cap.m, n);
  return {
    titulo: 'Interés compuesto: el ahorro que crece solo',
    enunciado: `Depositamos ${clp(c)} durante ${anios} ${anios === 1 ? 'año' : 'años'} a una tasa nominal de ${pct(j)} anual capitalizable ${cap.nombre}. ¿Cuánto tendremos y cuánto interés ganamos?`,
    datos: [
      { etiqueta: 'Capital', valor: clp(c) },
      { etiqueta: 'Tasa nominal anual', valor: pct(j) },
      { etiqueta: 'Capitalización', valor: `${cap.m} veces al año (cada ${cap.periodo})` },
      { etiqueta: 'Plazo', valor: `${anios} ${anios === 1 ? 'año' : 'años'}` },
    ],
    preguntas: [
      monto('m', 'Monto final', m, `${clp(c)} × (1 + ${pct(j)}/${cap.m})^${n}`),
      monto('i', 'Interés ganado', m - c, `monto − ${clp(c)}`),
    ],
    pista: 'M = C × (1 + j/m)^(m × años). La tasa por período es la nominal dividida por las veces que se capitaliza al año, y el exponente es el total de períodos.',
    fuente: 'Matemática financiera: capitalización compuesta',
  };
}

/** ¿En cuánto tiempo se duplica? Regla del 72 y cálculo exacto con logaritmos. */
export function calculoDuplicar(rng: Rng): EjercicioCalculo {
  const i = elegir(rng, [4, 5, 6, 8, 9, 10, 12, 15, 18]) / 100;
  const exacto = Math.log(2) / Math.log(1 + i);
  return {
    titulo: '¿En cuánto tiempo se duplica la plata?',
    enunciado: `Un fondo rinde ${pct(i)} efectivo anual (interés compuesto). ¿Cuántos años tarda en duplicarse? Estímalo con la regla del 72 y luego calcúlalo exacto.`,
    datos: [{ etiqueta: 'Tasa efectiva anual', valor: pct(i) }],
    preguntas: [
      numero('r72', 'Años según la regla del 72', 72 / (i * 100), `72 ÷ ${i * 100}`, 1, 0.1),
      numero('ex', 'Años exactos', exacto, `ln 2 ÷ ln(1 + ${num(i, 2)})`, 2, 0.05),
    ],
    pista: 'Regla del 72: años ≈ 72 ÷ tasa (en número, 8% → 72 ÷ 8). Exacto: de 2 = (1 + i)^n se despeja n = ln 2 ÷ ln(1 + i).',
    fuente: 'Matemática financiera: capitalización compuesta',
  };
}

// ───────────── Paso avanzado ─────────────

/** Tasa nominal ↔ efectiva anual. */
export function calculoTasas(rng: Rng): EjercicioCalculo {
  const [a, b] = barajar(rng, CAPITALIZACION);
  const j = entero(rng, 6, 30) / 100;
  const tea = efectivaAnual(j, a.m);
  const jb = nominalDesdeEfectiva(tea, b.m);
  return {
    titulo: 'Tasa nominal y tasa efectiva',
    enunciado: `El banco ofrece ${pct(j)} nominal anual capitalizable ${a.nombre}. ¿Cuál es la tasa efectiva anual? ¿Y qué tasa nominal capitalizable ${b.nombre} sería equivalente?`,
    datos: [
      { etiqueta: 'Tasa nominal anual', valor: pct(j) },
      { etiqueta: 'Capitalización', valor: `${a.m} veces al año` },
      { etiqueta: 'Nueva capitalización', valor: `${b.m} veces al año` },
    ],
    preguntas: [
      porcentaje('tea', 'Tasa efectiva anual', tea, `(1 + ${pct(j)}/${a.m})^${a.m} − 1`),
      porcentaje('jb', `Tasa nominal equivalente (${b.m} veces al año)`, jb, `${b.m} × ((1 + ${pct(tea, 4)})^(1/${b.m}) − 1)`),
    ],
    pista: 'TEA = (1 + j/m)^m − 1. Para volver a una nominal con otra capitalización: j = m × ((1 + TEA)^(1/m) − 1). Mientras más veces se capitaliza, mayor es la efectiva para la misma nominal.',
    fuente: 'Matemática financiera: tasas equivalentes',
  };
}

/** Cuota de un crédito (sistema francés) y primera fila de la tabla de amortización. */
export function calculoCuota(rng: Rng): EjercicioCalculo {
  const p = entero(rng, 20, 150) * 100_000;
  const i = entero(rng, 8, 22) / 1000;
  const n = elegir(rng, [12, 18, 24, 36, 48]);
  const r = cuotaFija(p, i, n);
  const int1 = p * i;
  const am1 = r - int1;
  return {
    titulo: 'La cuota del crédito y la tabla de amortización',
    enunciado: `Pedimos un crédito de ${clp(p)} a ${n} cuotas mensuales iguales, con una tasa de ${pct(i, 1)} mensual. Calcula la cuota, el total de intereses y la primera fila de la tabla de amortización.`,
    datos: [
      { etiqueta: 'Préstamo (P)', valor: clp(p) },
      { etiqueta: 'Tasa mensual (i)', valor: pct(i, 1) },
      { etiqueta: 'Cuotas (n)', valor: `${n}` },
    ],
    preguntas: [
      monto('r', 'Cuota mensual', r, `${clp(p)} × ${pct(i, 1)} ÷ (1 − (1 + ${pct(i, 1)})^−${n})`),
      monto('ti', 'Total de intereses', r * n - p, `cuota × ${n} − ${clp(p)}`),
      monto('i1', 'Interés de la cuota 1', int1, `${clp(p)} × ${pct(i, 1)}`, true),
      monto('a1', 'Amortización de la cuota 1', am1, 'cuota − interés de la cuota 1'),
      monto('s1', 'Saldo después de la cuota 1', p - am1, `${clp(p)} − amortización 1`),
    ],
    pista: 'Cuota = P × i ÷ (1 − (1 + i)^−n). En cada fila: interés = saldo anterior × i; amortización = cuota − interés; saldo nuevo = saldo anterior − amortización.',
    fuente: 'Matemática financiera: anualidades y amortización',
  };
}

/** Ahorro con depósitos mensuales iguales (valor futuro de una anualidad). */
export function calculoAhorro(rng: Rng): EjercicioCalculo {
  const a = entero(rng, 5, 60) * 10_000;
  const i = entero(rng, 3, 12) / 1000;
  const n = elegir(rng, [12, 18, 24, 36]);
  const vf = valorFuturoAnualidad(a, i, n);
  return {
    titulo: 'Ahorrar para la segunda sucursal',
    enunciado: `Depositamos ${clp(a)} al final de cada mes durante ${n} meses, en una cuenta que paga ${pct(i, 1)} mensual compuesto. ¿Cuánto juntamos y cuánto de eso son intereses?`,
    datos: [
      { etiqueta: 'Depósito mensual (A)', valor: clp(a) },
      { etiqueta: 'Tasa mensual', valor: pct(i, 1) },
      { etiqueta: 'Meses', valor: `${n}` },
    ],
    preguntas: [
      monto('vf', 'Monto ahorrado', vf, `${clp(a)} × ((1 + ${pct(i, 1)})^${n} − 1) ÷ ${pct(i, 1)}`),
      monto('int', 'Intereses ganados', vf - a * n, `monto − ${clp(a)} × ${n}`),
    ],
    pista: 'Valor futuro de una anualidad: VF = A × ((1 + i)^n − 1) ÷ i. Lo depositado es A × n; el resto son intereses.',
    fuente: 'Matemática financiera: anualidades',
  };
}

// ───────────── Jefe ─────────────

const conOrden = (rng: Rng, id: string, pregunta: string, correcta: string, otras: string[], explicacion: string, fuente: string): Pregunta => {
  const opciones = barajar(rng, [correcta, ...otras]);
  return { id, pregunta, opciones, correcta: opciones.indexOf(correcta), explicacion, fuente };
};

export interface OfertaCredito {
  banco: string;
  /** Cómo la anuncia el banco. */
  anuncio: string;
  tasaMensual: number;
  tea: number;
  comision: number;
  cuota: number;
  total: number;
}

/**
 * El horno nuevo: dos bancos ofrecen el crédito. Uno anuncia una tasa nominal capitalizable
 * mensualmente; el otro, una tasa efectiva anual más baja a la vista, pero con comisión.
 */
export function generarCreditoHorno(rng: Rng): DatosDecision & { ofertas: [OfertaCredito, OfertaCredito] } {
  for (;;) {
    const p = entero(rng, 30, 120) * 100_000;
    const n = elegir(rng, [24, 36, 48]);
    const jA = entero(rng, 12, 24) / 100;
    const iA = jA / 12;
    const teaB = Math.round((efectivaAnual(jA, 12) + entero(rng, -15, 10) / 1000) * 1000) / 1000;
    const iB = (1 + teaB) ** (1 / 12) - 1;
    const comision = entero(rng, 0, 30) * 10_000;
    const cuotaA = cuotaFija(p, iA, n);
    const cuotaB = cuotaFija(p, iB, n);
    const totalA = Math.round(cuotaA) * n;
    const totalB = Math.round(cuotaB) * n + comision;
    // Que la diferencia se note y que la trampa aparezca: la tasa "más baja a la vista" no siempre es la más barata.
    if (Math.abs(totalA - totalB) < p * 0.01) continue;
    const ofertas: [OfertaCredito, OfertaCredito] = [
      { banco: 'Banco Andino', anuncio: `${pct(jA)} nominal anual capitalizable mensualmente`, tasaMensual: iA, tea: efectivaAnual(jA, 12), comision: 0, cuota: cuotaA, total: totalA },
      {
        banco: 'Banco del Pacífico',
        anuncio: `${pct(teaB, 1)} efectiva anual${comision ? ` + comisión de apertura de ${clp(comision)}` : ', sin comisión'}`,
        tasaMensual: iB,
        tea: teaB,
        comision,
        cuota: cuotaB,
        total: totalB,
      },
    ];
    const [a, b] = ofertas;
    const gana = totalA < totalB ? a : b;
    const pierde = gana === a ? b : a;
    const calculo: EjercicioCalculo = {
      titulo: 'El crédito para el horno nuevo',
      enunciado: `El horno nuevo cuesta ${clp(p)} y lo pagaremos en ${n} cuotas mensuales iguales. Compara las dos ofertas: pasa ambas tasas a la misma base, calcula las cuotas y el costo total de cada crédito.`,
      datos: [
        { etiqueta: 'Monto del crédito', valor: clp(p) },
        { etiqueta: 'Plazo', valor: `${n} cuotas mensuales` },
        { etiqueta: a.banco, valor: a.anuncio },
        { etiqueta: b.banco, valor: b.anuncio },
      ],
      preguntas: [
        porcentaje('teaA', `Tasa efectiva anual del ${a.banco}`, a.tea, `(1 + ${pct(jA)}/12)^12 − 1`),
        porcentaje('iB', `Tasa mensual del ${b.banco}`, b.tasaMensual, `(1 + ${pct(teaB, 1)})^(1/12) − 1`, 3),
        monto('cA', `Cuota del ${a.banco}`, a.cuota, `${clp(p)} × ${pct(iA, 3)} ÷ (1 − (1 + ${pct(iA, 3)})^−${n})`),
        monto('cB', `Cuota del ${b.banco}`, b.cuota, `${clp(p)} × ${pct(b.tasaMensual, 3)} ÷ (1 − (1 + ${pct(b.tasaMensual, 3)})^−${n})`),
        monto('tA', `Total pagado al ${a.banco}`, a.total, `cuota × ${n}`),
        monto('tB', `Total pagado al ${b.banco}`, b.total, `cuota × ${n}${b.comision ? ` + comisión ${clp(b.comision)}` : ''}`),
      ],
      pista: 'Pasa todo a tasa mensual: nominal ÷ 12, o desde la efectiva (1 + TEA)^(1/12) − 1. Cuota = P × i ÷ (1 − (1 + i)^−n). Costo total = cuota × n + comisiones.',
      fuente: 'Matemática financiera: tasas equivalentes y anualidades',
    };
    const diagnostico = conOrden(
      rng,
      'horno-diagnostico',
      '¿Por qué no basta con comparar los números que anuncia cada banco?',
      'Porque una es nominal y la otra efectiva: hay que llevarlas a la misma base (tasa mensual o efectiva anual) y sumar las comisiones al costo total.',
      [
        'Porque la tasa nominal siempre es más cara que la efectiva.',
        'Porque el plazo del crédito no influye en el costo.',
        'Porque la cuota más baja siempre es el crédito más barato, sin importar la comisión.',
      ],
      `${a.banco} anuncia una tasa nominal: su efectiva anual es ${pct(a.tea)}. ${b.banco} anuncia ${pct(teaB, 1)} efectiva${b.comision ? ` y además cobra ${clp(b.comision)} de comisión` : ''}. Solo comparando en la misma base y con todos los costos se sabe cuál conviene.`,
      'Matemática financiera: tasas equivalentes',
    );
    const decision = conOrden(
      rng,
      'horno-decision',
      '¿Qué crédito le recomiendas a la Tía Rosa?',
      `El del ${gana.banco}: con las tasas en la misma base y las comisiones sumadas, su costo total es menor.`,
      [
        `El del ${pierde.banco}, porque basta comparar las tasas tal como las anuncia cada banco.`,
        'Da lo mismo: los dos bancos cobran lo mismo porque el plazo es igual.',
        'Ninguno: conviene pagar el horno con la caja del mes aunque no alcance para los sueldos.',
      ],
      `Lo que decide es el costo total con la tasa en la misma base: ${a.banco} ${clp(a.total)} y ${b.banco} ${clp(b.total)}. Con el ${gana.banco} se ahorran ${clp(pierde.total - gana.total)}.`,
      'Matemática financiera: anualidades',
    );
    return {
      calculo,
      diagnostico,
      decision,
      partes: ['Parte 1 · Los números de las dos ofertas', 'Parte 2 · La trampa de las tasas', 'Parte 3 · La decisión'],
      boton: 'Presentar la recomendación',
      tema: 'Comparar créditos',
      ofertas,
    };
  }
}
