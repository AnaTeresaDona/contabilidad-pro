import type { Ejercicio, Pregunta } from './ejercicios';
import type { RegistroPaso } from './progreso';

/** Fuente corta de una pregunta: "DL 825, art. 23" → "DL 825"; "NIC 1, párrafo 66" → "NIC 1". */
export function fuenteCorta(fuente: string): string {
  const base = fuente.split(/[;,(]/)[0].trim();
  return base.replace(/\s+(art|arts|párrafo|párrafos|sección|capítulo)\.?\s.*$/i, '').trim() || 'Conceptos';
}

export function temaPregunta(p: Pregunta): string {
  return `Conceptos: ${fuenteCorta(p.fuente)}`;
}

/** Tema de un ejercicio, para agrupar fortalezas y debilidades. */
export function temaDe(ej: Ejercicio): string {
  switch (ej.tipo) {
    case 'pregunta':
      return temaPregunta(ej.pregunta);
    case 'clasificar':
      return 'Clasificar cuentas';
    case 'debeHaber':
      return 'Debe y Haber';
    case 'completar':
      return ej.trans.conIva ? 'Asientos con IVA' : 'Asientos completos';
    case 'cuentaT':
      return 'Saldos de la Cuenta T';
    case 'mayorizar':
      return 'Mayorizar';
    case 'columna8':
      return 'Destino en el Balance de 8 columnas';
    case 'balance8':
      return 'Balance de 8 columnas completo';
    case 'libroErrores':
      return 'Auditar el libro diario';
    case 'secciones':
      return 'Corriente y no corriente';
    case 'eerr':
      return 'Estado de Resultados';
    case 'bg':
      return 'Balance General';
    case 'estados':
      return 'Estados financieros completos';
    case 'calculo':
      return ej.datos.titulo;
    case 'ajustesCierre':
      return 'Ajustes de cierre';
    case 'fiscalizacion':
      return 'Fiscalización CMF';
    case 'clasificarPartidas':
      return 'Agregados y deducciones (RLI)';
    case 'operacionRenta':
      return 'Operación Renta';
    case 'clasificarOpciones':
      return 'Familias de razones';
    case 'crisis':
      return 'Crisis de caja';
  }
}

/** Resultado de un ejercicio dentro de un paso. */
export interface ResultadoEjercicio {
  tema: string;
  primerIntento: boolean;
  fallos: number;
  errores: string[];
}

export function armarRegistro(nivel: string, paso: string, resultados: ResultadoEjercicio[], segundos: number, fecha = new Date()): RegistroPaso {
  const errores: Record<string, number> = {};
  const temas: Record<string, { ok: number; total: number }> = {};
  for (const r of resultados) {
    for (const e of r.errores) errores[e] = (errores[e] ?? 0) + 1;
    const t = (temas[r.tema] ??= { ok: 0, total: 0 });
    t.total += 1;
    if (r.primerIntento) t.ok += 1;
  }
  return {
    fecha: fecha.toISOString(),
    nivel,
    paso,
    ejercicios: resultados.length,
    aciertosPrimera: resultados.filter((r) => r.primerIntento).length,
    fallos: resultados.reduce((s, r) => s + r.fallos, 0),
    segundos: Math.round(Math.min(segundos, 3 * 3600)),
    errores,
    temas,
  };
}

export function precision(r: Pick<RegistroPaso, 'ejercicios' | 'aciertosPrimera'>): number {
  return r.ejercicios ? Math.round((r.aciertosPrimera / r.ejercicios) * 100) : 0;
}

export interface Diagnostico {
  fortalezas: string[];
  debilidades: string[];
  /** Tipos de error más repetidos, de mayor a menor. */
  erroresFrecuentes: { tipo: string; veces: number }[];
}

/** Fortaleza: todo bien al primer intento. Debilidad: algún tema con fallos. */
export function diagnosticar(r: RegistroPaso): Diagnostico {
  const temas = Object.entries(r.temas);
  return {
    fortalezas: temas.filter(([, t]) => t.ok === t.total).map(([n]) => n),
    debilidades: temas
      .filter(([, t]) => t.ok < t.total)
      .sort((a, b) => a[1].ok / a[1].total - b[1].ok / b[1].total)
      .map(([n]) => n),
    erroresFrecuentes: Object.entries(r.errores)
      .map(([tipo, veces]) => ({ tipo, veces }))
      .sort((a, b) => b.veces - a.veces),
  };
}

/** Compara con la vez anterior que se jugó el mismo paso. */
export function compararConAnterior(historial: RegistroPaso[], actual: RegistroPaso): { precisionAntes: number; fallosAntes: number } | null {
  const anteriores = historial.filter((h) => h.nivel === actual.nivel && h.paso === actual.paso && h.fecha !== actual.fecha);
  const prev = anteriores[anteriores.length - 1];
  return prev ? { precisionAntes: precision(prev), fallosAntes: prev.fallos } : null;
}

export function erroresPorEjercicio(rs: RegistroPaso[]): number {
  const ej = rs.reduce((s, r) => s + r.ejercicios, 0);
  return ej ? rs.reduce((s, r) => s + r.fallos, 0) / ej : 0;
}

export interface Tendencia {
  /** Errores por ejercicio al comienzo y ahora. */
  antes: number;
  ahora: number;
  /** Variación porcentual (negativa = menos errores). */
  variacion: number;
  veredicto: 'mejorando' | 'igual' | 'empeorando' | 'sin_datos';
}

/** Compara los primeros registros con los más recientes (hasta 10 de cada lado). */
export function tendencia(historial: RegistroPaso[]): Tendencia {
  if (historial.length < 4) return { antes: 0, ahora: 0, variacion: 0, veredicto: 'sin_datos' };
  const n = Math.min(10, Math.floor(historial.length / 2));
  const antes = erroresPorEjercicio(historial.slice(0, n));
  const ahora = erroresPorEjercicio(historial.slice(-n));
  const variacion = antes === 0 ? (ahora === 0 ? 0 : 100) : Math.round(((ahora - antes) / antes) * 100);
  const veredicto = Math.abs(ahora - antes) < 0.05 || Math.abs(variacion) < 10 ? 'igual' : ahora < antes ? 'mejorando' : 'empeorando';
  return { antes, ahora, variacion, veredicto };
}

/** Errores más repetidos en todo el historial, con su tendencia (mitad reciente vs mitad antigua). */
export function erroresHistoricos(historial: RegistroPaso[], max = 5): { tipo: string; veces: number; recientes: number; antiguos: number }[] {
  const mitad = Math.floor(historial.length / 2);
  const total: Record<string, { veces: number; recientes: number; antiguos: number }> = {};
  historial.forEach((r, i) => {
    for (const [tipo, n] of Object.entries(r.errores ?? {})) {
      const t = (total[tipo] ??= { veces: 0, recientes: 0, antiguos: 0 });
      t.veces += n;
      if (i >= mitad) t.recientes += n;
      else t.antiguos += n;
    }
  });
  return Object.entries(total)
    .map(([tipo, t]) => ({ tipo, ...t }))
    .sort((a, b) => b.veces - a.veces)
    .slice(0, max);
}

/** Temas con más fallos en todo el historial. */
export function temasHistoricos(historial: RegistroPaso[]): { tema: string; ok: number; total: number }[] {
  const t: Record<string, { ok: number; total: number }> = {};
  for (const r of historial)
    for (const [n, v] of Object.entries(r.temas ?? {})) {
      const x = (t[n] ??= { ok: 0, total: 0 });
      x.ok += v.ok;
      x.total += v.total;
    }
  return Object.entries(t).map(([tema, v]) => ({ tema, ...v }));
}

export function formatoDuracion(segundos: number): string {
  const s = Math.round(segundos);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${m % 60} min`;
}
