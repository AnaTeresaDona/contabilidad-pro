import { useState } from 'react';
import { cuenta } from '../engine/cuentas';
import { formatoCLP } from '../engine/dinero';
import {
  celdas8,
  celdasResultado,
  cuadraturas,
  sumarCeldas,
  type Celdas8,
  type FilaParcial,
  type TipoResultado,
} from '../engine/balance8';

export interface FilaTabla extends FilaParcial {
  cuentaId: string;
}

const PAREJAS = [
  { id: 'sumas', titulo: 'Sumas', cols: ['Debe', 'Haber'] },
  { id: 'saldos', titulo: 'Saldos', cols: ['Deudor', 'Acreedor'] },
  { id: 'inventario', titulo: 'Inventario', cols: ['Activo', 'Pasivo'] },
  { id: 'resultados', titulo: 'Resultados', cols: ['Pérdidas', 'Ganancias'] },
] as const;

const fmt = (n: number) => (n ? formatoCLP(n) : '');

function calcular(filas: FilaTabla[], resultado: { tipo: TipoResultado | null; monto: number | null }) {
  const celdas = filas.map(celdas8);
  const subtotal = sumarCeldas(celdas);
  const res = celdasResultado(resultado);
  const total = sumarCeldas([subtotal, res]);
  return { celdas, subtotal, res, total, ok: cuadraturas(total) };
}

function etiquetaResultado(r: { tipo: TipoResultado | null }) {
  return r.tipo === 'perdida' ? 'Pérdida del ejercicio' : 'Utilidad del ejercicio';
}

/** Tabla completa de 8 columnas (para pantallas anchas y para la solución). */
export function TablaBalance({ filas, resultado }: { filas: FilaTabla[]; resultado: { tipo: TipoResultado | null; monto: number | null } }) {
  const { celdas, subtotal, res, total, ok } = calcular(filas, resultado);
  const fila = (nombre: string, c: Celdas8, clase = '') => (
    <tr className={clase}>
      <th scope="row" className="sticky left-0 bg-inherit px-1.5 py-1.5 text-left font-semibold">
        {nombre}
      </th>
      {c.map((v, i) => (
        <td key={i} className={`px-1.5 py-1.5 text-right tabular-nums ${i % 2 === 0 ? 'border-l border-slate-200' : ''}`}>
          {fmt(v)}
        </td>
      ))}
    </tr>
  );
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[620px] text-[11px]">
        <thead className="bg-slate-100 text-slate-500">
          <tr>
            <th className="sticky left-0 bg-slate-100 px-1.5 py-1.5 text-left" rowSpan={2}>
              Cuenta
            </th>
            {PAREJAS.map((p, i) => (
              <th key={p.id} colSpan={2} className="border-l border-slate-200 px-2 pt-1.5 text-center font-extrabold uppercase">
                {p.titulo} {total[i * 2] > 0 && (ok[i] ? '✅' : '❌')}
              </th>
            ))}
          </tr>
          <tr>
            {PAREJAS.flatMap((p) => p.cols).map((c, i) => (
              <th key={c} className={`px-2 pb-1.5 text-right font-bold ${i % 2 === 0 ? 'border-l border-slate-200' : ''}`}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white">
          {filas.map((f, i) => fila(cuenta(f.cuentaId).nombre, celdas[i], 'border-t border-slate-100 bg-white'))}
          {fila('Subtotales', subtotal, 'border-t-2 border-slate-300 bg-slate-50 font-bold')}
          {fila(etiquetaResultado(resultado), res, 'bg-amber-50 italic')}
          {fila('Totales', total, 'border-t-2 border-slate-400 bg-slate-100 font-extrabold')}
        </tbody>
      </table>
    </div>
  );
}

/** Versión para celular: una pareja de columnas a la vez, en pestañas. */
export function PestanasBalance({ filas, resultado }: { filas: FilaTabla[]; resultado: { tipo: TipoResultado | null; monto: number | null } }) {
  const [p, setP] = useState(1);
  const { celdas, subtotal, res, total, ok } = calcular(filas, resultado);
  const i = p * 2;
  const pareja = PAREJAS[p];
  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-white">
      <div role="tablist" className="grid grid-cols-4 border-b-2 border-slate-200 text-[11px] font-extrabold uppercase">
        {PAREJAS.map((x, j) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={p === j}
            onClick={() => setP(j)}
            className={`px-1 py-2 ${p === j ? 'bg-sky-50 text-sky-700' : 'text-slate-400'}`}
          >
            {x.titulo}
            <span className="block text-[10px]">{total[j * 2] > 0 ? (ok[j] ? '✅' : '❌') : '·'}</span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-2 px-2 py-2 text-xs min-[360px]:px-3 min-[360px]:text-[13px]">
        <span className="text-xs font-bold text-slate-400">Cuenta</span>
        <span className="text-right text-xs font-bold text-slate-400">{pareja.cols[0]}</span>
        <span className="text-right text-xs font-bold text-slate-400">{pareja.cols[1]}</span>
        {filas.map((f, k) => (
          <Fila key={f.cuentaId} nombre={cuenta(f.cuentaId).nombre} a={celdas[k][i]} b={celdas[k][i + 1]} />
        ))}
        {p >= 2 && (
          <>
            <Fila nombre="Subtotales" a={subtotal[i]} b={subtotal[i + 1]} clase="border-t border-slate-200 pt-1 font-bold" />
            <Fila nombre={etiquetaResultado(resultado)} a={res[i]} b={res[i + 1]} clase="italic text-amber-700" />
          </>
        )}
        <Fila nombre="Totales" a={total[i]} b={total[i + 1]} clase="border-t-2 border-slate-300 pt-1 font-extrabold" />
      </div>
      <p className={`px-3 pb-3 text-center text-sm font-extrabold ${ok[p] ? 'text-emerald-600' : 'text-slate-400'}`}>
        {total[i] === 0 ? 'Completa los datos para ver esta pareja' : ok[p] ? `⚖️ ${pareja.titulo} cuadra` : `${pareja.titulo} no cuadra todavía`}
      </p>
    </div>
  );
}

function Fila({ nombre, a, b, clase = '' }: { nombre: string; a: number; b: number; clase?: string }) {
  return (
    <>
      <span className={`min-w-0 break-words leading-snug ${clase}`}>{nombre}</span>
      <span className={`min-w-[4.5rem] text-right tabular-nums ${clase}`}>{fmt(a)}</span>
      <span className={`min-w-[4.5rem] text-right tabular-nums ${clase}`}>{fmt(b)}</span>
    </>
  );
}
