import { useState } from 'react';
import type { Lado, LineaAsiento } from '../../engine/types';
import type { Transaccion } from '../../engine/plantillas';
import { cuenta } from '../../engine/cuentas';
import { leerMonto } from '../../engine/dinero';
import { compararAsiento, sumas } from '../../engine/asientos';
import { Boton, Opcion } from '../../componentes/ui';
import { AsientoVista } from '../../componentes/AsientoVista';
import type { ApiEjercicio } from '../MarcoEjercicio';
import { Operacion, Sumas } from './Operacion';

export interface FilaAsiento {
  cuentaId: string;
  lado: Lado | null;
  monto: number | null;
}

const miles = (n: number | null) => (n === null ? '' : n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'));

export function lineasDe(filas: FilaAsiento[]): LineaAsiento[] {
  return filas.flatMap((f) => (f.lado && f.monto ? [{ cuentaId: f.cuentaId, lado: f.lado, monto: f.monto }] : []));
}

export function filasCompletas(filas: FilaAsiento[]): boolean {
  return filas.length >= 2 && filas.every((f) => f.lado && f.monto);
}

/** Formulario controlado para armar un asiento: elegir cuentas, lado y monto. */
export function FormAsiento({
  trans,
  opciones,
  filas,
  onChange,
  bloqueado,
}: {
  trans: Transaccion;
  opciones: string[];
  filas: FilaAsiento[];
  onChange: (f: FilaAsiento[]) => void;
  bloqueado: boolean;
}) {
  const usadas = new Set(filas.map((f) => f.cuentaId));
  const s = sumas(lineasDe(filas));
  const cambiar = (i: number, cambios: Partial<FilaAsiento>) => onChange(filas.map((f, j) => (j === i ? { ...f, ...cambios } : f)));

  return (
    <div>
      <Operacion texto={trans.texto} documento={trans.documento} valores={trans.valores} />

      <p className="mb-2 text-sm font-bold text-slate-500">1. Toca las cuentas que participan:</p>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {opciones.map((id) => (
          <button
            key={id}
            disabled={bloqueado || usadas.has(id)}
            onClick={() => onChange([...filas, { cuentaId: id, lado: null, monto: null }])}
            className="rounded-full border-2 border-sky-200 bg-sky-50 px-3 py-1.5 text-sm font-bold text-sky-800 transition hover:bg-sky-100 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
          >
            + {cuenta(id).nombre}
          </button>
        ))}
      </div>

      <p className="mb-2 text-sm font-bold text-slate-500">2. Elige el lado y escribe el monto:</p>
      {filas.length === 0 && (
        <p className="rounded-2xl border-2 border-dashed border-slate-200 p-4 text-center text-sm text-slate-400">Aún no agregas cuentas.</p>
      )}
      <div className="space-y-2.5">
        {filas.map((f, i) => (
          <div key={f.cuentaId} className="rounded-2xl border-2 border-slate-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="font-extrabold">{cuenta(f.cuentaId).nombre}</p>
              {!bloqueado && (
                <button
                  onClick={() => onChange(filas.filter((_, j) => j !== i))}
                  className="rounded-lg px-2 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                  aria-label={`Quitar ${cuenta(f.cuentaId).nombre}`}
                >
                  ✕
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(['debe', 'haber'] as Lado[]).map((lado) => (
                <Opcion
                  key={lado}
                  className="w-20"
                  aria-label={`${cuenta(f.cuentaId).nombre} al ${lado}`}
                  activa={f.lado === lado}
                  disabled={bloqueado}
                  onClick={() => cambiar(i, { lado })}
                >
                  {lado === 'debe' ? 'Debe' : 'Haber'}
                </Opcion>
              ))}
              <label className="flex min-w-36 flex-1 items-center rounded-xl border-2 border-slate-200 bg-slate-50 px-3 focus-within:border-sky-400">
                <span className="font-bold text-slate-400">$</span>
                <input
                  inputMode="numeric"
                  placeholder="0"
                  aria-label={`Monto de ${cuenta(f.cuentaId).nombre}`}
                  disabled={bloqueado}
                  value={miles(f.monto)}
                  onChange={(e) => cambiar(i, { monto: leerMonto(e.target.value) })}
                  className="w-full bg-transparent px-1 py-2 text-right font-bold tabular-nums outline-none"
                />
              </label>
            </div>
          </div>
        ))}
      </div>
      <Sumas debe={s.debe} haber={s.haber} />
    </div>
  );
}

export function EjCompletar({ trans, opciones, api }: { trans: Transaccion; opciones: string[]; api: ApiEjercicio }) {
  const [filas, setFilas] = useState<FilaAsiento[]>([]);
  const comprobar = () =>
    api.comprobar(compararAsiento(trans.asiento.lineas, lineasDe(filas), trans.valores), <AsientoVista lineas={trans.asiento.lineas} />);

  return (
    <div>
      <h2 className="mb-3 text-xl font-extrabold">Registra el asiento completo</h2>
      <FormAsiento trans={trans} opciones={opciones} filas={filas} onChange={setFilas} bloqueado={api.bloqueado} />
      {!api.bloqueado && (
        <Boton className="mt-6 w-full" disabled={!filasCompletas(filas)} onClick={comprobar}>
          Comprobar
        </Boton>
      )}
    </div>
  );
}
