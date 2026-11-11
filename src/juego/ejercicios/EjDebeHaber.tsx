import { useState } from 'react';
import type { Lado, LineaAsiento } from '../../engine/types';
import type { Transaccion } from '../../engine/plantillas';
import { cuenta } from '../../engine/cuentas';
import { formatoCLP } from '../../engine/dinero';
import { compararAsiento, sumas } from '../../engine/asientos';
import { Boton, Opcion } from '../../componentes/ui';
import { AsientoVista } from '../../componentes/AsientoVista';
import type { ApiEjercicio } from '../MarcoEjercicio';
import { Operacion, Sumas } from './Operacion';

export function EjDebeHaber({ trans, orden, api }: { trans: Transaccion; orden: LineaAsiento[]; api: ApiEjercicio }) {
  const [lados, setLados] = useState<(Lado | null)[]>(orden.map(() => null));
  const respuesta: LineaAsiento[] = orden.flatMap((l, i) => (lados[i] ? [{ ...l, lado: lados[i]! }] : []));
  const s = sumas(respuesta);

  const comprobar = () =>
    api.comprobar(compararAsiento(trans.asiento.lineas, respuesta, trans.valores), <AsientoVista lineas={trans.asiento.lineas} />);

  return (
    <div>
      <h2 className="mb-3 text-xl font-extrabold">¿Debe o Haber?</h2>
      <Operacion texto={trans.texto} documento={trans.documento} valores={trans.valores} />
      <p className="mb-2 text-sm text-slate-500">Las cuentas y montos ya están. Decide en qué lado va cada una.</p>
      <div className="space-y-2.5">
        {orden.map((l, i) => {
          const ok = lados[i] === l.lado;
          return (
            <div
              key={i}
              className={`flex items-center gap-3 rounded-2xl border-2 bg-white p-3 ${api.bloqueado ? (ok ? 'border-emerald-300' : 'border-rose-300') : 'border-slate-200'}`}
            >
              <div className="min-w-0 flex-1">
                <p className="font-extrabold leading-tight">{cuenta(l.cuentaId).nombre}</p>
                <p className="text-sm tabular-nums text-slate-500">{formatoCLP(l.monto)}</p>
              </div>
              {(['debe', 'haber'] as Lado[]).map((lado) => (
                <Opcion
                  key={lado}
                  className="w-[4.5rem] shrink-0 px-1 sm:w-20"
                  activa={lados[i] === lado}
                  estado={api.bloqueado && lados[i] === lado ? (ok ? 'bien' : 'mal') : null}
                  disabled={api.bloqueado}
                  onClick={() => setLados((xs) => xs.map((x, j) => (j === i ? lado : x)))}
                >
                  {lado === 'debe' ? 'Debe' : 'Haber'}
                </Opcion>
              ))}
            </div>
          );
        })}
      </div>
      <Sumas debe={s.debe} haber={s.haber} />
      {!api.bloqueado && (
        <Boton className="mt-6 w-full" disabled={lados.some((x) => x === null)} onClick={comprobar}>
          Comprobar
        </Boton>
      )}
    </div>
  );
}
