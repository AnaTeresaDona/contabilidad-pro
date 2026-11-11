import { leerMontoConSigno } from '../engine/dinero';

/** Campo de monto en pesos que acepta negativos ("-150.000" para pérdidas). */
function textoMonto(n: number | null): string {
  if (n === null) return '';
  if (Object.is(n, -0)) return '-';
  const s = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return n < 0 ? `-${s}` : s;
}

export function CampoMonto({ valor, onChange, etiqueta, disabled }: { valor: number | null; onChange: (n: number | null) => void; etiqueta: string; disabled: boolean }) {
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

