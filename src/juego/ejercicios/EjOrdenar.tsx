import { useState } from 'react';
import { validarOrden, type EjercicioOrdenar } from '../../engine/ordenar';
import { Boton } from '../../componentes/ui';
import type { ApiEjercicio } from '../MarcoEjercicio';

/**
 * Ordenar tocando, pensado para el celular (sin arrastrar): cada toque agrega el elemento
 * al final de "Tu orden". Tocar dos elementos ya puestos los intercambia; ✕ lo devuelve.
 */
export function EjOrdenar({ datos, api }: { datos: EjercicioOrdenar; api: ApiEjercicio }) {
  const [orden, setOrden] = useState<string[]>([]);
  const [marcado, setMarcado] = useState<string | null>(null);
  const item = (id: string) => datos.items.find((i) => i.id === id)!;
  const quedan = datos.mezcla.filter((id) => !orden.includes(id));

  const comprobar = () => {
    setMarcado(null);
    api.comprobar(validarOrden(datos, orden));
  };

  /** Primer toque marca; el segundo, en otro elemento, los intercambia. */
  const tocarPuesto = (id: string) => {
    if (!marcado || marcado === id) return setMarcado(marcado === id ? null : id);
    setOrden((o) => o.map((x) => (x === id ? marcado : x === marcado ? id : x)));
    setMarcado(null);
  };
  const quitar = (id: string) => {
    setOrden((o) => o.filter((x) => x !== id));
    if (marcado === id) setMarcado(null);
  };

  return (
    <div>
      <h2 className="text-xl font-extrabold">{datos.titulo}</h2>
      <p className="mb-4 text-sm text-slate-500">{datos.instruccion}</p>

      <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Tu orden</p>
      <ol className="min-h-16 space-y-1.5 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-2">
        {orden.length === 0 && <li className="p-2 text-sm text-slate-400">Toca abajo el primer elemento…</li>}
        {orden.map((id, i) => {
          const it = item(id);
          const ok = datos.items[i]?.id === id;
          return (
            <li key={id} className="flex gap-1.5">
              <button
                disabled={api.bloqueado}
                onClick={() => tocarPuesto(id)}
                aria-pressed={marcado === id}
                aria-label={`Posición ${i + 1}: ${it.texto}. Tocar para intercambiar`}
                className={`flex flex-1 items-center gap-2 rounded-xl border-2 px-3 py-2 text-left text-sm ${
                  api.bloqueado
                    ? ok
                      ? 'border-emerald-300 bg-emerald-50'
                      : 'border-rose-300 bg-rose-50'
                    : marcado === id
                      ? 'border-amber-400 bg-amber-50'
                      : 'border-sky-200 bg-white active:bg-sky-50'
                } ${it.encabezado ? 'font-extrabold uppercase tracking-wide' : 'pl-6 font-bold'}`}
              >
                <span className="w-5 shrink-0 text-xs font-extrabold text-slate-400">{i + 1}</span>
                <span className="flex-1">{it.texto}</span>
                {api.bloqueado && <span>{ok ? '✓' : '✗'}</span>}
              </button>
              {!api.bloqueado && (
                <button
                  onClick={() => quitar(id)}
                  aria-label={`Quitar ${it.texto}`}
                  className="w-10 shrink-0 rounded-xl border-2 border-slate-200 bg-white text-slate-400 active:bg-slate-100"
                >
                  ✕
                </button>
              )}
            </li>
          );
        })}
      </ol>

      {!api.bloqueado && orden.length > 1 && (
        <p className="mt-1.5 text-xs text-slate-500">
          {marcado ? 'Ahora toca el elemento con el que quieres intercambiarlo.' : 'Para corregir: toca dos elementos de tu lista y se intercambian.'}
        </p>
      )}

      {!api.bloqueado && quedan.length > 0 && (
        <>
          <p className="mb-1.5 mt-4 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Elige el siguiente</p>
          <div className="flex flex-wrap gap-2">
            {quedan.map((id) => {
              const it = item(id);
              return (
                <button
                  key={id}
                  onClick={() => setOrden((o) => [...o, id])}
                  className={`rounded-xl border-2 border-b-4 border-slate-200 bg-white px-3 py-2 text-sm transition active:translate-y-[2px] ${it.encabezado ? 'font-extrabold uppercase' : 'font-bold'}`}
                >
                  {it.texto}
                </button>
              );
            })}
          </div>
        </>
      )}

      {api.bloqueado && orden.some((id, i) => datos.items[i]?.id !== id) && (
        <div className="mt-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-3 text-sm">
          <p className="mb-1 font-extrabold text-emerald-800">El orden correcto</p>
          <ol className="list-decimal space-y-0.5 pl-5">
            {datos.items.map((it) => (
              <li key={it.id} className={it.encabezado ? 'font-extrabold' : 'pl-2'}>
                {it.texto}
              </li>
            ))}
          </ol>
        </div>
      )}

      {!api.bloqueado && (
        <div className="mt-6 flex gap-2">
          <Boton
            variante="secundario"
            disabled={orden.length === 0}
            onClick={() => {
              setOrden([]);
              setMarcado(null);
            }}
          >
            Borrar
          </Boton>
          <Boton className="flex-1" disabled={quedan.length > 0} onClick={comprobar}>
            Comprobar
          </Boton>
        </div>
      )}
    </div>
  );
}
