import type { Rng } from './azar';
import { barajar, elegir } from './azar';
import { CUENTAS } from './cuentas';
import type { ErrorDetectado, ResultadoValidacion } from './types';

/**
 * Ejercicio genérico de ordenar: poner los elementos en la posición en que se presentan
 * (secciones del Balance General, líneas del Estado de Resultados, cuentas por liquidez).
 */
export interface EjercicioOrdenar {
  titulo: string;
  instruccion: string;
  /** En el orden correcto. `encabezado`: se muestra como título de sección. */
  items: { id: string; texto: string; encabezado?: boolean; por?: string }[];
  /** Ids en el orden en que se muestran para elegir (barajados). */
  mezcla: string[];
  pista: string;
  fuente: string;
  /** Tema para las estadísticas. */
  tema: string;
}

export function validarOrden(ej: EjercicioOrdenar, orden: string[]): ResultadoValidacion {
  const errores: ErrorDetectado[] = [];
  ej.items.forEach((it, i) => {
    if (orden[i] !== it.id) {
      const puesto = ej.items.find((x) => x.id === orden[i]);
      errores.push({
        tipo: 'orden_presentacion',
        detalle: `Posición ${i + 1}: va «${it.texto}»${puesto ? `, no «${puesto.texto}»` : ''}.${it.por ? ` ${it.por}` : ''}`,
        fuente: ej.fuente,
      });
    }
  });
  return { correcto: errores.length === 0, errores };
}

const armar = (rng: Rng, e: Omit<EjercicioOrdenar, 'mezcla'>): EjercicioOrdenar => {
  let mezcla = barajar(rng, e.items.map((i) => i.id));
  // Que no salga ya ordenado.
  while (mezcla.every((id, i) => id === e.items[i].id)) mezcla = barajar(rng, mezcla);
  return { ...e, mezcla };
};

const SECCIONES_BG = [
  { id: 'ac', texto: 'Activo corriente', por: 'El balance parte por lo más líquido: lo que se convierte en dinero dentro de 12 meses.' },
  { id: 'anc', texto: 'Activo no corriente', por: 'Después del activo corriente vienen los activos que duran más de 12 meses.' },
  { id: 'ta', texto: 'Total activos', por: 'Los activos se suman antes de pasar a las fuentes de financiamiento.' },
  { id: 'pc', texto: 'Pasivo corriente', por: 'Los pasivos parten por lo que se paga dentro de 12 meses.' },
  { id: 'pnc', texto: 'Pasivo no corriente', por: 'Después vienen las deudas que se pagan en más de 12 meses.' },
  { id: 'pat', texto: 'Patrimonio', por: 'El patrimonio va al final: es lo que queda para los dueños después de pagar a terceros.' },
  { id: 'tpp', texto: 'Total pasivos y patrimonio', por: 'Cierra el balance y debe ser igual al total de activos.' },
];

/** Ordenar las secciones del Balance General clasificado. */
export function ordenSeccionesBG(rng: Rng): EjercicioOrdenar {
  return armar(rng, {
    titulo: 'Ordena el Balance General',
    instruccion: 'Toca las secciones en el orden en que se presentan, de arriba hacia abajo.',
    items: SECCIONES_BG,
    pista: 'Primero los activos (de más a menos líquidos) y su total; luego quién los financia: primero terceros (pasivos, de más a menos exigibles), al final los dueños (patrimonio).',
    fuente: 'NIC 1, párrafos 54 y 60 a 76',
    tema: 'Orden del Balance General',
  });
}

const LINEAS_EERR = [
  { id: 'ventas', texto: 'Ingresos por ventas', por: 'El estado parte por los ingresos de la actividad principal.' },
  { id: 'costo', texto: 'Costo de ventas', por: 'A las ventas se les resta lo que costó lo vendido.' },
  { id: 'margen', texto: 'Margen bruto', por: 'Ventas − costo de ventas.' },
  { id: 'gav', texto: 'Gastos de administración y ventas', por: 'Los gastos de operar el negocio se restan del margen bruto.' },
  { id: 'rop', texto: 'Resultado operacional', por: 'Margen bruto − gastos de administración y ventas.' },
  { id: 'noop', texto: 'Ingresos y gastos no operacionales (financieros)', por: 'Lo que no es del giro (intereses, otros) va después del resultado operacional.' },
  { id: 'rai', texto: 'Resultado antes de impuesto', por: 'Resultado operacional ± no operacionales.' },
  { id: 'imp', texto: 'Gasto por impuesto a la renta', por: 'El impuesto se calcula sobre el resultado antes de impuesto.' },
  { id: 'rej', texto: 'Resultado del ejercicio', por: 'Es la última línea: la utilidad (o pérdida) del período.' },
];

