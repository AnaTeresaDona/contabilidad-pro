import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { NivelInfo } from '../content/tipos';

type Variante = 'primario' | 'secundario' | 'peligro' | 'fantasma' | 'aviso';

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-emerald-500 text-white border-emerald-700 hover:bg-emerald-400',
  secundario: 'bg-white text-slate-700 border-2 border-slate-300 hover:bg-slate-50',
  peligro: 'bg-rose-500 text-white border-rose-700 hover:bg-rose-400',
  fantasma: 'bg-transparent text-slate-600 border-transparent hover:bg-slate-100',
  aviso: 'bg-amber-400 text-amber-950 border-amber-600 hover:bg-amber-300',
};

export function Boton({
  variante = 'primario',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante }) {
  return (
    <button
      {...props}
      className={`rounded-2xl border-b-4 px-5 py-3 text-sm font-extrabold uppercase tracking-wide transition active:translate-y-[2px] active:border-b-2 disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTES[variante]} ${className}`}
    />
  );
}

/** Botón de opción seleccionable (Debe/Haber, tipos de cuenta, alternativas). */
export function Opcion({
  activa,
  estado,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { activa?: boolean; estado?: 'bien' | 'mal' | null }) {
  const color =
    estado === 'bien'
      ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
      : estado === 'mal'
        ? 'border-rose-500 bg-rose-50 text-rose-800'
        : activa
          ? 'border-sky-500 bg-sky-50 text-sky-800'
          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50';
  return (
    <button
      {...props}
      className={`rounded-xl border-2 border-b-4 px-3 py-2 text-sm font-bold transition active:translate-y-[1px] disabled:cursor-default ${color} ${className}`}
    />
  );
}

export function Tarjeta({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border-2 border-slate-200 bg-white p-4 ${className}`}>{children}</div>;
}

/** Globo de diálogo de un personaje. */
export function Dialogo({ emoji, nombre, children }: { emoji: string; nombre: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-100 text-3xl" aria-hidden>
        {emoji}
      </div>
      <div className="relative flex-1 rounded-2xl border-2 border-slate-200 bg-white p-4">
        <p className="mb-1 text-xs font-extrabold uppercase tracking-wide text-slate-400">{nombre}</p>
        <div className="text-[15px] leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

export const COLORES: Record<NivelInfo['color'], { fondo: string; borde: string; suave: string; texto: string }> = {
  emerald: { fondo: 'bg-emerald-500', borde: 'border-emerald-700', suave: 'bg-emerald-50', texto: 'text-emerald-700' },
  sky: { fondo: 'bg-sky-500', borde: 'border-sky-700', suave: 'bg-sky-50', texto: 'text-sky-700' },
  teal: { fondo: 'bg-teal-500', borde: 'border-teal-700', suave: 'bg-teal-50', texto: 'text-teal-700' },
  violet: { fondo: 'bg-violet-500', borde: 'border-violet-700', suave: 'bg-violet-50', texto: 'text-violet-700' },
  indigo: { fondo: 'bg-indigo-500', borde: 'border-indigo-700', suave: 'bg-indigo-50', texto: 'text-indigo-700' },
  amber: { fondo: 'bg-amber-500', borde: 'border-amber-700', suave: 'bg-amber-50', texto: 'text-amber-700' },
  rose: { fondo: 'bg-rose-500', borde: 'border-rose-700', suave: 'bg-rose-50', texto: 'text-rose-700' },
  fuchsia: { fondo: 'bg-fuchsia-500', borde: 'border-fuchsia-700', suave: 'bg-fuchsia-50', texto: 'text-fuchsia-700' },
  orange: { fondo: 'bg-orange-500', borde: 'border-orange-700', suave: 'bg-orange-50', texto: 'text-orange-700' },
  cyan: { fondo: 'bg-cyan-500', borde: 'border-cyan-700', suave: 'bg-cyan-50', texto: 'text-cyan-700' },
};
