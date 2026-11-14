import type { Asiento } from './types';

export const CLAVE_GUARDADO = 'contabilidad-pro';
export const VERSION = 1;
export const HP_MAX = 100;
export const MAX_LIBRO = 300;
export const MAX_HISTORIAL = 400;
export const DIAS_TIEMPO = 120;

export interface EstadoNivel {
  triviaAprobada: boolean;
  completado: boolean;
  jefePerfecto?: boolean;
  sinPistas?: boolean;
  /** El jugador abrió los apuntes del nivel. */
  apuntesVistos?: boolean;
  /** Resultado de cada paso del nivel (conceptos, basico, intermedio, avanzado, jefe). */
  pasos?: Record<string, ResumenPaso>;
}

export interface ResumenPaso {
  completado: boolean;
  /** 1 a 3, la mejor obtenida. */
  estrellas: number;
  /** Mejor porcentaje de aciertos al primer intento (0 a 100). */
  mejorPrecision: number;
  veces: number;
}

/** Lo que se guarda cada vez que se termina un paso: sirve para las estadísticas. */
export interface RegistroPaso {
  /** Fecha y hora ISO. */
  fecha: string;
  nivel: string;
  paso: string;
  ejercicios: number;
  aciertosPrimera: number;
  /** Intentos fallidos en total. */
  fallos: number;
  segundos: number;
  /** Tipos de error y cuántas veces aparecieron. */
  errores: Record<string, number>;
  /** Por tema: cuántos ejercicios hubo y cuántos salieron bien al primer intento. */
  temas: Record<string, { ok: number; total: number }>;
}

export interface Preferencias {
  /** Leer en voz alta cada ejercicio al aparecer. */
  leerAuto: boolean;
  /** Velocidad de la voz (0,7 a 1,4). */
  velocidadVoz: number;
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
  /** Chispas de saber: lo que has aprendido. Nunca se pierden y suben el camino de premios. */
  chispas: number;
  /** Cuántos premios del camino ya se anunciaron. */
  premiosVistos: number;
  historial: RegistroPaso[];
  /** Segundos jugados: total y por día (AAAA-MM-DD). */
  tiempo: { total: number; porDia: Record<string, number> };
  preferencias: Preferencias;
  /**
   * Paso en curso de cada nivel (ejercicios, avance y fallos del ejercicio actual).
   * Si la app se cierra, al volver se retoma exactamente el mismo problema: así no se puede
   * salir para cambiar un ejercicio difícil o borrar un error.
   */
  partidas: Record<string, PartidaGuardada>;
  /** Repaso de conceptos por nivel: sesiones jugadas y porcentajes de buenas. */
  conceptos: Record<string, ResumenConceptos>;
}

/** Resumen del repaso de conceptos de un nivel. */
export interface ResumenConceptos {
  sesiones: number;
  /** Mejor porcentaje de buenas en una sesión completa (no cuenta el refuerzo). */
  mejor: number;
  /** Porcentaje de buenas de la última sesión. */
  ultima: number;
  fecha: string;
}

/** Registra una sesión de repaso de conceptos de un nivel. */
export function registrarConceptos(p: Progreso, nivel: string, porcentajeBuenas: number, fecha: string): Progreso {
  const prev = p.conceptos[nivel];
  return {
    ...p,
    conceptos: {
      ...p.conceptos,
      [nivel]: {
        sesiones: (prev?.sesiones ?? 0) + 1,
        mejor: Math.max(prev?.mejor ?? 0, porcentajeBuenas),
        ultima: porcentajeBuenas,
        fecha,
      },
    },
  };
}

/** Lo que se guarda del ejercicio que se está resolviendo. */
export interface EjercicioEnCurso {
  fallos: number;
  errores: string[];
  pista: boolean;
  /** Si ya se respondió y solo faltaba tocar "Continuar". */
  terminado: { ok: boolean } | null;
}

/** Foto de un paso a medio jugar. Los ejercicios se guardan tal cual para que no cambien. */
export interface PartidaGuardada {
  fase: 'jugando' | 'refuerzo' | 'jefeIntro' | 'jefe';
  paso: string;
  /** Datos propios de la pantalla del nivel (ejercicios, índice, resultados…). */
  datos: Record<string, unknown>;
  actual: EjercicioEnCurso;
  segundos: number;
  guardado: string;
}

export function ejercicioNuevo(): EjercicioEnCurso {
  return { fallos: 0, errores: [], pista: false, terminado: null };
}

