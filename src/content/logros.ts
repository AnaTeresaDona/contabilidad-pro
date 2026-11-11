import type { Progreso } from '../engine/progreso';

export interface Logro {
  id: string;
  titulo: string;
  descripcion: string;
  emoji: string;
  /** Se otorga automáticamente cuando esta condición se cumple. */
  cumple: (p: Progreso) => boolean;
}

export const LOGROS: Logro[] = [
  { id: 'primer_asiento', emoji: '✍️', titulo: 'Primer asiento', descripcion: 'Registra tu primer asiento en el libro de la empresa.', cumple: (p) => p.libro.length > 0 },
  { id: 'combo_5', emoji: '⚡', titulo: 'En racha', descripcion: 'Logra 5 aciertos seguidos.', cumple: (p) => p.mejorCombo >= 5 },
  { id: 'racha_3', emoji: '🔥', titulo: 'Constancia', descripcion: 'Juega 3 días seguidos.', cumple: (p) => p.racha >= 3 },
  { id: 'nivel_1', emoji: '🧱', titulo: 'Cimientos firmes', descripcion: 'Completa el Nivel 1.', cumple: (p) => !!p.niveles.n1?.completado },
  { id: 'nivel_2', emoji: '📊', titulo: 'Mes cerrado', descripcion: 'Completa el Nivel 2 y cuadra tu primer Balance de 8 columnas.', cumple: (p) => !!p.niveles.n2?.completado },
  { id: 'nivel_3', emoji: '🏦', titulo: 'Informe aprobado', descripcion: 'Completa el Nivel 3 y presenta tus primeros estados financieros.', cumple: (p) => !!p.niveles.n3?.completado },
  { id: 'jefe_perfecto', emoji: '🎯', titulo: 'Cuadré a la primera', descripcion: 'Vence a un jefe en el primer intento.', cumple: (p) => Object.values(p.niveles).some((n) => n.jefePerfecto) },
  { id: 'sin_pistas', emoji: '🧠', titulo: 'Sin ayuda', descripcion: 'Completa un nivel sin usar pistas.', cumple: (p) => Object.values(p.niveles).some((n) => n.sinPistas) },
  { id: 'repaso_5', emoji: '📚', titulo: 'Aprender del error', descripcion: 'Resuelve 5 preguntas en el mazo de Repaso.', cumple: (p) => p.repasoResueltas >= 5 },
  { id: 'xp_500', emoji: '⭐', titulo: 'Contador en formación', descripcion: 'Junta 500 XP.', cumple: (p) => p.xp >= 500 },
];
