import type { Asiento } from './types';

export const CLAVE_GUARDADO = 'contabilidad-pro';
export const VERSION = 1;
export const HP_MAX = 100;
export const MAX_LIBRO = 300;

export interface EstadoNivel {
  triviaAprobada: boolean;
  completado: boolean;
  jefePerfecto?: boolean;
  sinPistas?: boolean;
}

export interface Progreso {
  version: number;
  xp: number;
  hp: number;
  racha: number;
  ultimoDia: string | null;
  mejorCombo: number;
  niveles: Record<string, EstadoNivel>;
  /** Ids de preguntas falladas que vuelven en el mazo de Repaso. */
  repaso: string[];
  repasoResueltas: number;
  logros: string[];
  /** Libro diario de la empresa del jugador: crece con cada asiento correcto. */
  libro: Asiento[];
  empresa: { nombre: string };
}

export function progresoInicial(): Progreso {
  return {
    version: VERSION,
    xp: 0,
    hp: HP_MAX,
    racha: 0,
    ultimoDia: null,
    mejorCombo: 0,
    niveles: {},
    repaso: [],
    repasoResueltas: 0,
    logros: [],
    libro: [],
    empresa: { nombre: 'Empanadas La Tía SpA' },
  };
}

/** Acepta datos guardados de cualquier versión y los lleva a la actual. */
export function migrar(datos: unknown): Progreso {
  const base = progresoInicial();
  if (!datos || typeof datos !== 'object') return base;
  const d = datos as Partial<Progreso>;
  // Cuando exista la versión 2, las transformaciones van aquí: if (d.version === 1) { ... }
  const num = (v: unknown, def: number) => (typeof v === 'number' && Number.isFinite(v) ? v : def);
  return {
    ...base,
    xp: Math.max(0, num(d.xp, 0)),
    hp: Math.min(HP_MAX, Math.max(0, num(d.hp, HP_MAX))),
    racha: num(d.racha, 0),
    ultimoDia: typeof d.ultimoDia === 'string' ? d.ultimoDia : null,
    mejorCombo: num(d.mejorCombo, 0),
    niveles: d.niveles && typeof d.niveles === 'object' ? d.niveles : {},
    repaso: Array.isArray(d.repaso) ? d.repaso.filter((x) => typeof x === 'string') : [],
    repasoResueltas: num(d.repasoResueltas, 0),
    logros: Array.isArray(d.logros) ? d.logros.filter((x) => typeof x === 'string') : [],
    libro: Array.isArray(d.libro) ? d.libro.slice(-MAX_LIBRO) : [],
    empresa: d.empresa && typeof d.empresa.nombre === 'string' ? d.empresa : base.empresa,
    version: VERSION,
  };
}

export function cargarProgreso(): Progreso {
  try {
    const raw = localStorage.getItem(CLAVE_GUARDADO);
    return raw ? migrar(JSON.parse(raw)) : progresoInicial();
  } catch {
    return progresoInicial();
  }
}

export function guardarProgreso(p: Progreso): void {
  try {
    localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(p));
  } catch {
    // Sin almacenamiento disponible (modo privado): el juego sigue funcionando sin guardar.
  }
}

export function fechaISO(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${dia}`;
}

function diaAnterior(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return fechaISO(d);
}

export function registrarActividad(p: Progreso, hoy: string): Progreso {
  if (p.ultimoDia === hoy) return p;
  const racha = p.ultimoDia === diaAnterior(hoy) ? p.racha + 1 : 1;
  return { ...p, racha, ultimoDia: hoy };
}

export function sumarXp(p: Progreso, n: number): Progreso {
  return { ...p, xp: Math.max(0, p.xp + n) };
}

export function cambiarHp(p: Progreso, delta: number): Progreso {
  return { ...p, hp: Math.min(HP_MAX, Math.max(0, p.hp + delta)) };
}

export function registrarAsiento(p: Progreso, a: Asiento): Progreso {
  return { ...p, libro: [...p.libro, a].slice(-MAX_LIBRO) };
}

export function agregarRepaso(p: Progreso, id: string): Progreso {
  return p.repaso.includes(id) ? p : { ...p, repaso: [...p.repaso, id] };
}

export function quitarRepaso(p: Progreso, id: string): Progreso {
  if (!p.repaso.includes(id)) return p;
  return { ...p, repaso: p.repaso.filter((x) => x !== id), repasoResueltas: p.repasoResueltas + 1 };
}

export function estadoNivel(p: Progreso, id: string): EstadoNivel {
  return p.niveles[id] ?? { triviaAprobada: false, completado: false };
}

export function actualizarNivel(p: Progreso, id: string, cambios: Partial<EstadoNivel>): Progreso {
  return { ...p, niveles: { ...p.niveles, [id]: { ...estadoNivel(p, id), ...cambios } } };
}

export function nivelDesbloqueado(p: Progreso, orden: string[], id: string): boolean {
  const i = orden.indexOf(id);
  if (i <= 0) return i === 0;
  return estadoNivel(p, orden[i - 1]).completado;
}
