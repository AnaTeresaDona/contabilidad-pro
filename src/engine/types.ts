export type TipoCuenta = 'activo' | 'pasivo' | 'patrimonio' | 'ingreso' | 'gasto';
export type Lado = 'debe' | 'haber';

export interface Cuenta {
  id: string;
  nombre: string;
  tipo: TipoCuenta;
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
