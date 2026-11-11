/** Códigos de Documentos Tributarios Electrónicos (DTE) del SII usados en el juego. */
export const DTE: Record<number, string> = {
  33: 'Factura electrónica',
  34: 'Factura exenta electrónica',
  39: 'Boleta electrónica',
  41: 'Boleta exenta electrónica',
  46: 'Factura de compra electrónica',
  52: 'Guía de despacho electrónica',
  56: 'Nota de débito electrónica',
  61: 'Nota de crédito electrónica',
};

export function nombreDte(tipo: number): string {
  return DTE[tipo] ?? `Documento tipo ${tipo}`;
}
