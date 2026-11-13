import { useState } from 'react';
import type { EjercicioClasificar } from '../../engine/ejercicios';
import type { ErrorDetectado } from '../../engine/types';
import { Boton, Opcion } from '../../componentes/ui';
import type { ApiEjercicio } from '../MarcoEjercicio';

/** Ejercicio genérico: ubicar cada elemento en una de varias categorías. */
export function EjClasificarOpciones({ datos, api }: { datos: EjercicioClasificar; api: ApiEjercicio }) {
  const [resp, setResp] = useState<Record<string, string>>({});
  const etiqueta = (id: string) => datos.opciones.find((o) => o.id === id)?.etiqueta ?? id;

  const comprobar = () => {
    const errores: ErrorDetectado[] = datos.items
      .filter((it) => resp[it.id] !== it.correcta)
      .map((it) => ({
        tipo: 'clasificacion',
        detalle: `«${it.texto}»: corresponde a ${etiqueta(it.correcta)}, no a ${etiqueta(resp[it.id])}. ${it.explicacion}`,
        fuente: it.fuente,
      }));
    api.comprobar({ correcto: errores.length === 0, errores });
  };

  return (
    <div>
      <h2 className="text-xl font-extrabold">{datos.titulo}</h2>
      <p className="mb-4 text-sm text-slate-500">{datos.instruccion}</p>
      <div className="space-y-3">
        {datos.items.map((it) => {
          const ok = resp[it.id] === it.correcta;
          return (
            <div key={it.id} className={`rounded-2xl border-2 bg-white p-3 ${api.bloqueado ? (ok ? 'border-emerald-300' : 'border-rose-300') : 'border-slate-200'}`}>
              <p className="mb-2 font-bold leading-snug">{it.texto}</p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {datos.opciones.map((o) => (
                  <Opcion
                    key={o.id}
                    className="px-1.5 py-1.5 text-xs"
                    aria-label={`${it.texto}: ${o.etiqueta}`}
                    aria-pressed={resp[it.id] === o.id}
                    activa={resp[it.id] === o.id}
                    estado={api.bloqueado && resp[it.id] === o.id ? (ok ? 'bien' : 'mal') : null}
                    disabled={api.bloqueado}
                    onClick={() => setResp((r) => ({ ...r, [it.id]: o.id }))}
                  >
                    {o.etiqueta}
                  </Opcion>
                ))}
              </div>
              {api.bloqueado && !ok && <p className="mt-2 text-xs text-rose-700">{it.explicacion}</p>}
            </div>
          );
        })}
      </div>
      {!api.bloqueado && (
        <Boton className="mt-6 w-full" disabled={!datos.items.every((it) => resp[it.id])} onClick={comprobar}>
          Comprobar
        </Boton>
      )}
    </div>
  );
}
