import type { Asiento, Lado } from './types';
import { entero, type Rng } from './azar';
import { calcularIva, formatoCLP, TASA_IVA } from './dinero';

/**
 * Una plantilla describe una transacción con montos variables.
 * - `{ min, max, paso }`: monto al azar en ese rango.
 * - `{ de, factor, paso }`: porcentaje al azar de otra variable (ej. costo = 50–65% del neto).
 * Si `conIva` es true, a partir de `neto` se calculan solas `iva` y `total`.
 * - `{ formula, paso }`: cálculo a partir de otras variables, con + − × ÷ y paréntesis
 *   (ej. depreciación = "(costo - residual) / (vida * 12)").
 * `monto` de cada línea es una variable o una expresión ("total - contado").
 * En el texto, {x} se muestra como dinero, {x:n} como número y {x:%} como porcentaje.
 */
export type DefVariable =
  | { min: number; max: number; paso: number }
  | { de: string; factor: [number, number]; paso: number }
  | { formula: string; paso?: number };

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

/** Evalúa una expresión aritmética simple (+ − * / y paréntesis) con las variables dadas. */
export function evaluar(expr: string, valores: Record<string, number>): number {
  const tokens = expr.match(/\d+(?:\.\d+)?|[A-Za-z_]\w*|[()+\-*/]/g) ?? [];
  let i = 0;
  const ver = () => tokens[i];
  const tomar = () => tokens[i++];
  const primario = (): number => {
    const t = tomar();
    if (t === undefined) throw new Error(`Expresión incompleta: "${expr}"`);
    if (t === '(') {
      const v = suma();
      if (tomar() !== ')') throw new Error(`Falta ")" en "${expr}"`);
      return v;
    }
    if (t === '-') return -primario();
    if (/^\d/.test(t)) return Number(t);
    const v = valores[t];
    if (v === undefined) throw new Error(`Variable desconocida "${t}" en "${expr}"`);
    return v;
  };
  const producto = (): number => {
    let v = primario();
    while (ver() === '*' || ver() === '/') v = tomar() === '*' ? v * primario() : v / primario();
    return v;
  };
  const suma = (): number => {
    let v = producto();
    while (ver() === '+' || ver() === '-') v = tomar() === '+' ? v + producto() : v - producto();
    return v;
  };
  const r = suma();
  if (i < tokens.length) throw new Error(`Sobra "${tokens[i]}" en "${expr}"`);
  return r;
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
    if ('formula' in def) {
      const paso = def.paso ?? 1;
      valores[nombre] = Math.round(evaluar(def.formula, valores) / paso) * paso;
    } else if ('de' in def) {
      const base = valores[def.de];
      if (base === undefined) throw new Error(`Plantilla ${p.id}: "${nombre}" depende de "${def.de}", que no existe aún`);
      const f = def.factor[0] + rng() * (def.factor[1] - def.factor[0]);
      valores[nombre] = Math.max(def.paso, Math.round((base * f) / def.paso) * def.paso);
    } else {
      valores[nombre] = entero(rng, def.min, def.max, def.paso);
    }
    completarIva();
  }

  const texto = p.texto.replace(/\{(\w+)(?::(n|%))?\}/g, (todo: string, k: string, formato?: string) => {
    const v = valores[k];
    if (v === undefined) return todo;
    if (formato === 'n') return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    if (formato === '%') return `${v}%`;
    return formatoCLP(v);
  });
  const lineas = p.lineas.map((l) => ({ cuentaId: l.cuenta, lado: l.lado, monto: Math.round(evaluar(l.monto, valores)) }));

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
