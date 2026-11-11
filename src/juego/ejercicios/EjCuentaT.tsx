import { useState } from 'react';
import { validarCuentaT, type EjercicioCuentaT, type Naturaleza } from '../../engine/cuentaT';
import { cuenta } from '../../engine/cuentas';
import { formatoCLP, leerMonto } from '../../engine/dinero';
import { Boton, Opcion } from '../../componentes/ui';
import { CuentaTVista } from '../../componentes/CuentaTVista';
import type { ApiEjercicio } from '../MarcoEjercicio';

export function EjCuentaT({ datos, api }: { datos: EjercicioCuentaT; api: ApiEjercicio }) {
  const [saldo, setSaldo] = useState<number | null>(null);
  const [naturaleza, setNaturaleza] = useState<Naturaleza | null>(null);
  const nombre = cuenta(datos.cuentaId).nombre;

  const comprobar = () =>
    api.comprobar(
      validarCuentaT(datos, saldo, naturaleza),
      <div className="rounded-xl border border-slate-200 p-3">
        <CuentaTVista titulo={nombre} movimientos={datos.movimientos} totales />
        <p className="mt-2 text-center font-extrabold">
          Saldo {datos.naturaleza}: {formatoCLP(datos.saldo)}
        </p>
      </div>,
    );

  return (
    <div>
      <h2 className="text-xl font-extrabold">Calcula el saldo de la Cuenta T</h2>
      <p className="mb-4 text-sm text-slate-500">Estos son los movimientos del mes de la cuenta {nombre}.</p>
      <div className="mb-5 rounded-2xl border-2 border-slate-200 bg-white p-4">
        <CuentaTVista titulo={nombre} movimientos={datos.movimientos} totales={api.bloqueado} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-bold text-slate-500">Saldo</span>
          <span className="flex items-center rounded-xl border-2 border-slate-200 bg-white px-3 focus-within:border-sky-400">
            <span className="font-bold text-slate-400">$</span>
            <input
              inputMode="numeric"
              placeholder="0"
              disabled={api.bloqueado}
              value={saldo === null ? '' : saldo.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
              onChange={(e) => setSaldo(leerMonto(e.target.value))}
              className="w-full bg-transparent px-1 py-2.5 text-right text-lg font-extrabold tabular-nums outline-none"
            />
          </span>
        </label>
        <div>
          <span className="mb-1 block text-sm font-bold text-slate-500">Naturaleza del saldo</span>
          <div className="grid grid-cols-2 gap-2">
            {(['deudor', 'acreedor'] as Naturaleza[]).map((n) => (
              <Opcion key={n} className="py-2.5 capitalize" activa={naturaleza === n} disabled={api.bloqueado} onClick={() => setNaturaleza(n)}>
                {n}
              </Opcion>
            ))}
          </div>
        </div>
      </div>
      {!api.bloqueado && (
        <Boton className="mt-6 w-full" disabled={saldo === null || !naturaleza} onClick={comprobar}>
          Comprobar
        </Boton>
      )}
    </div>
  );
}
