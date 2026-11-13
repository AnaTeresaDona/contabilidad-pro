import { useEffect, useMemo, type CSSProperties, type ReactNode } from 'react';
import { useProgreso } from '../estado/Progreso';
import { IconoPremio } from './IconoPremio';

const COLORES_CONFETI = ['#10b981', '#f59e0b', '#0ea5e9', '#f43f5e', '#8b5cf6', '#facc15'];

export function Confeti() {
  const piezas = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        i,
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        dur: 2.2 + Math.random() * 1.6,
        color: COLORES_CONFETI[i % COLORES_CONFETI.length],
        ancho: 6 + Math.random() * 6,
      })),
    [],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {piezas.map((p) => (
        <span
          key={p.i}
          className="confeti absolute top-0 block rounded-sm"
          style={
            {
              left: `${p.left}%`,
              width: p.ancho,
              height: p.ancho * 1.6,
              background: p.color,
              '--delay': `${p.delay}s`,
              '--dur': `${p.dur}s`,
              transform: 'translateY(-10vh)',
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

export function Modal({ children, onCerrar }: { children: ReactNode; onCerrar?: () => void }) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar?.();
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onCerrar]);
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        className="aparecer max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

/** Avisos de logros desbloqueados. */
export function AvisosLogros() {
  const { avisos, cerrarAviso } = useProgreso();
  useEffect(() => {
    if (avisos.length === 0) return;
    const t = setTimeout(() => cerrarAviso(avisos[0].id), 3800);
    return () => clearTimeout(t);
  }, [avisos, cerrarAviso]);
  if (avisos.length === 0) return null;
  const { emoji, titulo, etiqueta, premio, id } = avisos[0];
  return (
    <div className="fixed inset-x-0 top-16 z-50 flex justify-center px-4" role="status">
      <button
        onClick={() => cerrarAviso(id)}
        className={`aparecer flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left shadow-lg ${
          premio ? 'border-violet-300 bg-gradient-to-r from-indigo-50 to-sky-50' : 'border-amber-300 bg-amber-50'
        }`}
      >
        <span className="text-3xl">{premio ? <IconoPremio premio={premio} tam={40} /> : emoji}</span>
        <span>
          <span className={`block text-xs font-extrabold uppercase ${premio ? 'text-violet-600' : 'text-amber-600'}`}>{etiqueta}</span>
          <span className="block font-extrabold">{titulo}</span>
          {premio && <span className="block text-xs text-slate-500">{premio.frase}</span>}
        </span>
      </button>
    </div>
  );
}
