import datos from '../content/cuentas.json';
import type { Cuenta, Lado, TipoCuenta } from './types';

export const CUENTAS: Cuenta[] = datos as Cuenta[];
const mapa = new Map(CUENTAS.map((c) => [c.id, c]));

export function cuenta(id: string): Cuenta {
  const c = mapa.get(id);
  if (!c) throw new Error(`Cuenta desconocida: ${id}`);
  return c;
}

export function existeCuenta(id: string): boolean {
  return mapa.has(id);
}

export const ETIQUETA_TIPO: Record<TipoCuenta, string> = {
  activo: 'Activo',
  pasivo: 'Pasivo',
  patrimonio: 'Patrimonio',
  ingreso: 'Ingreso',
  gasto: 'Gasto',
};

export const ETIQUETA_LADO: Record<Lado, string> = { debe: 'Debe', haber: 'Haber' };

/** Lado por el que AUMENTA una cuenta según su tipo (regla del Debe y el Haber). */
export function ladoAumento(tipo: TipoCuenta): Lado {
  return tipo === 'activo' || tipo === 'gasto' ? 'debe' : 'haber';
}

export function opuesto(lado: Lado): Lado {
  return lado === 'debe' ? 'haber' : 'debe';
}

/** Lado por el que aumenta una cuenta concreta (las complementarias funcionan al revés de su tipo). */
export function ladoAumentoCuenta(id: string): Lado {
  const c = cuenta(id);
  return c.contra ? opuesto(ladoAumento(c.tipo)) : ladoAumento(c.tipo);
}

/** Cuentas de los niveles básicos (sin complementarias ni cuentas de ajuste). */
export const CUENTAS_BASICAS: Cuenta[] = CUENTAS.filter((c) => !c.avanzada);

/** Cuentas que los estudiantes suelen confundir entre sí. */
export const PARES_CONFUSOS: Record<string, string> = {
  iva_cf: 'iva_df',
  iva_df: 'iva_cf',
  clientes: 'proveedores',
  proveedores: 'clientes',
  mercaderias: 'costo_ventas',
  costo_ventas: 'mercaderias',
  documentos_por_cobrar: 'documentos_por_pagar',
  documentos_por_pagar: 'documentos_por_cobrar',
  depreciacion: 'dep_acumulada',
  dep_acumulada: 'depreciacion',
  deterioro_clientes: 'estimacion_incobrables',
  estimacion_incobrables: 'deterioro_clientes',
  gasto_provisiones: 'provisiones',
  provisiones: 'gasto_provisiones',
  deterioro_activos: 'deterioro_acumulado',
  deterioro_acumulado: 'deterioro_activos',
};
