import { nivel1 } from './nivel1';
import { nivel2 } from './nivel2';
import { nivel3 } from './nivel3';
import { nivel4a } from './nivel4a';
import { nivel4b } from './nivel4b';
import { nivel5 } from './nivel5';
import type { ContenidoNivel, NivelInfo } from './tipos';
import type { Pregunta } from '../engine/ejercicios';

/** Mapa del juego. Para agregar un nivel: crea su carpeta de contenido y regístrala en CONTENIDO. */
export const NIVELES: NivelInfo[] = [
  { id: 'n1', numero: '1', titulo: 'Los Cimientos de la Partida Doble', tema: 'Elementos, Debe y Haber, Cuenta T', etapa: 'Emprendimiento', color: 'emerald' },
  { id: 'n2', numero: '2', titulo: 'Ciclo Contable y Documentos Tributarios', tema: 'Asientos, DTE, Libro Diario y Mayor, Balance de 8 columnas', etapa: 'Primer cierre de mes', color: 'sky' },
  { id: 'n3', numero: '3', titulo: 'Estados Financieros', tema: 'Balance General y Estado de Resultados', etapa: 'Primer informe al banco', color: 'teal' },
  { id: 'n4a', numero: '4A', titulo: 'IFRS para PyMEs', tema: 'Ajustes y reexpresión bajo IFRS for SMEs', etapa: 'La PyME crece', color: 'violet' },
  { id: 'n4b', numero: '4B', titulo: 'Full IFRS y la CMF', tema: 'NIC/NIIF plenas, S.A. abiertas, auditoría', etapa: 'Salida a la bolsa', color: 'indigo' },
  { id: 'n5', numero: '5', titulo: 'Tributación y Operación Renta', tema: 'RLI, agregados, deducciones, Art. 21 LIR', etapa: 'Operación Renta', color: 'amber' },
  { id: 'n6', numero: '6', titulo: 'Análisis Financiero (CFO)', tema: 'Vertical, horizontal, ratios, flujo de efectivo NIC 7', etapa: 'Crisis de caja', color: 'rose' },
];

export const ORDEN_NIVELES = NIVELES.map((n) => n.id);

export const CONTENIDO: Record<string, ContenidoNivel> = { n1: nivel1, n2: nivel2, n3: nivel3, n4a: nivel4a, n4b: nivel4b, n5: nivel5 };

export const TODAS_LAS_PREGUNTAS: Map<string, Pregunta> = new Map(
  Object.values(CONTENIDO).flatMap((c) => c.preguntas.map((p) => [p.id, p] as const)),
);

export function infoNivel(id: string): NivelInfo {
  const n = NIVELES.find((x) => x.id === id);
  if (!n) throw new Error(`Nivel desconocido: ${id}`);
  return n;
}
