import { useState } from 'react';
import type { EjercicioMayorizar } from '../../engine/ejercicios';
import { validarCuentaT, type Naturaleza } from '../../engine/cuentaT';
import { cuenta } from '../../engine/cuentas';
import { formatoCLP, leerMonto } from '../../engine/dinero';
import { Boton, Opcion } from '../../componentes/ui';
import { AsientoVista } from '../../componentes/AsientoVista';
import { CuentaTVista } from '../../componentes/CuentaTVista';
import type { ApiEjercicio } from '../MarcoEjercicio';

const miles = (n: number | null) => (n === null ? '' : n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'));

export function EjMayorizar({ datos, api }: { datos: EjercicioMayorizar; api: ApiEjercicio }) {
  const [saldo, setSaldo] = useState<number | null>(null);
  const [naturaleza, setNaturaleza] = useState<Naturaleza | null>(null);
  const t = datos.datos;
  const nombre = cuenta(t.cuentaId).nombre;

  const comprobar = () =>
    api.comprobar(
      validarCuentaT(t, saldo, naturaleza),
      <div className="rounded-xl border border-slate-200 p-3">
        <CuentaTVista titulo={nombre} movimientos={t.movimientos} totales />
        <p className="mt-2 text-center font-extrabold">
          Saldo {t.naturaleza}: {formatoCLP(t.saldo)}
        </p>
      </div>,
    );

  return (
    <div>
      <h2 className="text-xl font-extrabold">Mayoriza la cuenta {nombre}</h2>
      <p className="mb-4 text-sm text-slate-500">
        Busca {nombre} en cada asiento del Libro Diario, lleva sus montos a la Cuenta T y calcula el saldo.
      </p>
      <div className="mb-5 space-y-2">
        {datos.asientos.map((a, i) => (
          <div key={a.id}>
            <p className="mb-1 text-xs font-extrabold uppercase text-slate-400">Asiento N°{i + 1}</p>
            <AsientoVista lineas={a.lineas} totales={false} />
          </div>
        ))}
      </div>
      {api.bloqueado && (
        <div className="mb-4 rounded-2xl border-2 border-slate-200 bg-white p-4">
          <CuentaTVista titulo={nombre} movimientos={t.movimientos} totales />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-bold text-slate-500">Saldo de {nombre}</span>
          <span className="flex items-center rounded-xl border-2 border-slate-200 bg-white px-3 focus-within:border-sky-400">
            <span className="font-bold text-slate-400">$</span>
            <input
              inputMode="numeric"
              placeholder="0"
              disabled={api.bloqueado}
              value={miles(saldo)}
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