/** Ordenar las líneas y subtotales del Estado de Resultados por función. */
export function ordenEERR(rng: Rng): EjercicioOrdenar {
  return armar(rng, {
    titulo: 'Ordena el Estado de Resultados',
    instruccion: 'Toca las líneas en el orden en que se presentan, de arriba hacia abajo.',
    items: LINEAS_EERR,
    pista: 'Cada subtotal va justo después de lo que resta: Ventas − Costo = Margen bruto; − Gastos de administración y ventas = Resultado operacional; ± no operacionales = Antes de impuesto; − Impuesto = Resultado del ejercicio.',
    fuente: 'NIC 1, párrafos 81A a 105',
    tema: 'Orden del Estado de Resultados',
  });
}

/** Orden de liquidez dentro del activo corriente (convención chilena: de más a menos líquido). */
const LIQUIDEZ: Record<string, number> = { caja: 1, banco: 2, clientes: 3, documentos_por_cobrar: 3, mercaderias: 4 };

const nombre = (id: string) => CUENTAS.find((c) => c.id === id)!.nombre;
const simples = (f: (c: (typeof CUENTAS)[number]) => boolean) => CUENTAS.filter((c) => f(c) && !c.contra && !c.avanzada).map((c) => c.id);

/**
 * Armar el Balance General con cuentas: encabezados de sección y, debajo, sus cuentas.
 * En el activo corriente van dos cuentas que se ordenan por liquidez.
 */
export function ordenBalanceConCuentas(rng: Rng): EjercicioOrdenar {
  const ac1 = elegir(rng, Object.keys(LIQUIDEZ).filter((id) => LIQUIDEZ[id] <= 2));
  const ac2 = elegir(rng, Object.keys(LIQUIDEZ).filter((id) => LIQUIDEZ[id] >= 3));
  const anc = elegir(rng, simples((c) => c.tipo === 'activo' && c.grupo === 'no_corriente'));
  const pc = elegir(rng, simples((c) => c.tipo === 'pasivo' && c.grupo !== 'no_corriente'));
  const pnc = elegir(rng, simples((c) => c.tipo === 'pasivo' && c.grupo === 'no_corriente'));
  const pat = elegir(rng, simples((c) => c.tipo === 'patrimonio'));
  const cuenta = (id: string, por: string) => ({ id, texto: nombre(id), por });
  return armar(rng, {
    titulo: 'Arma el Balance General con sus cuentas',
    instruccion: 'Toca en orden cada sección y, justo debajo, sus cuentas. Dentro del activo corriente, primero la más líquida.',
    items: [
      { id: 'h_ac', texto: 'Activo corriente', encabezado: true, por: 'El balance parte por el activo corriente.' },
      cuenta(ac1, 'Es la más líquida: ya es dinero.'),
      cuenta(ac2, `Es activo corriente, pero menos líquido que ${nombre(ac1)}.`),
      { id: 'h_anc', texto: 'Activo no corriente', encabezado: true, por: 'Después del activo corriente.' },
      cuenta(anc, 'Se usa por más de 12 meses: activo no corriente.'),
      { id: 'h_pc', texto: 'Pasivo corriente', encabezado: true, por: 'Los pasivos parten por los de corto plazo.' },
      cuenta(pc, 'Se paga dentro de 12 meses: pasivo corriente.'),
      { id: 'h_pnc', texto: 'Pasivo no corriente', encabezado: true, por: 'Después de los pasivos corrientes.' },
      cuenta(pnc, 'Se paga en más de 12 meses: pasivo no corriente.'),
      { id: 'h_pat', texto: 'Patrimonio', encabezado: true, por: 'El patrimonio va al final.' },
      cuenta(pat, 'Pertenece a los dueños: patrimonio.'),
    ],
    pista: 'Orden: Activo corriente → Activo no corriente → Pasivo corriente → Pasivo no corriente → Patrimonio. Cada cuenta va justo debajo de su sección. En el activo corriente, de más a menos líquido: Caja, Banco, Clientes, Mercaderías.',
    fuente: 'NIC 1, párrafos 54 y 60 a 76',
    tema: 'Orden del Balance General',
  });
}
