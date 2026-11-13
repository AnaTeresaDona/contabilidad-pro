import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { evaluar } from '../engine/plantillas';
import { campoDestino, escribirEnCampo, marcarCampo, textoNumero } from '../lib/campos';

/** Convierte lo que se ve en pantalla (× ÷ − y coma decimal) en una expresión que entiende el evaluador. */
export function calcular(expr: string): number | null {
  const limpia = expr
    .replace(/\./g, '')
    .replace(/,/g, '.')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');
  if (!limpia.trim()) return null;
  try {
    const v = evaluar(limpia, {});
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

const TECLAS = ['C', '⌫', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '(', '0', ',', ')'];

const ATAJOS: { etiqueta: string; titulo: string; aplicar: (v: number) => number }[] = [
  { etiqueta: '+IVA', titulo: 'Neto × 1,19 = total', aplicar: (v) => v * 1.19 },
  { etiqueta: 'IVA', titulo: 'Neto × 19% = IVA', aplicar: (v) => v * 0.19 },
  { etiqueta: 'Neto', titulo: 'Total ÷ 1,19 = neto', aplicar: (v) => v / 1.19 },
  { etiqueta: '×12', titulo: 'Mensual a anual', aplicar: (v) => v * 12 },
  { etiqueta: '÷12', titulo: 'Anual a mensual', aplicar: (v) => v / 12 },
];

/** Botón y panel de calculadora, siempre a mano sin salir del juego. */
export function Calculadora() {
  const [abierta, setAbierta] = useState(false);
  const [expr, setExpr] = useState('');
  const [aviso, setAviso] = useState('');
  const resultado = calcular(expr);

  const tecla = (t: string) => {
    setAviso('');
    if (t === 'C') return setExpr('');
    if (t === '⌫') return setExpr((e) => e.slice(0, -1));
    setExpr((e) => e + t);
  };

  const igual = () => {
    if (resultado !== null) setExpr(textoNumero(resultado).replace(/\./g, ''));
  };

  const atajo = (f: (v: number) => number) => {
    if (resultado === null) return;
    setExpr(textoNumero(f(resultado)).replace(/\./g, ''));
  };

  const usar = () => {
    if (resultado === null) return;
    const campo = campoDestino();
    if (!campo) {
      setAviso('No hay casillas vacías: toca la casilla donde quieres poner el resultado.');
      return;
    }
    const conDecimales = (campo.placeholder ?? '').includes(',');
    escribirEnCampo(campo, textoNumero(conDecimales ? resultado : Math.round(resultado)));
    marcarCampo(campo);
    setAviso('');
    setAbierta(false);
  };

  // Teclado físico (en el computador).
  useEffect(() => {
    if (!abierta) return;
    const f = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const mapa: Record<string, string> = { '*': '×', '/': '÷', '-': '−', '.': ',', Backspace: '⌫', Escape: 'cerrar', Enter: '=', '=': '=' };
      const k = mapa[e.key] ?? e.key;
      if (k === 'cerrar') setAbierta(false);
      else if (k === '=') igual();
      else if (/^[0-9+×÷−,()%⌫]$/.test(k)) tecla(k);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  });

  return (
    <>
      <button
        data-herramienta
        onClick={() => setAbierta((a) => !a)}
        className={`rounded-xl px-1.5 py-1 text-xl ${abierta ? 'bg-sky-100' : 'hover:bg-slate-100'}`}
        aria-label={abierta ? 'Cerrar la calculadora' : 'Abrir la calculadora'}
        aria-expanded={abierta}
        title="Calculadora"
      >
        🧮
      </button>
      {abierta &&
        createPortal(
        <div data-herramienta className="aparecer fixed inset-x-0 bottom-0 z-40 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-80" role="dialog" aria-label="Calculadora">
          <div className="mx-auto max-w-md rounded-t-3xl border-2 border-slate-200 bg-white p-3 shadow-2xl sm:rounded-3xl">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">🧮 Calculadora</p>
              <button onClick={() => setAbierta(false)} className="rounded-lg px-2 text-lg text-slate-400 hover:bg-slate-100" aria-label="Cerrar">
                ✕
              </button>
            </div>
            <div className="mb-2 rounded-2xl bg-slate-100 px-3 py-2 text-right">
              <p className="min-h-5 break-all text-sm text-slate-500">{expr || '0'}</p>
              <p className="text-2xl font-extrabold tabular-nums text-slate-800" aria-live="polite">
                {resultado === null ? (expr ? '…' : '0') : textoNumero(resultado)}
              </p>
            </div>
            <div className="mb-2 flex gap-1">
              {ATAJOS.map((a) => (
                <button
                  key={a.etiqueta}
                  onClick={() => atajo(a.aplicar)}
                  title={a.titulo}
                  className="flex-1 rounded-lg bg-amber-50 py-1.5 text-xs font-extrabold text-amber-800 hover:bg-amber-100"
                >
                  {a.etiqueta}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {TECLAS.map((t) => (
                <button
                  key={t}
                  onClick={() => tecla(t)}
                  className={`rounded-xl border-b-2 py-2.5 text-lg font-extrabold active:translate-y-[1px] ${
                    /[0-9,]/.test(t) ? 'border-slate-300 bg-slate-50 text-slate-800' : t === 'C' ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-sky-300 bg-sky-50 text-sky-800'
                  }`}
                >
                  {t}
                </button>
              ))}
              <button onClick={igual} className="col-span-2 rounded-xl border-b-2 border-emerald-700 bg-emerald-500 py-2.5 text-lg font-extrabold text-white">
                =
              </button>
              <button
                onClick={usar}
                disabled={resultado === null}
                className="col-span-2 rounded-xl border-b-2 border-violet-700 bg-violet-500 py-2.5 text-sm font-extrabold text-white disabled:opacity-40"
              >
                Usar en la casilla
              </button>
            </div>
            {aviso && <p className="mt-2 text-center text-xs font-bold text-amber-700">{aviso}</p>}
          </div>
        </div>,
          document.body,
        )}
    </>
  );
}
