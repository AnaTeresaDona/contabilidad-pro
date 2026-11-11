import { useState } from 'react';
import type { Asiento } from '../../engine/types';
import type { Naturaleza } from '../../engine/cuentaT';
import { cuenta } from '../../engine/cuentas';
import { formatoCLP, leerMonto } from '../../engine/dinero';
import { validarBalance, type Balance8, type Destino, type RespuestaFila, type TipoResultado } from '../../engine/balance8';
import { Boton, Opcion } from '../../componentes/ui';
import { AsientoVista } from '../../componentes/AsientoVista';
import { PestanasBalance, TablaBalance, type FilaTabla } from '../../componentes/TablaBalance';
import type { ApiEjercicio } from '../MarcoEjercicio';

const miles = (n: number | null) => (n === null ? '' : n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'));

export function EjBalance8({ asientos, balance, api }: { asientos: Asiento[]; balance: Balance8; api: ApiEjercicio }) {
  const [resp, setResp] = useState<RespuestaFila[]>(
    balance.filas.map((f) => ({ cuentaId: f.cuentaId, saldo: null, naturaleza: null, destino: null })),
  );
  const [resultado, setResultado] = useState<{ tipo: TipoResultado | null; monto: number | null }>({ tipo: null, monto: null });

  const cambiar = (i: number, c: Partial<RespuestaFila>) => setResp((rs) => rs.map((r, j) => (j === i ? { ...r, ...c } : r)));

  const filasJugador: FilaTabla[] = balance.filas.map((f, i) => ({ ...resp[i], debe: f.debe, haber: f.haber }));
  const filasCorrectas: FilaTabla[] = balance.filas.map((f) => ({ ...f }));
  const completo = resp.every((r) => r.saldo !== null && r.naturaleza && r.destino) && resultado.tipo && resultado.monto !== null;

  const comprobar = () => api.comprobar(validarBalance(balance, resp, resultado), <TablaBalance filas={filasCorrectas} resultado={balance.resultado} />);

  return (
    <div>
      <details className="mb-4 rounded-2xl border-2 border-slate-200 bg-white p-3">
        <summary className="cursor-pointer font-extrabold text-slate-600">📒 Ver el Libro Diario del mes ({asientos.length} asientos)</summary>
        <div className="mt-3 space-y-3">
          {asientos.map((a, i) => (
            <div key={a.id}>
              <p className="text-xs font-extrabold uppercase text-slate-400">Asiento N°{i + 1}</p>
              <p className="mb-1 text-sm leading-snug">{a.glosa}</p>
              <AsientoVista lineas={a.lineas} totales={false} />
            </div>
          ))}
        </div>
      </details>

      <p className="mb-3 text-sm text-slate-500">
        Las <b>Sumas</b> ya vienen del Libro Mayor. Para cada cuenta, calcula el <b>saldo</b>, su naturaleza y si va a <b>Inventario</b> o a{' '}
        <b>Resultados</b>.
      </p>

      <div className="space-y-3">
        {balance.filas.map((f, i) => {
          const r = resp[i];
          const ok = r.saldo === f.saldo && r.naturaleza === f.naturaleza && r.destino === f.destino;
          return (
            <div
              key={f.cuentaId}
              className={`rounded-2xl border-2 bg-white p-3 ${api.bloqueado ? (ok ? 'border-emerald-300' : 'border-rose-300') : 'border-slate-200'}`}
            >
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="font-extrabold">{cuenta(f.cuentaId).nombre}</p>
                <p className="text-xs font-bold tabular-nums text-slate-500">
                  Debe {formatoCLP(f.debe)} · Haber {formatoCLP(f.haber)}
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                <label className="flex items-center rounded-xl border-2 border-slate-200 bg-slate-50 px-3 focus-within:border-sky-400">
                  <span className="text-xs font-bold text-slate-400">Saldo $</span>
                  <input
                    inputMode="numeric"
                    placeholder="0"
                    aria-label={`Saldo de ${cuenta(f.cuentaId).nombre}`}
                    disabled={api.bloqueado}
                    value={miles(r.saldo)}
                    onChange={(e) => cambiar(i, { saldo: leerMonto(e.target.value) })}
                    className="w-full bg-transparent px-1 py-2 text-right font-bold tabular-nums outline-none"
                  />
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['deudor', 'acreedor'] as Naturaleza[]).map((n) => (
                    <Opcion
                      key={n}
                      aria-label={`${cuenta(f.cuentaId).nombre}: saldo ${n}`}
                      aria-pressed={r.naturaleza === n}
                      className="px-2 py-1.5 text-xs capitalize"
                      activa={r.naturaleza === n}
                      disabled={api.bloqueado}
                      onClick={() => cambiar(i, { naturaleza: n })}
                    >
                      {n}
                    </Opcion>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['inventario', 'resultados'] as Destino[]).map((d) => (
                    <Opcion
                      key={d}
                      aria-label={`${cuenta(f.cuentaId).nombre}: va a ${d}`}
                      aria-pressed={r.destino === d}
                      className="px-2 py-1.5 text-xs capitalize"
                      activa={r.destino === d}
                      disabled={api.bloqueado}
                      onClick={() => cambiar(i, { destino: d })}
                    >
                      {d}
                    </Opcion>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-3">
          <p className="mb-2 font-extrabold">Resultado del ejercicio</p>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <label className="flex items-center rounded-xl border-2 border-amber-200 bg-white px-3 focus-within:border-sky-400">
              <span className="font-bold text-slate-400">$</span>
              <input
                inputMode="numeric"
                placeholder="0"
                aria-label="Monto del resultado del ejercicio"
                disabled={api.bloqueado}
                value={miles(resultado.monto)}
                onChange={(e) => setResultado((r) => ({ ...r, monto: leerMonto(e.target.value) }))}
                className="w-full bg-transparent px-1 py-2 text-right font-bold tabular-nums outline-none"
              />
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(['utilidad', 'perdida'] as TipoResultado[]).map((t) => (
                <Opcion key={t} className="px-3 py-1.5 text-xs" activa={resultado.tipo === t} disabled={api.bloqueado} onClick={() => setResultado((r) => ({ ...r, tipo: t }))}>
                  {t === 'utilidad' ? 'Utilidad' : 'Pérdida'}
                </Opcion>
              ))}
            </div>
          </div>
        </div>
      </div>

      <h3 className="mb-2 mt-6 font-extrabold">Tu Balance de 8 columnas</h3>
      <p className="mb-2 text-xs text-slate-500">Se arma solo con lo que escribes. Cada pareja muestra ✅ cuando cuadra.</p>
      <div className="sm:hidden">
        <PestanasBalance filas={filasJugador} resultado={resultado} />
      </div>
      <div className="hidden sm:block">
        <TablaBalance filas={filasJugador} resultado={resultado} />
      </div>

      {!api.bloqueado && (
        <Boton className="mt-6 w-full" disabled={!completo} onClick={comprobar}>
          Entregar balance
        </Boton>
      )}
    </div>
  );
}