export function guardarPartida(p: Progreso, nivel: string, partida: PartidaGuardada | null): Progreso {
  const partidas = { ...p.partidas };
  if (partida) partidas[nivel] = partida;
  else delete partidas[nivel];
  return { ...p, partidas };
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
    chispas: 0,
    premiosVistos: 1,
    historial: [],
    tiempo: { total: 0, porDia: {} },
    preferencias: { leerAuto: false, velocidadVoz: 1 },
    partidas: {},
    conceptos: {},
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
    chispas: Math.max(0, num(d.chispas, 0)),
    premiosVistos: Math.max(1, num(d.premiosVistos, 1)),
    historial: Array.isArray(d.historial) ? d.historial.filter((r) => r && typeof r === 'object').slice(-MAX_HISTORIAL) : [],
    tiempo: {
      total: Math.max(0, num(d.tiempo?.total, 0)),
      porDia: d.tiempo?.porDia && typeof d.tiempo.porDia === 'object' ? d.tiempo.porDia : {},
    },
    preferencias: {
      leerAuto: typeof d.preferencias?.leerAuto === 'boolean' ? d.preferencias.leerAuto : false,
      velocidadVoz: Math.min(1.4, Math.max(0.7, num(d.preferencias?.velocidadVoz, 1))),
    },
    partidas:
      d.partidas && typeof d.partidas === 'object'
        ? Object.fromEntries(
            Object.entries(d.partidas).filter(
              ([, v]) => v && typeof v === 'object' && typeof v.paso === 'string' && v.datos && typeof v.datos === 'object' && v.actual && typeof v.actual === 'object',
            ),
          )
        : {},
    conceptos:
      d.conceptos && typeof d.conceptos === 'object'
        ? Object.fromEntries(
            Object.entries(d.conceptos)
              .filter(([, v]) => v && typeof v === 'object')
              .map(([k, v]) => [
                k,
                {
                  sesiones: Math.max(0, num(v.sesiones, 0)),
                  mejor: Math.min(100, Math.max(0, num(v.mejor, 0))),
                  ultima: Math.min(100, Math.max(0, num(v.ultima, 0))),
                  fecha: typeof v.fecha === 'string' ? v.fecha : '',
                },
              ]),
          )
        : {},
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

/** Primer acierto del día: sube la racha y regala chispas de bienvenida. */
export function registrarActividad(p: Progreso, hoy: string, chispasDelDia = 0): Progreso {
  if (p.ultimoDia === hoy) return p;
  const racha = p.ultimoDia === diaAnterior(hoy) ? p.racha + 1 : 1;
  return { ...p, racha, ultimoDia: hoy, chispas: p.chispas + chispasDelDia };
}

export function sumarChispas(p: Progreso, n: number): Progreso {
  return n > 0 ? { ...p, chispas: p.chispas + Math.round(n) } : p;
}

export function sumarTiempo(p: Progreso, segundos: number, hoy: string): Progreso {
  if (segundos <= 0) return p;
  const porDia = { ...p.tiempo.porDia, [hoy]: (p.tiempo.porDia[hoy] ?? 0) + segundos };
  // Solo se guardan los últimos días para que el respaldo no crezca sin límite.
  const dias = Object.keys(porDia).sort();
  for (const d of dias.slice(0, Math.max(0, dias.length - DIAS_TIEMPO))) delete porDia[d];
  return { ...p, tiempo: { total: p.tiempo.total + segundos, porDia } };
}

export function registrarPaso(p: Progreso, r: RegistroPaso, estrellas: number, completado: boolean): Progreso {
  const est = estadoNivel(p, r.nivel);
  const previo = est.pasos?.[r.paso];
  const precision = r.ejercicios ? Math.round((r.aciertosPrimera / r.ejercicios) * 100) : 0;
  const resumen: ResumenPaso = {
    completado: !!previo?.completado || completado,
    estrellas: Math.max(previo?.estrellas ?? 0, completado ? estrellas : 0),
    mejorPrecision: Math.max(previo?.mejorPrecision ?? 0, precision),
    veces: (previo?.veces ?? 0) + 1,
  };
  const q = actualizarNivel(p, r.nivel, { pasos: { ...est.pasos, [r.paso]: resumen } });
  return { ...q, historial: [...q.historial, r].slice(-MAX_HISTORIAL) };
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

/** Pasos de cada nivel, de menor a mayor dificultad. */
export const PASOS_NIVEL = ['conceptos', 'basico', 'intermedio', 'avanzado', 'jefe'] as const;
export type IdPaso = (typeof PASOS_NIVEL)[number];

/** Considera el progreso guardado antes de que existieran los pasos. */
export function pasoCompletado(p: Progreso, nivel: string, paso: string): boolean {
  const e = estadoNivel(p, nivel);
  if (e.pasos?.[paso]?.completado) return true;
  if (e.completado) return true;
  return paso === 'conceptos' && e.triviaAprobada;
}

export function pasoDesbloqueado(p: Progreso, nivel: string, paso: string): boolean {
  const i = PASOS_NIVEL.indexOf(paso as IdPaso);
  return i <= 0 || pasoCompletado(p, nivel, PASOS_NIVEL[i - 1]);
}
