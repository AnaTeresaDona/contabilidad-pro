import type { Asiento, ErrorDetectado, ResultadoValidacion } from './types';
import { CUENTAS, cuenta, ladoAumentoCuenta } from './cuentas';
import type { Naturaleza } from './cuentaT';
import type { Rng } from './azar';
import { elegir, elegirVarios } from './azar';
import { generarTransaccion, type Plantilla } from './plantillas';
import { formatoCLP } from './dinero';

/**
 * Balance de 8 columnas (Balance tributario):
 * Sumas (Debe | Haber) · Saldos (Deudor | Acreedor) · Inventario (Activo | Pasivo) · Resultados (Pérdidas | Ganancias).
 */
export type Destino = 'inventario' | 'resultados';
export type Columna8 = 'activo' | 'pasivo' | 'perdida' | 'ganancia';
export type TipoResultado = 'utilidad' | 'perdida';

export interface FilaBalance {
  cuentaId: string;
  debe: number;
  haber: number;
  saldo: number;
  naturaleza: Naturaleza;
  destino: Destino;
}

export interface Balance8 {
  filas: FilaBalance[];
  resultado: { tipo: TipoResultado; monto: number };
}

/** Lo que el jugador (o la solución) pone en una fila. Los campos pueden estar vacíos. */
export interface FilaParcial {
  debe: number;
  haber: number;
  saldo: number | null;
  naturaleza: Naturaleza | null;
  destino: Destino | null;
}

export type Celdas8 = [number, number, number, number, number, number, number, number];

export const ETIQUETA_COLUMNA: Record<Columna8, string> = {
  activo: 'Activo',
  pasivo: 'Pasivo',
  perdida: 'Pérdidas',
  ganancia: 'Ganancias',
};

export function destinoDe(cuentaId: string): Destino {
  const t = cuenta(cuentaId).tipo;
  return t === 'ingreso' || t === 'gasto' ? 'resultados' : 'inventario';
}

export function naturalezaNormal(cuentaId: string): Naturaleza {
  return ladoAumentoCuenta(cuentaId) === 'debe' ? 'deudor' : 'acreedor';
}

export function columnaDe(destino: Destino, naturaleza: Naturaleza): Columna8 {
  if (destino === 'inventario') return naturaleza === 'deudor' ? 'activo' : 'pasivo';
  return naturaleza === 'deudor' ? 'perdida' : 'ganancia';
}

/** Columna donde va el saldo normal de una cuenta (el patrimonio va a la columna Pasivo). */
export function columnaNatural(cuentaId: string): Columna8 {
  return columnaDe(destinoDe(cuentaId), naturalezaNormal(cuentaId));
}

const ORDEN_TIPO = { activo: 0, pasivo: 1, patrimonio: 2, ingreso: 3, gasto: 4 } as const;
const POSICION = new Map(CUENTAS.map((c, i) => [c.id, i]));

export function construirBalance(asientos: Asiento[]): Balance8 {
  const m = new Map<string, { debe: number; haber: number }>();
  for (const a of asientos)
    for (const l of a.lineas) {
      const x = m.get(l.cuentaId) ?? { debe: 0, haber: 0 };
      x[l.lado] += l.monto;
      m.set(l.cuentaId, x);
    }
  const filas: FilaBalance[] = [...m.entries()]
    .map(([cuentaId, { debe, haber }]) => ({
      cuentaId,
      debe,
      haber,
      saldo: Math.abs(debe - haber),
      naturaleza: (debe >= haber ? 'deudor' : 'acreedor') as Naturaleza,
      destino: destinoDe(cuentaId),
    }))
    .sort(
      (a, b) =>
        ORDEN_TIPO[cuenta(a.cuentaId).tipo] - ORDEN_TIPO[cuenta(b.cuentaId).tipo] ||
        (POSICION.get(a.cuentaId) ?? 0) - (POSICION.get(b.cuentaId) ?? 0),
    );
  return { filas, resultado: resultadoDe(filas) };
}

export function resultadoDe(filas: FilaParcial[]): { tipo: TipoResultado; monto: number } {
  let ganancias = 0;
  let perdidas = 0;
  for (const f of filas) {
    if (f.destino !== 'resultados' || !f.saldo || !f.naturaleza) continue;
    if (f.naturaleza === 'acreedor') ganancias += f.saldo;
    else perdidas += f.saldo;
  }
  const d = ganancias - perdidas;
  return { tipo: d >= 0 ? 'utilidad' : 'perdida', monto: Math.abs(d) };
}

/** Las 8 celdas de una fila según lo que tenga escrito. */
export function celdas8(f: FilaParcial): Celdas8 {
  const c: Celdas8 = [f.debe, f.haber, 0, 0, 0, 0, 0, 0];
  if (!f.saldo || !f.naturaleza) return c;
  if (f.naturaleza === 'deudor') c[2] = f.saldo;
  else c[3] = f.saldo;
  if (f.destino) {
    const col = columnaDe(f.destino, f.naturaleza);
    c[{ activo: 4, pasivo: 5, perdida: 6, ganancia: 7 }[col]] = f.saldo;
  }
  return c;
}

/**
 * Fila del resultado del ejercicio: una utilidad se anota en Pérdidas y en Pasivo;
 * una pérdida, en Ganancias y en Activo. Así las dos últimas parejas cuadran.
 */
