import { useState } from 'react';
import { validarCalculo, formatearValor, toleranciaDe, type EjercicioCalculo, type PreguntaCalculo } from '../../engine/calculos';
import { Boton } from '../../componentes/ui';
import { CampoMonto } from '../../componentes/CampoMonto';
import { Fila } from '../../componentes/EstadosVista';
import type { ApiEjercicio } from '../MarcoEjercicio';

/** Lee un número con coma decimal ("1,25") o punto. */
function leerDecimal(texto: string): number | null {
  const limpio = texto.replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  if (limpio === '' || limpio === '-') return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

function CampoDecimal({ etiqueta, disabled, onChange, decimales = 0 }: { etiqueta: string; disabled: boolean; onChange: (n: number | null) => void; decimales?: number }) {
  const [texto, setTexto] = useState('');
  return (
    <input
      inputMode="decimal"
      placeholder={decimales > 0 ? `0,${'0'.repeat(decimales)}` : '0'}
      aria-label={etiqueta}
      disabled={disabled}
      value={texto}
      onChange={(e) => {
        setTexto(e.target.value);
        onChange(leerDecimal(e.target.value));
      }}
      className="w-36 rounded-xl border-2 border-sky-200 bg-sky-50 px-2 py-1.5 text-right font-extrabold tabular-nums outline-none focus:border-sky-500"
    />
  );
}

/** Campo según el tipo de pregunta: pesos (con signo) o número con decimales. */
function Campo({ p, valor, onChange, disabled }: { p: PreguntaCalculo; valor: number | null; onChange: (n: number | null) => void; disabled: boolean }) {
  if (p.decimales || p.unidad === 'veces' || p.unidad === 'porcentaje' || p.unidad === 'numero')
    return <CampoDecimal etiqueta={p.etiqueta} disabled={disabled} onChange={onChange} decimales={p.decimales} />;
  return <CampoMonto valor={valor} etiqueta={p.etiqueta} disabled={disabled} onChange={onChange} />;
}

export function FormCalculo({
  datos,
  resp,
  onChange,
  bloqueado,
}: {
  datos: EjercicioCalculo;
  resp: Record<string, number | null>;
  onChange: (r: Record<string, number | null>) => void;
  bloqueado: boolean;
}) {
  return (
    <div className="space-y-4">
      <p className="text-[15px] leading-relaxed">{datos.enunciado}</p>
      <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-amber-50/60 p-4 text-sm">
        <p className="mb-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">📋 Datos</p>
        {datos.datos.map((d) => (
          <Fila key={d.etiqueta} etiqueta={d.etiqueta} valor={<b>{d.valor}</b>} />
        ))}
      </div>
      <div className="rounded-2xl border-2 border-slate-200 bg-white p-4 text-sm">
        <p className="mb-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">✏️ Calcula</p>
        {datos.preguntas.map((p) => {
          const v = resp[p.id] ?? null;
          const ok = v !== null && Math.abs(v - p.valor) <= toleranciaDe(p) + 1e-9;
          return (
            <div key={p.id}>
              <Fila
                etiqueta={<span className="font-bold">{p.etiqueta}</span>}
                valor={<Campo p={p} valor={v} disabled={bloqueado} onChange={(n) => onChange({ ...resp, [p.id]: n })} />}
                clase={bloqueado ? (ok ? 'text-emerald-700' : 'text-rose-700') : ''}
              />
              {bloqueado && !ok && <p className="pb-1 text-right text-xs font-bold text-rose-600">Correcto: {formatearValor(p, p.valor)}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function EjCalculo({ datos, api }: { datos: EjercicioCalculo; api: ApiEjercicio }) {
  const [resp, setResp] = useState<Record<string, number | null>>({});
  const completo = datos.preguntas.every((p) => resp[p.id] !== null && resp[p.id] !== undefined);
  return (
    <div>
      <h2 className="mb-3 text-xl font-extrabold">{datos.titulo}</h2>
      <FormCalculo datos={datos} resp={resp} onChange={setResp} bloqueado={api.bloqueado} />
      {!api.bloqueado && (
        <Boton className="mt-6 w-full" disabled={!completo} onClick={() => api.comprobar(validarCalculo(datos, resp))}>
          Comprobar
        </Boton>
      )}
    </div>
  );
}
