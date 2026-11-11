import trib from '../config/tributario.json';

export const TASA_IVA: number = trib.tasaIva;

export function calcularIva(neto: number): number {
  return Math.round(neto * TASA_IVA);
}

/** Formato chileno: $1.234.567 (sin decimales). */
export function formatoCLP(n: number): string {
  const s = Math.abs(Math.round(n))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (n < 0 ? '-$' : '$') + s;
}

/** Lee lo que escribe el usuario ("$1.234.567", "1234567") y devuelve el número, o null si está vacío. */
export function leerMonto(texto: string): number | null {
  const limpio = texto.replace(/[^\d]/g, '');
  if (!limpio) return null;
  return parseInt(limpio, 10);
}
