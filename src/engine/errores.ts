import datos from '../content/errores.json';

export type Severidad = 'leve' | 'grave';

export interface InfoError {
  titulo: string;
  severidad: Severidad;
  regla: string;
  explicacion: string;
  comoCorregir: string;
  fuente: string;
}

const CATALOGO = datos as Record<string, InfoError>;

export function infoError(tipo: string): InfoError {
  return (
    CATALOGO[tipo] ?? {
      titulo: 'Error',
      severidad: 'leve',
      regla: '',
      explicacion: '',
      comoCorregir: '',
      fuente: '',
    }
  );
}

export function tiposDeError(): string[] {
  return Object.keys(CATALOGO);
}
