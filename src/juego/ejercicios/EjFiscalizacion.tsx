import { useState } from 'react';
import type { ErrorDetectado } from '../../engine/types';
import type { Afirmacion } from '../../engine/ifrs';
import { Boton } from '../../componentes/ui';
import type { ApiEjercicio } from '../MarcoEjercicio';

/** Jefe del Nivel 4B: identificar las infracciones (NIIF y normativa de la CMF) entre varias situaciones. */
export function EjFiscalizacion({ afirmaciones, api }: { afirmaciones: Afirmacion[]; api: ApiEjercicio }) {
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const nInfracciones = afirmaciones.filter((a) => a.infraccion).length;

  const alternar = (id: string) =>
    setMarcadas((m) => {
      const n = new Set(m);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const comprobar = () => {
    const errores: ErrorDetectado[] = [];
    afirmaciones.forEach((a, i) => {
      if (a.infraccion && !marcadas.has(a.id))
        errores.push({ tipo: 'error_no_detectado', detalle: `Situación N°${i + 1}: ${a.explicacion}`, fuente: a.fuente });
      if (!a.infraccion && marcadas.has(a.id))
        errores.push({ tipo: 'falso_positivo', detalle: `Situación N°${i + 1}: ${a.explicacion}`, fuente: a.fuente });
    });
    api.comprobar({ correcto: errores.length === 0, errores });
  };

  return (
    <div>
      <p className="mb-3 text-sm font-bold text-slate-500">
        Marca con 🚩 las {nInfracciones} infracciones ({marcadas.size}/{nInfracciones} marcadas).
      </p>
      <div className="space-y-3">
        {afirmaciones.map((a, i) => {
          const marcada = marcadas.has(a.id);
          const borde = api.bloqueado
            ? a.infraccion
              ? 'border-rose-400'
              : 'border-emerald-300'
            : marcada
              ? 'border-rose-400 bg-rose-50/40'
              : 'border-slate-200';
          return (
            <div key={a.id} className={`rounded-2xl border-2 bg-white p-3 transition ${borde}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-extrabold uppercase text-slate-400">Situación N°{i + 1}</p>
                  <p className="text-[15px] leading-snug">{a.texto}</p>
                </div>
                {!api.bloqueado && (
                  <button
                    onClick={() => alternar(a.id)}
                    aria-pressed={marcada}
                    aria-label={`Marcar la situación N°${i + 1} como infracción`}
                    className={`shrink-0 rounded-xl border-2 border-b-4 px-3 py-1.5 text-sm font-extrabold ${marcada ? 'border-rose-500 bg-rose-500 text-white' : 'border-slate-200 bg-white text-slate-500'}`}
                  >
                    🚩{marcada ? ' Infracción' : ''}
                  </button>
                )}
              </div>
              {api.bloqueado && (
                <p className={`aparecer mt-2 rounded-xl p-2.5 text-sm ${a.infraccion ? 'bg-rose-50 text-rose-900' : 'bg-emerald-50 text-emerald-900'}`}>
                  <span className="font-extrabold">{a.infraccion ? 'Infracción: ' : 'Correcto: '}</span>
                  {a.explicacion.replace(/^Correcto: /, '')}
                  <span className="block pt-1 text-xs font-bold opacity-70">Fuente: {a.fuente}</span>
                </p>
              )}
            </div>
          );
        })}
      </div>
      {!api.bloqueado && (
        <Boton className="mt-6 w-full" disabled={marcadas.size !== nInfracciones} onClick={comprobar}>
          Entregar respuesta a la CMF
        </Boton>
      )}
    </div>
  );
}
