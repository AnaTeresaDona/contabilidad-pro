import type { Lado } from '../engine/types';
import { formatoCLP } from '../engine/dinero';

interface Mov {
  lado: Lado;
  monto: number;
  glosa?: string;
}

export function CuentaTVista({ titulo, movimientos, totales = false }: { titulo: string; movimientos: Mov[]; totales?: boolean }) {
  const debe = movimientos.filter((m) => m.lado === 'debe');
  const haber = movimientos.filter((m) => m.lado === 'haber');
  const sum = (xs: Mov[]) => xs.reduce((a, m) => a + m.monto, 0);

  const columna = (xs: Mov[]) => (
    <ul className="space-y-1.5 p-2">
      {xs.map((m, i) => (
        <li key={i} className="text-right">
          {m.glosa && <span className="block text-[11px] leading-tight text-slate-400">{m.glosa}</span>}
          <span className="font-bold tabular-nums">{formatoCLP(m.monto)}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="rounded-xl bg-white">
      <p className="border-b-4 border-slate-700 pb-1 text-center font-extrabold">{titulo}</p>
      <div className="grid grid-cols-2 text-sm">
        <div className="min-h-16 border-r-4 border-slate-700">
          <p className="pt-1 text-center text-[11px] font-extrabold uppercase text-slate-400">Debe</p>
          {columna(debe)}
        </div>
        <div className="min-h-16">
          <p className="pt-1 text-center text-[11px] font-extrabold uppercase text-slate-400">Haber</p>
          {columna(haber)}
        </div>
      </div>
      {totales && (
        <div className="grid grid-cols-2 border-t-2 border-slate-300 text-sm font-extrabold">
          <p className="p-2 text-right tabular-nums">{formatoCLP(sum(debe))}</p>
          <p className="p-2 text-right tabular-nums">{formatoCLP(sum(haber))}</p>
        </div>
      )}
    </div>
  );
}
