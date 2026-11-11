import type { Transaccion } from '../../engine/plantillas';
import { formatoCLP } from '../../engine/dinero';
import { nombreDte } from '../../engine/dte';

/** Tarjeta con el texto de la operación y, si tiene, el documento tributario que la respalda. */
export function Operacion({ texto, documento, valores }: { texto: string; documento?: Transaccion['documento']; valores?: Record<string, number> }) {
  return (
    <div className="mb-4 space-y-3">
      <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-amber-50/60 p-4">
        <p className="mb-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">🧾 Operación</p>
        <p className="text-[15px] leading-relaxed">{texto}</p>
      </div>
      {documento && valores && <DocumentoVista documento={documento} valores={valores} />}
    </div>
  );
}

function DocumentoVista({ documento, valores }: { documento: NonNullable<Transaccion['documento']>; valores: Record<string, number> }) {
  const esBoleta = documento.tipo === 39;
  return (
    <div className="rounded-xl border border-slate-300 bg-white p-3 text-sm shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-extrabold leading-tight">{documento.emisor}</p>
          <p className="text-xs text-slate-500">Emisor</p>
        </div>
        <div className="shrink-0 rounded border-2 border-rose-600 px-2 py-1 text-center text-[11px] font-extrabold uppercase leading-tight text-rose-700">
          {nombreDte(documento.tipo)}
          <br />N° {documento.folio}
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Receptor: <span className="font-bold text-slate-700">{documento.receptor}</span>
      </p>
      {documento.referencia && <p className="text-xs text-slate-500">Referencia: {documento.referencia}</p>}
      <dl className="mt-2 space-y-0.5 border-t border-slate-200 pt-2 tabular-nums">
        {esBoleta ? (
          <div className="flex justify-between font-extrabold">
            <dt>Total (IVA incluido)</dt>
            <dd>{formatoCLP(valores.total)}</dd>
          </div>
        ) : (
          <>
            <div className="flex justify-between">
              <dt>Monto neto</dt>
              <dd>{formatoCLP(valores.neto)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>IVA 19%</dt>
              <dd>{formatoCLP(valores.iva)}</dd>
            </div>
            <div className="flex justify-between font-extrabold">
              <dt>Total</dt>
              <dd>{formatoCLP(valores.total)}</dd>
            </div>
          </>
        )}
      </dl>
    </div>
  );
}

export function Sumas({ debe, haber }: { debe: number; haber: number }) {
  const cuadra = debe > 0 && debe === haber;
  return (
    <div
      className={`mt-3 grid grid-cols-3 items-center rounded-xl px-3 py-2 text-sm font-extrabold ${cuadra ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
    >
      <span>Debe {formatoCLP(debe)}</span>
      <span className="text-center">{cuadra ? '⚖️ Cuadra' : debe === 0 && haber === 0 ? '' : '≠'}</span>
      <span className="text-right">Haber {formatoCLP(haber)}</span>
    </div>
  );
}