export function celdasResultado(r: { tipo: TipoResultado | null; monto: number | null }): Celdas8 {
  const c: Celdas8 = [0, 0, 0, 0, 0, 0, 0, 0];
  if (!r.tipo || !r.monto) return c;
  if (r.tipo === 'utilidad') {
    c[6] = r.monto;
    c[5] = r.monto;
  } else {
    c[7] = r.monto;
    c[4] = r.monto;
  }
  return c;
}

export function sumarCeldas(filas: Celdas8[]): Celdas8 {
  const t: Celdas8 = [0, 0, 0, 0, 0, 0, 0, 0];
  for (const f of filas) for (let i = 0; i < 8; i++) t[i] += f[i];
  return t;
}

/** Comprueba que cada pareja de columnas cuadre: [sumas, saldos, inventario, resultados]. */
export function cuadraturas(totales: Celdas8): [boolean, boolean, boolean, boolean] {
  return [0, 2, 4, 6].map((i) => totales[i] > 0 && totales[i] === totales[i + 1]) as [boolean, boolean, boolean, boolean];
}

function sano(b: Balance8): boolean {
  return b.resultado.monto > 0 && b.filas.every((f) => f.saldo > 0 && f.naturaleza === naturalezaNormal(f.cuentaId));
}

/**
 * Genera el libro de un mes y su balance. Siempre parte con un aporte de capital, una compra de
 * mercaderías y una venta; después agrega `extra` operaciones al azar. Repite hasta que todas las
 * cuentas tengan saldo y en su lado normal (sin "Banco acreedor" ni "Mercaderías negativas").
 */
export function generarMes(
  rng: Rng,
  plantillas: Plantilla[],
  extra = 3,
  /** Ids de plantillas que deben aparecer sí o sí (por ejemplo, la compra de un activo fijo). */
  obligatorias: string[] = [],
): { asientos: Asiento[]; balance: Balance8 } {
  const porId = new Map(plantillas.map((p) => [p.id, p]));
  const base = ['aporte_capital', 'compra_merc_contado', ...obligatorias].map((id) => porId.get(id)).filter((p): p is Plantilla => !!p);
  const ventas = plantillas.filter((p) => p.lineas.some((l) => l.cuenta === 'ventas' && l.lado === 'haber'));
  const resto = plantillas.filter((p) => p.id !== 'aporte_capital');
  for (let intento = 0; intento < 200; intento++) {
    const elegidas = [...base, elegir(rng, ventas), ...elegirVarios(rng, resto, extra)];
    const asientos = elegidas.map((p) => generarTransaccion(p, rng).asiento);
    const balance = construirBalance(asientos);
    if (sano(balance)) return { asientos, balance };
  }
  throw new Error('No se pudo generar un mes contable coherente');
}

export interface RespuestaFila {
  cuentaId: string;
  saldo: number | null;
  naturaleza: Naturaleza | null;
  destino: Destino | null;
}

export function validarBalance(
  b: Balance8,
  resp: RespuestaFila[],
  resultado: { tipo: TipoResultado | null; monto: number | null },
): ResultadoValidacion {
  const errores: ErrorDetectado[] = [];
  b.filas.forEach((f, i) => {
    const r = resp[i];
    const c = cuenta(f.cuentaId);
    if (r.saldo !== f.saldo)
      errores.push({
        tipo: 'saldo_incorrecto',
        detalle: `${c.nombre}: Debe ${formatoCLP(f.debe)} y Haber ${formatoCLP(f.haber)}, así que el saldo es ${formatoCLP(f.saldo)}${r.saldo !== null ? ` (pusiste ${formatoCLP(r.saldo)})` : ''}.`,
      });
    if (r.naturaleza !== f.naturaleza)
      errores.push({ tipo: 'naturaleza_saldo', detalle: `${c.nombre}: el lado ${f.debe >= f.haber ? 'Debe' : 'Haber'} es mayor, así que el saldo es ${f.naturaleza}.` });
    if (r.destino !== f.destino)
      errores.push({
        tipo: 'destino_balance',
        detalle: `${c.nombre} es una cuenta de ${c.tipo === 'ingreso' || c.tipo === 'gasto' ? 'resultado' : 'balance'}: va a ${f.destino === 'inventario' ? 'Inventario' : 'Resultados'}, columna ${ETIQUETA_COLUMNA[columnaDe(f.destino, f.naturaleza)]}.`,
      });
  });
  const r = b.resultado;
  if (resultado.tipo !== r.tipo || resultado.monto !== r.monto) {
    errores.push({
      tipo: 'resultado_ejercicio',
      detalle: `Ganancias − Pérdidas da ${r.tipo === 'utilidad' ? 'una utilidad' : 'una pérdida'} de ${formatoCLP(r.monto)}${
        resultado.monto !== null && resultado.tipo ? ` (pusiste ${resultado.tipo === 'utilidad' ? 'utilidad' : 'pérdida'} de ${formatoCLP(resultado.monto)})` : ''
      }. ${r.tipo === 'utilidad' ? 'La utilidad se anota en Pérdidas y en Pasivo.' : 'La pérdida se anota en Ganancias y en Activo.'}`,
    });
  }
  return { correcto: errores.length === 0, errores };
}
