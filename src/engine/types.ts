export type TipoCuenta = 'activo' | 'pasivo' | 'patrimonio' | 'ingreso' | 'gasto';
export type Lado = 'debe' | 'haber';

/**
 * Grupo para los estados financieros:
 * - activos y pasivos: corriente (se realiza o paga dentro de 12 meses) o no corriente.
 * - ingresos y gastos: costo, operacional (giro del negocio) o no operacional (financieros y otros).
 */
export type GrupoCuenta = 'corriente' | 'no_corriente' | 'costo' | 'operacional' | 'no_operacional';

export interface Cuenta {
  id: string;
  nombre: string;
  tipo: TipoCuenta;
  grupo?: GrupoCuenta;
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
