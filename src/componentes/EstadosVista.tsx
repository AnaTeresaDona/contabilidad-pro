import type { ReactNode } from 'react';
import { cuenta } from '../engine/cuentas';
import { formatoCLP } from '../engine/dinero';
import { calcularTotalesBG, type EstadoResultados, type LineaEstado, type SeccionBG } from '../engine/estados';

/** Nombre de una línea de estado. "resultado" es la línea del resultado del ejercicio. */
export function nombreLinea(id: string): string {
  return id === 'resultado' ? 'Resultado del ejercicio' : cuenta(id).nombre;
}

export function Fila({ etiqueta, valor, fuerte, sangria, clase = '' }: { etiqueta: ReactNode; valor: ReactNode; fuerte?: boolean; sangria?: boolean; clase?: string }) {
  return (
    <div className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 py-1 ${fuerte ? 'font-extrabold' : ''} ${clase}`}>
      <span className={`min-w-0 break-words leading-snug ${sangria ? 'pl-3 text-slate-600' : ''}`}>{etiqueta}</span>
      <span className="text-right tabular-nums">{valor}</span>
    </div>
  );
}

const menos = (n: number) => (n === 0 ? formatoCLP(0) : `−${formatoCLP(n)}`);

export function EstadoResultadosVista({ e, titulo = 'Estado de Resultados' }: { e: EstadoResultados; titulo?: string }) {
  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-white p-4 text-sm">
      <p className="mb-2 text-center font-extrabold uppercase tracking-wide text-slate-500">{titulo}</p>
      {e.ventas.map((l) => (
        <Fila key={l.cuentaId} etiqueta={`Ingresos por ${nombreLinea(l.cuentaId).toLowerCase()}`} valor={formatoCLP(l.monto)} />
      ))}
      {e.costo.map((l) => (
        <Fila key={l.cuentaId} etiqueta={nombreLinea(l.cuentaId)} valor={menos(l.monto)} />
      ))}
      <Fila etiqueta="Margen bruto" valor={formatoCLP(e.margenBruto)} fuerte clase="border-t border-slate-200" />
      <p className="pt-2 text-xs font-bold text-slate-400">Gastos de administración y ventas</p>
      {e.gastosOperacionales.map((l) => (
        <Fila key={l.cuentaId} etiqueta={nombreLinea(l.cuentaId)} valor={menos(l.monto)} sangria />
      ))}
      <Fila etiqueta="Resultado operacional" valor={formatoCLP(e.resultadoOperacional)} fuerte clase="border-t border-slate-200" />
      {e.otrosIngresos.map((l) => (
        <Fila key={l.cuentaId} etiqueta={nombreLinea(l.cuentaId)} valor={formatoCLP(l.monto)} sangria />
      ))}
      {e.otrosGastos.map((l) => (
        <Fila key={l.cuentaId} etiqueta={nombreLinea(l.cuentaId)} valor={menos(l.monto)} sangria />
      ))}
      <Fila
        etiqueta="Resultado antes de impuesto"
        valor={formatoCLP(e.resultadoAntesImpuesto)}
        fuerte
        clase={`border-t-2 border-slate-400 ${e.resultadoAntesImpuesto >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}
      />
      {e.impuestos.length > 0 && (
        <>
          {e.impuestos.map((l) => (
            <Fila key={l.cuentaId} etiqueta={nombreLinea(l.cuentaId)} valor={menos(l.monto)} sangria />
          ))}
          <Fila
            etiqueta="Resultado del ejercicio"
            valor={formatoCLP(e.resultadoEjercicio)}
            fuerte
            clase={`border-t-2 border-slate-400 ${e.resultadoEjercicio >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}
          />
        </>
      )}
    </div>
  );
}

export function BalanceGeneralVista({ secciones, titulo = 'Balance General' }: { secciones: Record<SeccionBG, LineaEstado[]>; titulo?: string }) {
  const t = calcularTotalesBG(secciones, 0);
  const cuadra = t.totalActivos === t.totalPasivoPatrimonio && t.totalActivos !== 0;
  const bloque = (s: SeccionBG, nombre: string, total: number) => (
    <div className="mb-2">
      <p className="text-xs font-bold text-slate-400">{nombre}</p>
      {secciones[s].map((l) => (
        <Fila key={l.cuentaId} etiqueta={nombreLinea(l.cuentaId)} valor={formatoCLP(l.monto)} sangria />
      ))}
      <Fila etiqueta={`Total ${nombre.toLowerCase()}`} valor={formatoCLP(total)} fuerte clase="border-t border-slate-200" />
    </div>
  );
  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-white p-4 text-sm">
      <p className="mb-3 text-center font-extrabold uppercase tracking-wide text-slate-500">{titulo}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1 font-extrabold text-sky-700">Activos</p>
          {bloque('activo_corriente', 'Activo corriente', t.activoCorriente)}
          {bloque('activo_no_corriente', 'Activo no corriente', t.activoNoCorriente)}
          <Fila etiqueta="TOTAL ACTIVOS" valor={formatoCLP(t.totalActivos)} fuerte clase="border-t-2 border-slate-400" />
        </div>
        <div>
          <p className="mb-1 font-extrabold text-violet-700">Pasivos y Patrimonio</p>
          {bloque('pasivo_corriente', 'Pasivo corriente', t.pasivoCorriente)}
          {bloque('pasivo_no_corriente', 'Pasivo no corriente', t.pasivoNoCorriente)}
          {bloque('patrimonio', 'Patrimonio', t.patrimonio)}
          <Fila etiqueta="TOTAL PASIVOS Y PATRIMONIO" valor={formatoCLP(t.totalPasivoPatrimonio)} fuerte clase="border-t-2 border-slate-400" />
        </div>
      </div>
      <p className={`mt-3 rounded-xl p-2 text-center text-sm font-bold ${cuadra ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
        {cuadra ? '⚖️ Activo = Pasivo + Patrimonio' : `Activos ${formatoCLP(t.totalActivos)} ≠ Pasivos + Patrimonio ${formatoCLP(t.totalPasivoPatrimonio)}`}
      </p>
    </div>
  );
}

/** Secciones del Balance General con el resultado del ejercicio como una línea del patrimonio. */
export function seccionesConResultado(secciones: Record<SeccionBG, LineaEstado[]>, resultado: number): Record<SeccionBG, LineaEstado[]> {
  return { ...secciones, patrimonio: [...secciones.patrimonio, { cuentaId: 'resultado', monto: resultado }] };
}
