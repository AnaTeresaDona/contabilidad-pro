import type { Asiento, Lado } from './types';
import { entero, type Rng } from './azar';
import { calcularIva, formatoCLP, TASA_IVA } from './dinero';

/**
 * Una plantilla describe una transacción con montos variables.
 * - `{ min, max, paso }`: monto al azar en ese rango.
 * - `{ de, factor, paso }`: porcentaje al azar de otra variable (ej. costo = 50–65% del neto).
 * Si `conIva` es true, a partir de `neto` se calculan solas `iva` y `total`.
 * `monto` de cada línea es un nombre de variable o una suma/resta simple ("total - contado").
 */
export type DefVariable =
  | { min: number; max: number; paso: number }
  | { de: string; factor: [number, number]; paso: number };

/** Documento tributario electrónico que respalda la operación (se muestra como una factura/boleta). */
export interface DocumentoPlantilla {
  tipo: number;
  emisor: string;
  receptor: string;
  referencia?: string;
}

export interface Plantilla {
  id: string;
  texto: string;
  /** El IVA se calcula a partir de `neto`. */
  conIva?: boolean;
  /** El monto `total` ya incluye IVA (como en una boleta): se separan `neto` e `iva`. */
  ivaIncluido?: boolean;
  variables: Record<string, DefVariable>;
  lineas: { cuenta: string; lado: Lado; monto: string }[];
  pista: string;
  documento?: DocumentoPlantilla;
}

export interface Transaccion {
  plantillaId: string;
  texto: string;
  valores: Record<string, number>;
  asiento: Asiento;
  pista: string;
  conIva: boolean;
  documento?: DocumentoPlantilla & { folio: number };
}

export function evaluar(expr: string, valores: Record<string, number>): number {
  const partes = expr
    .split(/([+-])/)
    .map((t) => t.trim())
    .filter(Boolean);
  let total = 0;
  let signo = 1;
  for (const p of partes) {
    if (p === '+') signo = 1;
    else if (p === '-') signo = -1;
    else {
      const v = /^\d+$/.test(p) ? Number(p) : valores[p];
      if (v === undefined) throw new Error(`Variable desconocida "${p}" en "${expr}"`);
      total += signo * v;
      signo = 1;
    }
  }
  return total;
}

let contador = 0;
export function nuevoId(prefijo = 'as'): string {
  contador += 1;
  return `${prefijo}-${Date.now().toString(36)}-${contador}`;
}

export function generarTransaccion(p: Plantilla, rng: Rng): Transaccion {
  const valores: Record<string, number> = {};
  const completarIva = () => {
    if (p.conIva && valores.neto !== undefined && valores.iva === undefined) {
      valores.iva = calcularIva(valores.neto);
      valores.total = valores.neto + valores.iva;
    }
    if (p.ivaIncluido && valores.total !== undefined && valores.neto === undefined) {
      valores.neto = Math.round(valores.total / (1 + TASA_IVA));
      valores.iva = valores.total - valores.neto;
    }
  };

  for (const [nombre, def] of Object.entries(p.variables)) {
    if ('de' in def) {
      const base = valores[def.de];
      if (base === undefined) throw new Error(`Plantilla ${p.id}: "${nombre}" depende de "${def.de}", que no existe aún`);
      const f = def.factor[0] + rng() * (def.factor[1] - def.factor[0]);
      valores[nombre] = Math.max(def.paso, Math.round((base * f) / def.paso) * def.paso);
    } else {
      valores[nombre] = entero(rng, def.min, def.max, def.paso);
    }
    completarIva();
  }

  const texto = p.texto.replace(/\{(\w+)\}/g, (_, k: string) =>
    valores[k] !== undefined ? formatoCLP(valores[k]) : `{${k}}`,
  );
  const lineas = p.lineas.map((l) => ({ cuentaId: l.cuenta, lado: l.lado, monto: evaluar(l.monto, valores) }));

  return {
    plantillaId: p.id,
    texto,
    valores,
    asiento: { id: nuevoId(), glosa: texto, lineas },
    pista: p.pista,
    conIva: !!(p.conIva || p.ivaIncluido),
    documento: p.documento ? { ...p.documento, folio: entero(rng, 1000, 99999) } : undefined,
  };
}
