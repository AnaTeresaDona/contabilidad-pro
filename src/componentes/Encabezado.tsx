import { useProgreso } from '../estado/Progreso';
import { HP_MAX } from '../engine/progreso';

export function Encabezado({ titulo, onVolver }: { titulo?: string; onVolver?: () => void }) {
  const { progreso } = useProgreso();
  const pct = (progreso.hp / HP_MAX) * 100;
  const colorCaja = pct > 50 ? 'bg-emerald-500' : pct > 25 ? 'bg-amber-400' : 'bg-rose-500';

  return (
    <header className="sticky top-0 z-30 border-b-2 border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2.5">
        {onVolver ? (
          <button
            onClick={onVolver}
            className="-ml-2 rounded-xl px-2 py-1 text-2xl text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Volver"
          >
            ←
          </button>
        ) : (
          <span className="text-2xl" aria-hidden>
            📒
          </span>
        )}
        <h1 className="min-w-0 flex-1 truncate text-base font-extrabold text-slate-700">{titulo ?? 'Contabilidad Pro'}</h1>

        <div className="flex items-center gap-3 text-sm font-extrabold">
          <span className="flex items-center gap-1 text-orange-500" title="Racha de días">
            🔥<span>{progreso.racha}</span>
          </span>
          <span className="flex items-center gap-1 text-amber-500" title="Puntos de experiencia">
            ⭐<span>{progreso.xp}</span>
          </span>
          <div className="flex items-center gap-1.5" title={`Caja de la empresa: ${progreso.hp}/${HP_MAX}`}>
            <span aria-hidden>💰</span>
            <div
              className="h-3 w-14 overflow-hidden rounded-full bg-slate-200 sm:w-20"
              role="meter"
              aria-label="Caja de la empresa"
              aria-valuenow={progreso.hp}
              aria-valuemin={0}
              aria-valuemax={HP_MAX}
            >
              <div className={`h-full rounded-full transition-all duration-500 ${colorCaja}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
