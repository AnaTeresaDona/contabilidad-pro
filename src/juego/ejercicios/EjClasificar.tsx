import { useState } from 'react';
import type { TipoCuenta } from '../../engine/types';
import { cuenta, ETIQUETA_TIPO } from '../../engine/cuentas';
import { Boton, Opcion } from '../../componentes/ui';
import type { ApiEjercicio } from '../MarcoEjercicio';

const TIPOS: TipoCuenta[] = ['activo', 'pasivo', 'patrimonio', 'ingreso', 'gasto'];

export function EjClasificar({ cuentas, api }: { cuentas: string[]; api: ApiEjercicio }) {
  const [elegido, setElegido] = useState<Record<string, TipoCuenta>>({});
  const listo = cuentas.every((id) => elegido[id]);

  const comprobar = () => {
    const errores = cuentas
      .filter((id) => elegido[id] !== cuenta(id).tipo)
      .map((id) => {
        const c = cuenta(id);
        return {
          tipo: 'clasificacion',
          detalle: `${c.nombre} es ${ETIQUETA_TIPO[c.tipo]}, no ${ETIQUETA_TIPO[elegido[id]]}. ${c.descripcion}`,
        };
      });
    api.comprobar({ correcto: errores.length === 0, errores });
  };

  return (
    <div>
      <h2 className="text-xl font-extrabold">Clasifica estas cuentas</h2>
      <p className="mb-4 text-sm text-slate-500">¿Es algo que la empresa tiene, debe, aportaron los dueños, ganó o gastó?</p>
      <div className="space-y-3">
        {cuentas.map((id) => {
          const c = cuenta(id);
          const ok = elegido[id] === c.tipo;
          return (
            <div
              key={id}
              className={`rounded-2xl border-2 bg-white p-3 ${api.bloqueado ? (ok ? 'border-emerald-300' : 'border-rose-300') : 'border-slate-200'}`}
            >
              <p className="mb-2 font-extrabold">{c.nombre}</p>
              <div className="flex flex-wrap gap-1.5">
                {TIPOS.map((t) => (
                  <Opcion
                    key={t}
                    className="px-2.5 py-1.5 text-xs"
                    activa={elegido[id] === t}
                    estado={api.bloqueado && elegido[id] === t ? (ok ? 'bien' : 'mal') : null}
                    disabled={api.bloqueado}
                    onClick={() => setElegido((e) => ({ ...e, [id]: t }))}
                  >
                    {ETIQUETA_TIPO[t]}
                  </Opcion>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {!api.bloqueado && (
        <Boton className="mt-6 w-full" disabled={!listo} onClick={comprobar}>
          Comprobar
        </Boton>
      )}
    </div>
  );
}
