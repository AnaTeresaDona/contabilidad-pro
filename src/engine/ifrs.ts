import type { Rng } from './azar';
import { barajar, elegir, elegirVarios, entero } from './azar';
import { formatoCLP } from './dinero';
import type { EjercicioCalculo } from './calculos';

const pct = (pb: number) => `${(pb / 100).toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const num = (n: number) => n.toLocaleString('es-CL');

/** Valor presente de una serie de cuotas iguales al final de cada mes. */
export function valorPresente(cuota: number, meses: number, tasaMensual: number): number {
  return (cuota * (1 - (1 + tasaMensual) ** -meses)) / tasaMensual;
}

/** NIIF 16: pasivo inicial (valor presente), interés del primer mes y depreciación mensual del derecho de uso. */
export function calculoArrendamiento(rng: Rng): EjercicioCalculo {
  const cuota = entero(rng, 400_000, 1_500_000, 10_000);
  const meses = elegir(rng, [24, 36, 48, 60]);
  const tasaPb = entero(rng, 50, 100, 10);
  const i = tasaPb / 10_000;
  // Se usa el factor redondeado a 4 decimales, el mismo que ve el jugador.
  const factor = Math.round(valorPresente(1, meses, i) * 10_000) / 10_000;
  const vp = Math.round(cuota * factor);
  const interes = Math.round(vp * i);
  const dep = Math.round(vp / meses);
  return {
    titulo: 'Arrendamiento del nuevo local (NIIF 16)',
    enunciado:
      'Bajo NIIF plenas, el arriendo de largo plazo ya no es solo un gasto mensual: el arrendatario reconoce un activo por derecho de uso y un pasivo por arrendamiento, medidos al valor presente de las cuotas.',
    datos: [
      { etiqueta: 'Cuota mensual (al final de cada mes)', valor: formatoCLP(cuota) },
      { etiqueta: 'Plazo', valor: `${meses} meses` },
      { etiqueta: 'Tasa de interés mensual', valor: pct(tasaPb) },
      { etiqueta: 'Factor de valor presente', valor: factor.toLocaleString('es-CL', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) },
    ],
    preguntas: [
      { id: 'vp', etiqueta: 'Pasivo inicial (valor presente)', valor: vp, formula: `${formatoCLP(cuota)} × factor de valor presente` },
      { id: 'interes', etiqueta: 'Interés del primer mes', valor: interes, formula: `${formatoCLP(vp)} × ${pct(tasaPb)}` },
      { id: 'dep', etiqueta: 'Depreciación mensual del derecho de uso', valor: dep, formula: `${formatoCLP(vp)} ÷ ${meses} meses` },
    ],
    pista:
      'Pasivo inicial = cuota × factor de valor presente (el factor ya viene calculado). Interés del mes = saldo del pasivo × tasa mensual. El derecho de uso se deprecia en línea recta durante el plazo.',
    fuente: 'NIIF 16 Arrendamientos, párrafos 22 a 31',
  };
}

/** NIC 36: importe recuperable = el mayor entre valor razonable menos costos de venta y valor en uso. */
export function calculoDeterioro(rng: Rng): EjercicioCalculo {
  const libro = entero(rng, 5_000_000, 20_000_000, 100_000);
  const vrcv = Math.round((libro * entero(rng, 50, 105)) / 100 / 10_000) * 10_000;
  const vu = Math.round((libro * entero(rng, 50, 105)) / 100 / 10_000) * 10_000;
  const recuperable = Math.max(vrcv, vu);
  const perdida = Math.max(0, libro - recuperable);
  return {
    titulo: 'Deterioro de una máquina (NIC 36)',
    enunciado:
      'Una envasadora de la planta quedó obsoleta frente a modelos nuevos. Hay indicios de deterioro, así que se compara su valor libro con su importe recuperable. Si no hay pérdida, escribe 0.',
    datos: [
      { etiqueta: 'Valor libro', valor: formatoCLP(libro) },
      { etiqueta: 'Valor razonable menos costos de venta', valor: formatoCLP(vrcv) },
      { etiqueta: 'Valor en uso (flujos futuros descontados)', valor: formatoCLP(vu) },
    ],
    preguntas: [
      { id: 'recuperable', etiqueta: 'Importe recuperable', valor: recuperable, formula: `el mayor entre ${formatoCLP(vrcv)} y ${formatoCLP(vu)}` },
      {
        id: 'perdida',
        etiqueta: 'Pérdida por deterioro',
        valor: perdida,
        formula: perdida > 0 ? `${formatoCLP(libro)} − ${formatoCLP(recuperable)}` : `no hay pérdida: el importe recuperable no es menor que el valor libro, así que es 0`,
      },
    ],
    pista: 'Importe recuperable = el MAYOR entre valor razonable menos costos de venta y valor en uso. Hay pérdida solo si el valor libro es mayor que el importe recuperable.',
    fuente: 'NIC 36 Deterioro del valor de los activos, párrafos 18 y 59',
  };
}

/** NIC 33: ganancia básica por acción con emisión de acciones durante el año. */
export function calculoGananciaPorAccion(rng: Rng): EjercicioCalculo {
  const utilidad = entero(rng, 80_000_000, 600_000_000, 1_000_000);
  const iniciales = entero(rng, 2_000_000, 10_000_000, 100_000);
  const nuevas = entero(rng, 200_000, 2_000_000, 100_000);
  const mes = entero(rng, 2, 11);
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const mesesVigentes = 13 - mes;
  const promedio = Math.round(iniciales + (nuevas * mesesVigentes) / 12);
  const gpa = Math.round((utilidad / promedio) * 100) / 100;
  return {
    titulo: 'Ganancia por acción (NIC 33)',
    enunciado:
      'Las sociedades que cotizan en bolsa informan la ganancia por acción. Como la empresa emitió acciones durante el año, se usa el promedio ponderado de acciones en circulación.',
    datos: [
      { etiqueta: 'Utilidad atribuible a los accionistas', valor: formatoCLP(utilidad) },
      { etiqueta: 'Acciones al 1 de enero', valor: num(iniciales) },
      { etiqueta: `Acciones emitidas el 1 de ${MESES[mes - 1]}`, valor: num(nuevas) },
    ],
    preguntas: [
      {
        id: 'promedio',
        etiqueta: 'Promedio ponderado de acciones',
        valor: promedio,
        formula: `${num(iniciales)} + ${num(nuevas)} × ${mesesVigentes}/12`,
        unidad: 'numero',
      },
      {
        id: 'gpa',
        etiqueta: 'Ganancia por acción ($, 2 decimales)',
        valor: gpa,
        formula: `${formatoCLP(utilidad)} ÷ ${num(promedio)}`,
        unidad: 'numero',
        decimales: 2,
      },
    ],
    pista: `Las acciones nuevas cuentan solo por los meses que estuvieron en circulación: desde el 1 de ${MESES[mes - 1]} hasta diciembre son ${mesesVigentes} meses. Ganancia por acción = utilidad ÷ promedio ponderado.`,
    fuente: 'NIC 33 Ganancias por acción, párrafos 10 y 19 a 21',
  };
}

/** Ley 18.046, art. 79: dividendo mínimo obligatorio del 30% en las S.A. abiertas. */
export function calculoDividendoMinimo(rng: Rng): EjercicioCalculo {
  const utilidad = entero(rng, 100_000_000, 900_000_000, 1_000_000);
  const minimo = Math.round(utilidad * 0.3);
  const provisorios = Math.round((minimo * entero(rng, 20, 70)) / 100 / 100_000) * 100_000;
  return {
    titulo: 'Dividendo mínimo obligatorio',
    enunciado:
      'Como sociedad anónima abierta, salvo acuerdo unánime de las acciones emitidas, la empresa debe distribuir al menos el 30% de la utilidad líquida del ejercicio. Durante el año ya pagó dividendos provisorios.',
    datos: [
      { etiqueta: 'Utilidad líquida del ejercicio', valor: formatoCLP(utilidad) },
      { etiqueta: 'Dividendos provisorios ya pagados', valor: formatoCLP(provisorios) },
    ],
    preguntas: [
      { id: 'minimo', etiqueta: 'Dividendo mínimo obligatorio', valor: minimo, formula: `30% × ${formatoCLP(utilidad)}` },
      { id: 'saldo', etiqueta: 'Saldo por repartir para cumplir el mínimo', valor: minimo - provisorios, formula: `${formatoCLP(minimo)} − ${formatoCLP(provisorios)}` },
    ],
    pista: 'Mínimo = 30% de la utilidad líquida. Los dividendos provisorios ya pagados se descuentan de ese mínimo.',
    fuente: 'Ley 18.046 de Sociedades Anónimas, art. 79',
  };
}

// ───────────── Jefe: fiscalización de la CMF ─────────────

export interface Afirmacion {
  id: string;
  texto: string;
  infraccion: boolean;
  explicacion: string;
  fuente: string;
}

/** Elige `nInfracciones` infracciones y `nCorrectas` prácticas correctas, mezcladas. */
export function generarFiscalizacion(rng: Rng, banco: Afirmacion[], nInfracciones = 3, nCorrectas = 3): Afirmacion[] {
  const malas = elegirVarios(rng, banco.filter((a) => a.infraccion), nInfracciones);
  const buenas = elegirVarios(rng, banco.filter((a) => !a.infraccion), nCorrectas);
  return barajar(rng, [...malas, ...buenas]);
}
