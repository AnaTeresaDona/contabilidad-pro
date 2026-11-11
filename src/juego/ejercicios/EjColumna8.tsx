import { useState } from 'react';
import { cuenta, ETIQUETA_TIPO } from '../../engine/cuentas';
import { columnaNatural, ETIQUETA_COLUMNA, naturalezaNormal, type Columna8 } from '../../engine/balance8';
import { Boton, Opcion } from '../../componentes/ui';
import type { ApiEjercicio } from '../MarcoEjercicio';

const COLUMNAS: Columna8[] = ['activo', 'pasivo', 'perdida', 'ganancia'];

export function EjColumna8({ cuentas, api }: { cuentas: string[]; api: ApiEjercicio }) {
  const [elegido, setElegido] = useState<Record<string, Columna8>>({});

  const comprobar = () => {
    const errores = cuentas
      .filter((id) => elegido[id] !== columnaNatural(id))
      .map((id) => {
        const c = cuenta(id);
        return {
          tipo: 'destino_balance',
          detalle: `${c.nombre} es ${ETIQUETA_TIPO[c.tipo]} con saldo ${naturalezaNormal(id)}: va a la columna ${ETIQUETA_COLUMNA[columnaNatural(id)]}, no a ${ETIQUETA_COLUMNA[elegido[id]]}.`,
        };
      });
    api.comprobar({ correcto: errores.length === 0, errores });
  };

  return (
    <div>
      <h2 className="text-xl font-extrabold">¿En qué columna va cada saldo?</h2>
      <p className="mb-4 text-sm text-slate-500">
        En el Balance de 8 columnas, cada saldo termina en <b>Inventario</b> (Activo | Pasivo) o en <b>Resultados</b> (Pérdidas | Ganancias).
      </p>
      <div className="space-y-3">
        {cuentas.map((id) => {
          const ok = elegido[id] === columnaNatural(id);
          return (
            <div
              key={id}
              className={`rounded-2xl border-2 bg-white p-3 ${api.bloqueado ? (ok ? 'border-emerald-300' : 'border-rose-300') : 'border-slate-200'}`}
            >
              <p className="font-extrabold">{cuenta(id).nombre}</p>
              <p className="mb-2 text-xs font-bold text-slate-400">Saldo {naturalezaNormal(id)}</p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {COLUMNAS.map((col) => (
                  <Opcion
                    key={col}
                    className="px-2 py-1.5 text-xs"
                    activa={elegido[id] === col}
                    estado={api.bloqueado && elegido[id] === col ? (ok ? 'bien' : 'mal') : null}
                    disabled={api.bloqueado}
                    onClick={() => setElegido((e) => ({ ...e, [id]: col }))}
                  >
                    {col === 'activo' || col === 'pasivo' ? 'Inv. · ' : 'Res. · '}
                    {ETIQUETA_COLUMNA[col]}
                  </Opcion>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {!api.bloqueado && (
        <Boton className="mt-6 w-full" disabled={!cuentas.every((id) => elegido[id])} onClick={comprobar}>
          Comprobar
        </Boton>
      )}
    </div>
  );
}
