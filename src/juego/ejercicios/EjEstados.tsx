import { useMemo, useState } from 'react';
import type { Asiento, ErrorDetectado } from '../../engine/types';
import type { Balance8 } from '../../engine/balance8';
import { cuenta } from '../../engine/cuentas';
import { formatoCLP, leerMontoConSigno } from '../../engine/dinero';
import {
  construirBG,
  construirEERR,
  ETIQUETA_SECCION,
  SECCIONES_BG,
  seccionDe,
  seccionesVacias,
  validarBG,
  validarEERR,
  type BalanceGeneral,
  type EstadoResultados,
  type RespuestaEERR,
  type Seccion,
  type SeccionBG,
} from '../../engine/estados';
import { Boton, Opcion } from '../../componentes/ui';
import { BalanceGeneralVista, EstadoResultadosVista, Fila, nombreLinea, seccionesConResultado } from '../../componentes/EstadosVista';
import { PestanasBalance, TablaBalance } from '../../componentes/TablaBalance';
import type { ApiEjercicio } from '../MarcoEjercicio';

// ───────────── Campo de monto que acepta negativos ─────────────

function textoMonto(n: number | null): string {
  if (n === null) return '';
  if (Object.is(n, -0)) return '-';
  const s = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return n < 0 ? `-${s}` : s;
}

function CampoMonto({ valor, onChange, etiqueta, disabled }: { valor: number | null; onChange: (n: number | null) => void; etiqueta: string; disabled: boolean }) {
  return (
    <label className="flex w-36 items-center rounded-xl border-2 border-sky-200 bg-sky-50 px-2 focus-within:border-sky-500">
      <span className="text-xs font-bold text-slate-400">$</span>
      <input
        inputMode="text"
        placeholder="0"
        aria-label={etiqueta}
        disabled={disabled}
        value={textoMonto(valor)}
        onChange={(e) => onChange(leerMontoConSigno(e.target.value))}
        className="w-full bg-transparent px-1 py-1.5 text-right font-extrabold tabular-nums outline-none"
      />
    </label>
  );
}

// ───────────── Estado de Resultados ─────────────

const RESP_EERR_VACIA: RespuestaEERR = { margenBruto: null, resultadoOperacional: null, resultadoAntesImpuesto: null };
const completoEERR = (r: RespuestaEERR) => r.margenBruto !== null && r.resultadoOperacional !== null && r.resultadoAntesImpuesto !== null;

function FormEERR({ e, r, onChange, bloqueado }: { e: EstadoResultados; r: RespuestaEERR; onChange: (r: RespuestaEERR) => void; bloqueado: boolean }) {
  const campo = (k: keyof RespuestaEERR, nombre: string) => (
    <Fila
      etiqueta={<span className="font-extrabold">= {nombre}</span>}
      valor={<CampoMonto valor={r[k]} etiqueta={nombre} disabled={bloqueado} onChange={(n) => onChange({ ...r, [k]: n })} />}
      clase={`border-t border-slate-200 ${bloqueado ? (r[k] === e[k] ? 'text-emerald-700' : 'text-rose-700') : ''}`}
    />
  );
  const menos = (n: number) => `−${formatoCLP(n)}`;
  const hayNoOperacional = e.otrosIngresos.length + e.otrosGastos.length > 0;
  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-white p-4 text-sm">
      <p className="mb-2 text-center font-extrabold uppercase tracking-wide text-slate-500">Estado de Resultados del mes</p>
      {e.ventas.map((l) => (
        <Fila key={l.cuentaId} etiqueta={`Ingresos por ${nombreLinea(l.cuentaId).toLowerCase()}`} valor={formatoCLP(l.monto)} />
      ))}
      {e.costo.map((l) => (
        <Fila key={l.cuentaId} etiqueta={nombreLinea(l.cuentaId)} valor={menos(l.monto)} />
      ))}
      {campo('margenBruto', 'Margen bruto')}
      <p className="pt-2 text-xs font-bold text-slate-400">Gastos de administración y ventas</p>
      {e.gastosOperacionales.length === 0 && <p className="pl-3 text-xs text-slate-400">Sin gastos este mes</p>}
      {e.gastosOperacionales.map((l) => (
        <Fila key={l.cuentaId} etiqueta={nombreLinea(l.cuentaId)} valor={menos(l.monto)} sangria />
      ))}
      {campo('resultadoOperacional', 'Resultado operacional')}
      <p className="pt-2 text-xs font-bold text-slate-400">Partidas no operacionales</p>
      {!hayNoOperacional && <p className="pl-3 text-xs text-slate-400">Sin partidas no operacionales este mes</p>}
      {e.otrosIngresos.map((l) => (
        <Fila key={l.cuentaId} etiqueta={nombreLinea(l.cuentaId)} valor={formatoCLP(l.monto)} sangria />
      ))}
      {e.otrosGastos.map((l) => (
        <Fila key={l.cuentaId} etiqueta={nombreLinea(l.cuentaId)} valor={menos(l.monto)} sangria />
      ))}
      {campo('resultadoAntesImpuesto', 'Resultado antes de impuesto')}
      <p className="mt-2 text-xs text-slate-400">Si un resultado es pérdida, escríbelo con signo menos (ej: -150.000). El impuesto a la renta lo verás en el Nivel 5.</p>
    </div>
  );
}

