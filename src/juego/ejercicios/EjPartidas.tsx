import { useState } from 'react';
import { formatoCLP } from '../../engine/dinero';
import {
  ETIQUETA_AJUSTE,
  TASA_PRIMERA_CATEGORIA,
  validarClasificacionPartidas,
  validarOperacionRenta,
  type AjusteRLI,
  type DatosOperacionRenta,
  type Partida,
} from '../../engine/tributario';
import { Boton, Opcion } from '../../componentes/ui';
import { CampoMonto } from '../../componentes/CampoMonto';
import { Fila } from '../../componentes/EstadosVista';
import type { ApiEjercicio } from '../MarcoEjercicio';

const AJUSTES: AjusteRLI[] = ['agregado', 'deduccion', 'sin_ajuste'];
type Resp = Record<string, AjusteRLI | null>;

/** Lista de partidas para marcar como agregado, deducción o sin ajuste. */
function FormPartidas({ partidas, resp, onChange, bloqueado }: { partidas: Partida[]; resp: Resp; onChange: (r: Resp) => void; bloqueado: boolean }) {
  return (
    <div className="space-y-3">
      {partidas.map((p) => {
        const ok = resp[p.id] === p.tipo;
        return (
          <div key={p.id} className={`rounded-2xl border-2 bg-white p-3 ${bloqueado ? (ok ? 'border-emerald-300' : 'border-rose-300') : 'border-slate-200'}`}>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="font-bold leading-snug">{p.texto}</p>
              <p className="text-sm font-bold tabular-nums text-slate-500">{formatoCLP(p.monto)}</p>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {AJUSTES.map((a) => (
                <Opcion
                  key={a}
                  className="px-1.5 py-1.5 text-xs"
                  aria-label={`${p.texto}: ${ETIQUETA_AJUSTE[a]}`}
                  aria-pressed={resp[p.id] === a}
                  activa={resp[p.id] === a}
                  estado={bloqueado && resp[p.id] === a ? (ok ? 'bien' : 'mal') : null}
                  disabled={bloqueado}
                  onClick={() => onChange({ ...resp, [p.id]: a })}
                >
                  {ETIQUETA_AJUSTE[a]}
                </Opcion>
              ))}
            </div>
            {bloqueado && !ok && <p className="mt-2 text-xs text-rose-700">{p.explicacion}</p>}
          </div>
        );
      })}
    </div>
  );
}

export function EjClasificarPartidas({ partidas, api }: { partidas: Partida[]; api: ApiEjercicio }) {
  const [resp, setResp] = useState<Resp>({});
  const comprobar = () => {
    const errores = validarClasificacionPartidas(partidas, resp);
    api.comprobar({ correcto: errores.length === 0, errores });
  };
  return (
    <div>
      <h2 className="text-xl font-extrabold">¿Cómo afecta cada partida a la RLI?</h2>
      <p className="mb-4 text-sm text-slate-500">
        Partiendo del resultado contable, decide si cada partida se <b>agrega</b>, se <b>deduce</b> o queda <b>sin ajuste</b> para llegar a la RLI.
      </p>
      <FormPartidas partidas={partidas} resp={resp} onChange={setResp} bloqueado={api.bloqueado} />
      {!api.bloqueado && (
        <Boton className="mt-6 w-full" disabled={!partidas.every((p) => resp[p.id])} onClick={comprobar}>
          Comprobar
        </Boton>
      )}
    </div>
  );
}

/** Jefe del Nivel 5: clasificar las partidas y completar el cálculo del F22. */
export function EjOperacionRenta({ datos, api }: { datos: DatosOperacionRenta; api: ApiEjercicio }) {
  const [resp, setResp] = useState<Resp>({});
  const [rli, setRli] = useState<number | null>(null);
  const [impuesto, setImpuesto] = useState<number | null>(null);
  const [saldo, setSaldo] = useState<number | null>(null);
  const tasa = `${Math.round(TASA_PRIMERA_CATEGORIA * 100)}%`;
  const completo = datos.partidas.every((p) => resp[p.id]) && rli !== null && impuesto !== null && saldo !== null;

  const comprobar = () =>
    api.comprobar(
      validarOperacionRenta(datos, { clasificacion: resp, rli, impuesto, saldo }),
      <div className="rounded-2xl border-2 border-slate-200 bg-white p-4 text-sm">
        <Fila etiqueta="Resultado contable antes de impuesto" valor={formatoCLP(datos.resultadoContable)} />
        {datos.partidas
          .filter((p) => p.tipo !== 'sin_ajuste')
          .map((p) => (
            <Fila key={p.id} etiqueta={`${p.tipo === 'agregado' ? '+' : '−'} ${p.texto}`} valor={formatoCLP(p.monto)} sangria />
          ))}
        <Fila etiqueta="Renta Líquida Imponible" valor={formatoCLP(datos.rli)} fuerte clase="border-t border-slate-200" />
        <Fila etiqueta={`Impuesto de Primera Categoría (${tasa})`} valor={formatoCLP(datos.impuesto)} />
        <Fila etiqueta="− PPM pagados" valor={formatoCLP(datos.ppm)} />
        <Fila etiqueta={datos.saldo < 0 ? 'Devolución' : 'Saldo a pagar'} valor={formatoCLP(datos.saldo)} fuerte clase="border-t-2 border-slate-400" />
      </div>,
    );

  return (
    <div>
      <div className="mb-4 rounded-2xl border-2 border-dashed border-slate-300 bg-amber-50/60 p-4 text-sm">
        <p className="mb-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">📋 Datos del año</p>
        <Fila etiqueta="Resultado contable antes de impuesto" valor={<b>{formatoCLP(datos.resultadoContable)}</b>} />
        <Fila etiqueta="Tasa del Impuesto de Primera Categoría" valor={<b>{tasa}</b>} />
        <Fila etiqueta="PPM pagados durante el año" valor={<b>{formatoCLP(datos.ppm)}</b>} />
      </div>

      <h3 className="mb-2 font-extrabold">Parte 1 · Revisa las partidas</h3>
      <FormPartidas partidas={datos.partidas} resp={resp} onChange={setResp} bloqueado={api.bloqueado} />

      <h3 className="mb-2 mt-6 font-extrabold">Parte 2 · Formulario 22</h3>
      <div className="rounded-2xl border-2 border-slate-200 bg-white p-4 text-sm">
        <Fila etiqueta={<b>Renta Líquida Imponible</b>} valor={<CampoMonto valor={rli} etiqueta="Renta Líquida Imponible" disabled={api.bloqueado} onChange={setRli} />} />
        <Fila
          etiqueta={<b>Impuesto de Primera Categoría</b>}
          valor={<CampoMonto valor={impuesto} etiqueta="Impuesto de Primera Categoría" disabled={api.bloqueado} onChange={setImpuesto} />}
        />
        <Fila
          etiqueta={<b>Saldo a pagar (negativo = devolución)</b>}
          valor={<CampoMonto valor={saldo} etiqueta="Saldo a pagar" disabled={api.bloqueado} onChange={setSaldo} />}
        />
      </div>

      {!api.bloqueado && (
        <Boton className="mt-6 w-full" disabled={!completo} onClick={comprobar}>
          Presentar el Formulario 22
        </Boton>
      )}
    </div>
  );
}
