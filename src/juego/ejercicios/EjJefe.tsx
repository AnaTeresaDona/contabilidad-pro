import { useState } from 'react';
import type { EntradaLibro } from '../../engine/libroConErrores';
import type { ErrorDetectado } from '../../engine/types';
import { infoError } from '../../engine/errores';
import { Boton } from '../../componentes/ui';
import { AsientoVista } from '../../componentes/AsientoVista';
import type { ApiEjercicio } from '../MarcoEjercicio';

/** Jefe del Nivel 1: encontrar los asientos con errores en un libro diario. */
export function EjJefe({ libro, api }: { libro: EntradaLibro[]; api: ApiEjercicio }) {
  const [marcados, setMarcados] = useState<Set<number>>(new Set());
  const nErrores = libro.filter((e) => e.corrupto).length;

  const alternar = (i: number) =>
    setMarcados((m) => {
      const n = new Set(m);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  const comprobar = () => {
    const errores: ErrorDetectado[] = [];
    libro.forEach((e, i) => {
      if (e.corrupto && !marcados.has(i)) errores.push({ tipo: 'error_no_detectado', detalle: `Asiento N°${i + 1}: ${e.explicacion}` });
      if (!e.corrupto && marcados.has(i)) errores.push({ tipo: 'falso_positivo', detalle: `El asiento N°${i + 1} estaba bien registrado.` });
    });
    const solucion = (
      <div className="space-y-3">
        {libro.map((e, i) =>
          e.corrupto ? (
            <div key={i}>
              <p className="mb-1 text-sm font-bold">Asiento N°{i + 1} corregido:</p>
              <AsientoVista lineas={e.trans.asiento.lineas} />
            </div>
          ) : null,
        )}
      </div>
    );
    api.comprobar({ correcto: errores.length === 0, errores }, solucion);
  };

  return (
    <div>
      <p className="mb-3 text-sm font-bold text-slate-500">
        Marca con 🚩 los {nErrores} asientos que tienen errores ({marcados.size}/{nErrores} marcados).
      </p>
      <div className="space-y-3">
        {libro.map((e, i) => {
          const marcado = marcados.has(i);
          const borde = api.bloqueado
            ? e.corrupto
              ? 'border-rose-400'
              : 'border-emerald-300'
            : marcado
              ? 'border-rose-400 bg-rose-50/40'
              : 'border-slate-200';
          return (
            <div key={i} className={`rounded-2xl border-2 bg-white p-3 transition ${borde}`}>
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-extrabold uppercase text-slate-400">Asiento N°{i + 1}</p>
                  <p className="text-sm leading-snug">{e.trans.texto}</p>
                </div>
                {!api.bloqueado && (
                  <button
                    onClick={() => alternar(i)}
                    aria-pressed={marcado}
                    aria-label={`Marcar el asiento N°${i + 1} como erróneo`}
                    className={`shrink-0 rounded-xl border-2 border-b-4 px-3 py-1.5 text-sm font-extrabold ${marcado ? 'border-rose-500 bg-rose-500 text-white' : 'border-slate-200 bg-white text-slate-500'}`}
                  >
                    🚩{marcado ? ' Marcado' : ''}
                  </button>
                )}
              </div>
              <AsientoVista lineas={e.mostrado} />
              {api.bloqueado && e.corrupto && (
                <p className="aparecer mt-2 rounded-xl bg-rose-50 p-2.5 text-sm text-rose-900">
                  <span className="font-extrabold">{infoError(e.tipoError ?? '').titulo}: </span>
                  {e.explicacion}
                </p>
              )}
            </div>
          );
        })}
      </div>
      {!api.bloqueado && (
        <Boton className="mt-6 w-full" disabled={marcados.size !== nErrores} onClick={comprobar}>
          Entregar revisión
        </Boton>
      )}
    </div>
  );
}
