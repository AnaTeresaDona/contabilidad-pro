import type { LineaAsiento } from '../engine/types';
import { cuenta } from '../engine/cuentas';
import { formatoCLP } from '../engine/dinero';
import { sumas } from '../engine/asientos';

/** Asiento en formato libro diario: primero el Debe, luego el Haber (con sangría). */
export function AsientoVista({ lineas, totales = true }: { lineas: LineaAsiento[]; totales?: boolean }) {
  const orden = [...lineas.filter((l) => l.lado === 'debe'), ...lineas.filter((l) => l.lado === 'haber')];
  const s = sumas(lineas);
  const cuadra = s.debe === s.haber;
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 text-[13px] sm:text-sm">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] bg-slate-100 px-3 py-1.5 text-xs font-extrabold uppercase text-slate-500">
        <span>Cuenta</span>
        <span className="w-[4.9rem] text-right min-[360px]:w-[5.75rem] sm:w-28">Debe</span>
        <span className="w-[4.9rem] text-right min-[360px]:w-[5.75rem] sm:w-28">Haber</span>
      </div>
      {orden.map((l, i) => (
        <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto_auto] border-t border-slate-100 px-3 py-1.5">
          <span className={`min-w-0 leading-snug break-words ${l.lado === 'haber' ? 'pl-4 text-slate-600' : 'font-semibold'}`}>
            {cuenta(l.cuentaId).nombre}
          </span>
          <span className="w-[4.9rem] text-right min-[360px]:w-[5.75rem] tabular-nums sm:w-28">{l.lado === 'debe' ? formatoCLP(l.monto) : ''}</span>
          <span className="w-[4.9rem] text-right min-[360px]:w-[5.75rem] tabular-nums sm:w-28">{l.lado === 'haber' ? formatoCLP(l.monto) : ''}</span>
        </div>
      ))}
      {totales && (
        <div
          className={`grid grid-cols-[minmax(0,1fr)_auto_auto] border-t-2 px-3 py-1.5 font-extrabold ${cuadra ? 'border-slate-200 text-slate-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}
        >
          <span>{cuadra ? 'Totales' : 'No cuadra'}</span>
          <span className="w-[4.9rem] text-right min-[360px]:w-[5.75rem] tabular-nums sm:w-28">{formatoCLP(s.debe)}</span>
          <span className="w-[4.9rem] text-right min-[360px]:w-[5.75rem] tabular-nums sm:w-28">{formatoCLP(s.haber)}</span>
        </div>
      )}
    </div>
  );
}