// ───────────── Balance General ─────────────

type RespBG = Record<string, SeccionBG | null>;

function lineasBG(bg: BalanceGeneral) {
  return [...SECCIONES_BG.flatMap((s) => bg.secciones[s]), { cuentaId: 'resultado', monto: bg.resultado }];
}

const ETIQUETA_CORTA: Record<SeccionBG, string> = {
  activo_corriente: 'Activo corr.',
  activo_no_corriente: 'Activo no corr.',
  pasivo_corriente: 'Pasivo corr.',
  pasivo_no_corriente: 'Pasivo no corr.',
  patrimonio: 'Patrimonio',
};

function FormBG({ bg, r, onChange, bloqueado }: { bg: BalanceGeneral; r: RespBG; onChange: (r: RespBG) => void; bloqueado: boolean }) {
  const lineas = useMemo(() => lineasBG(bg), [bg]);
  const correcta = (id: string): SeccionBG => (id === 'resultado' ? 'patrimonio' : (seccionDe(id) as SeccionBG));
  const armado = seccionesVacias();
  for (const l of lineas) {
    const s = r[l.cuentaId];
    if (s) armado[s].push(l);
  }
  return (
    <div>
      <div className="space-y-2.5">
        {lineas.map((l) => {
          const ok = r[l.cuentaId] === correcta(l.cuentaId);
          return (
            <div
              key={l.cuentaId}
              className={`rounded-2xl border-2 bg-white p-3 ${bloqueado ? (ok ? 'border-emerald-300' : 'border-rose-300') : l.cuentaId === 'resultado' ? 'border-amber-300' : 'border-slate-200'}`}
            >
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="font-extrabold">{nombreLinea(l.cuentaId)}</p>
                <p className="text-sm font-bold tabular-nums text-slate-500">{formatoCLP(l.monto)}</p>
              </div>
              <div className="grid grid-cols-2 gap-1.5 min-[420px]:grid-cols-3 sm:grid-cols-5">
                {SECCIONES_BG.map((s) => (
                  <Opcion
                    key={s}
                    className="px-1.5 py-1.5 text-xs"
                    aria-label={`${nombreLinea(l.cuentaId)}: ${ETIQUETA_SECCION[s]}`}
                    aria-pressed={r[l.cuentaId] === s}
                    activa={r[l.cuentaId] === s}
                    estado={bloqueado && r[l.cuentaId] === s ? (ok ? 'bien' : 'mal') : null}
                    disabled={bloqueado}
                    onClick={() => onChange({ ...r, [l.cuentaId]: s })}
                  >
                    {ETIQUETA_CORTA[s]}
                  </Opcion>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <h3 className="mb-2 mt-5 font-extrabold">Tu Balance General</h3>
      <p className="mb-2 text-xs text-slate-500">Se arma solo con lo que eliges. Revisa que Activo = Pasivo + Patrimonio.</p>
      <BalanceGeneralVista secciones={armado} />
    </div>
  );
}

const completoBG = (bg: BalanceGeneral, r: RespBG) => lineasBG(bg).every((l) => r[l.cuentaId]);

// ───────────── Ejercicios ─────────────

export function EjEstadoResultados({ balance, api }: { balance: Balance8; api: ApiEjercicio }) {
  const e = useMemo(() => construirEERR(balance.filas), [balance]);
  const [r, setR] = useState<RespuestaEERR>(RESP_EERR_VACIA);
  return (
    <div>
      <h2 className="text-xl font-extrabold">Calcula el Estado de Resultados</h2>
      <p className="mb-4 text-sm text-slate-500">Las cuentas ya están ordenadas. Calcula los tres subtotales, de arriba hacia abajo.</p>
      <FormEERR e={e} r={r} onChange={setR} bloqueado={api.bloqueado} />
      {!api.bloqueado && (
        <Boton className="mt-6 w-full" disabled={!completoEERR(r)} onClick={() => api.comprobar(validarEERR(e, r), <EstadoResultadosVista e={e} />)}>
          Comprobar
        </Boton>
      )}
    </div>
  );
}

export function EjBalanceGeneral({ balance, api }: { balance: Balance8; api: ApiEjercicio }) {
  const bg = useMemo(() => construirBG(balance.filas), [balance]);
  const [r, setR] = useState<RespBG>({});
  return (
    <div>
      <h2 className="text-xl font-extrabold">Arma el Balance General</h2>
      <p className="mb-4 text-sm text-slate-500">Ubica cada saldo en su sección. Corriente = dentro de 12 meses; no corriente = más de 12 meses.</p>
      <FormBG bg={bg} r={r} onChange={setR} bloqueado={api.bloqueado} />
      {!api.bloqueado && (
        <Boton
          className="mt-6 w-full"
          disabled={!completoBG(bg, r)}
          onClick={() => api.comprobar(validarBG(bg, r), <BalanceGeneralVista secciones={seccionesConResultado(bg.secciones, bg.resultado)} />)}
        >
          Comprobar
        </Boton>
      )}
    </div>
  );
}

/** Jefe del Nivel 3: ambos estados a partir del mismo mes. */
export function EjEstadosCompletos({ asientos, balance, api }: { asientos: Asiento[]; balance: Balance8; api: ApiEjercicio }) {
  const e = useMemo(() => construirEERR(balance.filas), [balance]);
  const bg = useMemo(() => construirBG(balance.filas), [balance]);
  const [rE, setRE] = useState<RespuestaEERR>(RESP_EERR_VACIA);
  const [rB, setRB] = useState<RespBG>({});

  const comprobar = () => {
    const a = validarEERR(e, rE);
    const b = validarBG(bg, rB);
    const errores: ErrorDetectado[] = [...a.errores, ...b.errores];
    api.comprobar(
      { correcto: errores.length === 0, errores },
      <div className="space-y-3">
        <EstadoResultadosVista e={e} />
        <BalanceGeneralVista secciones={seccionesConResultado(bg.secciones, bg.resultado)} />
      </div>,
    );
  };

  return (
    <div>
      <details className="mb-4 rounded-2xl border-2 border-slate-200 bg-white p-3">
        <summary className="cursor-pointer font-extrabold text-slate-600">📊 Ver la hoja de trabajo: Balance de 8 columnas ({asientos.length} asientos)</summary>
        <div className="mt-3">
          <div className="sm:hidden">
            <PestanasBalance filas={balance.filas} resultado={balance.resultado} />
          </div>
          <div className="hidden sm:block">
            <TablaBalance filas={balance.filas} resultado={balance.resultado} />
          </div>
        </div>
      </details>

      <h3 className="mb-2 font-extrabold">Parte 1 · Estado de Resultados</h3>
      <FormEERR e={e} r={rE} onChange={setRE} bloqueado={api.bloqueado} />

      <h3 className="mb-2 mt-6 font-extrabold">Parte 2 · Balance General clasificado</h3>
      <FormBG bg={bg} r={rB} onChange={setRB} bloqueado={api.bloqueado} />

      {!api.bloqueado && (
        <Boton className="mt-6 w-full" disabled={!completoEERR(rE) || !completoBG(bg, rB)} onClick={comprobar}>
          Entregar informe
        </Boton>
      )}
    </div>
  );
}

const SECCIONES_TODAS: Seccion[] = [...SECCIONES_BG, 'resultados'];

/** Ubicar cuentas en la sección de los estados financieros donde se presentan. */
export function EjSecciones({ cuentas, api }: { cuentas: string[]; api: ApiEjercicio }) {
  const [elegido, setElegido] = useState<Record<string, Seccion>>({});

  const comprobar = () => {
    const errores = cuentas
      .filter((id) => elegido[id] !== seccionDe(id))
      .map((id) => {
        const s = seccionDe(id);
        return {
          tipo: 'seccion_balance',
          detalle: `${cuenta(id).nombre} va en ${ETIQUETA_SECCION[s]}${s === 'resultados' ? ' (no aparece en el Balance General)' : ''}, no en ${ETIQUETA_SECCION[elegido[id]]}. ${cuenta(id).descripcion}`,
        };
      });
    api.comprobar({ correcto: errores.length === 0, errores });
  };

  return (
    <div>
      <h2 className="text-xl font-extrabold">¿Dónde se presenta cada cuenta?</h2>
      <p className="mb-4 text-sm text-slate-500">Balance General (corriente o no corriente) o Estado de Resultados.</p>
      <div className="space-y-3">
        {cuentas.map((id) => {
          const ok = elegido[id] === seccionDe(id);
          return (
            <div key={id} className={`rounded-2xl border-2 bg-white p-3 ${api.bloqueado ? (ok ? 'border-emerald-300' : 'border-rose-300') : 'border-slate-200'}`}>
              <p className="mb-2 font-extrabold">{cuenta(id).nombre}</p>
              <div className="grid grid-cols-2 gap-1.5 min-[420px]:grid-cols-3">
                {SECCIONES_TODAS.map((s) => (
                  <Opcion
                    key={s}
                    className="px-1.5 py-1.5 text-xs"
                    aria-label={`${cuenta(id).nombre}: ${ETIQUETA_SECCION[s]}`}
                    aria-pressed={elegido[id] === s}
                    activa={elegido[id] === s}
                    estado={api.bloqueado && elegido[id] === s ? (ok ? 'bien' : 'mal') : null}
                    disabled={api.bloqueado}
                    onClick={() => setElegido((e) => ({ ...e, [id]: s }))}
                  >
                    {s === 'resultados' ? 'Est. Resultados' : ETIQUETA_CORTA[s]}
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
