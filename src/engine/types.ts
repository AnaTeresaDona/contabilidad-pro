export type TipoCuenta = 'activo' | 'pasivo' | 'patrimonio' | 'ingreso' | 'gasto';
export type Lado = 'debe' | 'haber';

/**
 * Grupo para los estados financieros:
 * - activos y pasivos: corriente (se realiza o paga dentro de 12 meses) o no corriente.
 * - ingresos y gastos: costo, operacional (giro del negocio), no operacional (financieros y otros)
 *   o impuesto (impuesto a la renta, va después del resultado antes de impuesto).
 */
export type GrupoCuenta = 'corriente' | 'no_corriente' | 'costo' | 'operacional' | 'no_operacional' | 'impuesto';

export interface Cuenta {
  id: string;
  nombre: string;
  tipo: TipoCuenta;
  grupo?: GrupoCuenta;
  /** Cuenta complementaria: resta a su grupo y aumenta por el lado contrario (ej. Depreciación acumulada). */
  contra?: boolean;
  /** Solo aparece desde el Nivel 4A (ajustes); no se usa en los ejercicios de clasificar de los niveles básicos. */
  avanzada?: boolean;
  descripcion: string;
}

export interface LineaAsiento {
  cuentaId: string;
  lado: Lado;
  monto: number;
}

export interface Asiento {
  id: string;
  glosa: string;
  lineas: LineaAsiento[];
  fecha?: string;
}

/** Un error concreto que cometió el jugador. `tipo` es una clave de content/errores.json. */
export interface ErrorDetectado {
  tipo: string;
  detalle: string;
  fuente?: string;
}

export interface ResultadoValidacion {
  correcto: boolean;
  errores: ErrorDetectado[];
}
