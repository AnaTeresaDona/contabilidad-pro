import { useProgreso } from '../estado/Progreso';
import { HP_MAX } from '../engine/progreso';
import { premioActual } from '../content/premios';
import { Calculadora } from './Calculadora';
import { IconoPremio } from './IconoPremio';

export function Encabezado({ titulo, onVolver, onPremios }: { titulo?: string; onVolver?: () => void; onPremios: () => void }) {
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
          <img src="/icono.svg" alt="" className="h-8 w-8" aria-hidden />
        )}
        <h1 className="min-w-0 flex-1 truncate text-base font-extrabold text-slate-700">{titulo ?? 'Contabilidad Pro'}</h1>

        <div className="flex items-center gap-2 text-sm font-extrabold sm:gap-3">
          <Calculadora />
          <span className="flex items-center gap-0.5 text-orange-500" title="Racha de días">
            🔥<span>{progreso.racha}</span>
          </span>
          <button
            onClick={onPremios}
            className="flex items-center gap-1 rounded-xl px-1 py-0.5 text-violet-600 hover:bg-violet-50"
            title={`${progreso.chispas} chispas de saber · Premio: ${premioActual(progreso.chispas).nombre}`}
            aria-label="Ver mi camino de premios"
          >
            <IconoPremio premio={premioActual(progreso.chispas)} tam={22} />
            <span>{progreso.chispas >= 10000 ? `${Math.floor(progreso.chispas / 1000)}k` : progreso.chispas}</span>
          </button>
          <div className="flex items-center gap-1.5" title={`Caja de la empresa: ${progreso.hp}/${HP_MAX}`}>
            <span aria-hidden>💰</span>
            <div
              className="h-3 w-10 overflow-hidden rounded-full bg-slate-200 sm:w-20"
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
