import type { ErrorDetectado, Lado, ResultadoValidacion } from './types';
import { cuenta, ladoAumento, opuesto } from './cuentas';
import { elegir, entero, type Rng } from './azar';
import { formatoCLP } from './dinero';

export interface MovimientoT {
  lado: Lado;
  monto: number;
  glosa: string;
}

export type Naturaleza = 'deudor' | 'acreedor';

export interface EjercicioCuentaT {
  cuentaId: string;
  movimientos: MovimientoT[];
  saldo: number;
  naturaleza: Naturaleza;
}

const GLOSAS: Record<string, { aumento: string[]; disminucion: string[] }> = {
  banco: {
    aumento: ['Depósito de ventas del día', 'Cobro a cliente por transferencia', 'Préstamo recibido'],
    disminucion: ['Pago a proveedor', 'Pago de arriendo', 'Pago de cuenta de luz', 'Pago de publicidad'],
  },
  clientes: {
    aumento: ['Venta al crédito a casino escolar', 'Venta al crédito para un matrimonio', 'Venta al crédito a minimarket'],
    disminucion: ['Cobro a cliente', 'Abono de cliente'],
  },
  proveedores: {
    aumento: ['Compra de harina al crédito', 'Compra de carne al crédito', 'Compra de cebolla al crédito'],
    disminucion: ['Pago a proveedor', 'Abono a Distribuidora Harinas del Sur'],
  },
  mercaderias: {
    aumento: ['Compra de harina', 'Compra de carne y cebolla'],
    disminucion: ['Costo de empanadas vendidas'],
  },
  prestamo_bancario: {
    aumento: ['Nuevo préstamo recibido'],
    disminucion: ['Pago de cuota (amortización)'],
  },
};

export const CUENTAS_T_DISPONIBLES = Object.keys(GLOSAS);

export function sumasT(movs: MovimientoT[]) {
  const debe = movs.filter((m) => m.lado === 'debe').reduce((a, m) => a + m.monto, 0);
  const haber = movs.filter((m) => m.lado === 'haber').reduce((a, m) => a + m.monto, 0);
  return { debe, haber };
}

export function generarCuentaT(rng: Rng): EjercicioCuentaT {
  const cuentaId = elegir(rng, CUENTAS_T_DISPONIBLES);
  const c = cuenta(cuentaId);
  const aum = ladoAumento(c.tipo);
  const dis = opuesto(aum);
  const g = GLOSAS[cuentaId];

  const inicial = entero(rng, 500_000, 3_000_000, 50_000);
  const movimientos: MovimientoT[] = [{ lado: aum, monto: inicial, glosa: 'Saldo inicial' }];
  let saldo = inicial;
  const n = entero(rng, 3, 5);
  for (let i = 0; i < n; i++) {
    const maxDisminucion = Math.min(saldo - 50_000, 1_500_000);
    if (rng() < 0.45 || maxDisminucion < 100_000) {
      const m = entero(rng, 100_000, 1_500_000, 10_000);
      saldo += m;
      movimientos.push({ lado: aum, monto: m, glosa: elegir(rng, g.aumento) });
    } else {
      const m = entero(rng, 100_000, maxDisminucion, 10_000);
      saldo -= m;
      movimientos.push({ lado: dis, monto: m, glosa: elegir(rng, g.disminucion) });
    }
  }
  // Siempre debe haber movimientos en ambos lados; si no, el ejercicio es solo sumar.
  if (!movimientos.some((m) => m.lado === dis)) {
    const m = entero(rng, 100_000, Math.min(saldo - 50_000, 1_500_000), 10_000);
    saldo -= m;
    movimientos.push({ lado: dis, monto: m, glosa: elegir(rng, g.disminucion) });
  }
  return { cuentaId, movimientos, saldo, naturaleza: aum === 'debe' ? 'deudor' : 'acreedor' };
}

export function validarCuentaT(ej: EjercicioCuentaT, saldo: number | null, naturaleza: Naturaleza | null): ResultadoValidacion {
  const errores: ErrorDetectado[] = [];
  const { debe, haber } = sumasT(ej.movimientos);
  if (saldo !== ej.saldo) {
    errores.push({
      tipo: 'saldo_incorrecto',
      detalle: `El Debe suma ${formatoCLP(debe)} y el Haber suma ${formatoCLP(haber)}. Saldo = ${formatoCLP(Math.max(debe, haber))} − ${formatoCLP(Math.min(debe, haber))} = ${formatoCLP(ej.saldo)}. Tú escribiste ${saldo === null ? 'nada' : formatoCLP(saldo)}.`,
    });
  }
  if (naturaleza !== ej.naturaleza) {
    errores.push({
      tipo: 'naturaleza_saldo',
      detalle: `El lado ${debe > haber ? 'Debe' : 'Haber'} es mayor, así que el saldo es ${ej.naturaleza}. ${cuenta(ej.cuentaId).nombre} normalmente tiene saldo ${ej.naturaleza}.`,
    });
  }
  return { correcto: errores.length === 0, errores };
}
