import { useEffect, useRef, useState } from 'react';
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

/**
 * Si el texto es un monto o número de la pantalla ("$1.250.000", "-300.000", "19%", "0,75"),
 * lo devuelve listo para la calculadora; si no, null.
 */
export function numeroDeTexto(texto: string): string | null {
  const s = texto.replace(/\s+/g, ' ').trim();
  if (s.length === 0 || s.length > 24) return null;
  const m = s.match(/^([−-])?\s?\$?\s?([−-])?\s?(\d{1,3}(?:\.\d{3})+|\d+)(,\d+)?\s?(%)?$/);
  if (!m) return null;
  const negativo = !!(m[1] || m[2]);
  const n = `${m[3]}${m[4] ?? ''}${m[5] ?? ''}`;
  return negativo ? `(−${n})` : n;
}

/** Busca un número en el elemento tocado o en sus contenedores cercanos. */
function numeroTocado(t: EventTarget | null): { valor: string; el: HTMLElement } | null {
  if (!(t instanceof HTMLElement)) return null;
  if (t.closest('[data-herramienta], button, input, textarea, select, a, label')) return null;
  let el: HTMLElement | null = t;
  for (let i = 0; i < 3 && el && el.tagName !== 'MAIN'; i++, el = el.parentElement) {
    const valor = numeroDeTexto(el.innerText ?? '');
    if (valor) return { valor, el };
    if ((el.innerText ?? '').length > 40) return null;
  }
  return null;
}

const TECLAS = ['C', '⌫', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '(', '0', ',', ')'];

const ATAJOS: { etiqueta: string; titulo: string; aplicar: (v: number) => number }[] = [
  { etiqueta: '+IVA', titulo: 'Neto × 1,19 = total', aplicar: (v) => v * 1.19 },
  { etiqueta: 'IVA', titulo: 'Neto × 19% = IVA', aplicar: (v) => v * 0.19 },
  { etiqueta: 'Neto', titulo: 'Total ÷ 1,19 = neto', aplicar: (v) => v / 1.19 },
  { etiqueta: '×12', titulo: 'Mensual a anual', aplicar: (v) => v * 12 },
  { etiqueta: '÷12', titulo: 'Anual a mensual', aplicar: (v) => v / 12 },
];

type Modo = 'cerrada' | 'abierta' | 'mini';

/**
 * Calculadora siempre a mano. Se puede achicar a una barra delgada, deja espacio
 * debajo de la página para ver lo que tapa, y al tocar un número de la pantalla lo agrega.
 */
export function Calculadora() {
  const [modo, setModo] = useState<Modo>('cerrada');
  const [expr, setExpr] = useState('');
  const [aviso, setAviso] = useState('');
  const panel = useRef<HTMLDivElement>(null);
  const resultado = calcular(expr);
  const abierta = modo !== 'cerrada';

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
    setAviso(`✓ Escribí ${textoNumero(conDecimales ? resultado : Math.round(resultado))} en la casilla.`);
    setModo('mini');
  };

  // Deja espacio al final de la página del alto de la calculadora: así se puede bajar y ver lo que tapa.
  useEffect(() => {
    if (!abierta || !panel.current) {
      document.body.style.paddingBottom = '';
      return;
    }
    const ajustar = () => (document.body.style.paddingBottom = `${(panel.current?.offsetHeight ?? 0) + 16}px`);
    ajustar();
    const ro = new ResizeObserver(ajustar);
    ro.observe(panel.current);
    return () => {
      ro.disconnect();
      document.body.style.paddingBottom = '';
    };
  }, [abierta, modo]);

  // Tocar un número de la pantalla lo agrega a la cuenta (si ya hay un número, suma).
  useEffect(() => {
    if (!abierta) return;
    const f = (e: MouseEvent) => {
      const n = numeroTocado(e.target);
      if (!n) return;
      setExpr((x) => (/[\d)%]$/.test(x) ? `${x}+` : x) + n.valor);
      setAviso(`➕ Agregué ${n.valor.replace(/[()]/g, '')}. Para restar o multiplicar, toca − o × antes del siguiente número.`);
      n.el.animate([{ backgroundColor: '#ddd6fe', borderRadius: '6px' }, { backgroundColor: 'transparent' }], { duration: 700 });
    };
    document.addEventListener('click', f, true);
    return () => document.removeEventListener('click', f, true);
  }, [abierta]);

  // Teclado físico (en el computador).
  useEffect(() => {
    if (!abierta) return;
    const f = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const mapa: Record<string, string> = { '*': '×', '/': '÷', '-': '−', '.': ',', Backspace: '⌫', Escape: 'cerrar', Enter: '=', '=': '=' };
      const k = mapa[e.key] ?? e.key;
      if (k === 'cerrar') setModo('cerrada');
      else if (k === '=') igual();
      else if (/^[0-9+×÷−,()%⌫]$/.test(k)) tecla(k);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  });

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(''), 4000);
    return () => clearTimeout(t);
  }, [aviso]);

  const pantalla = resultado === null ? (expr ? '…' : '0') : textoNumero(resultado);
  const boton = 'rounded-lg px-2 py-1 text-xs font-extrabold';

  return (
    <>
      <button
        data-herramienta
        onClick={() => setModo((m) => (m === 'cerrada' ? 'abierta' : 'cerrada'))}
        className={`rounded-xl px-1.5 py-1 text-xl ${abierta ? 'bg-sky-100' : 'hover:bg-slate-100'}`}
        aria-label={abierta ? 'Cerrar la calculadora' : 'Abrir la calculadora'}
        aria-expanded={abierta}
        title="Calculadora"
      >
        🧮
      </button>
      {abierta &&
        createPortal(
          <div
            ref={panel}
            data-herramienta
            className="aparecer fixed inset-x-0 bottom-0 z-40 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-80"
            role="dialog"
            aria-label="Calculadora"
          >
            <div className={`mx-auto max-w-md border-2 border-slate-200 bg-white shadow-2xl sm:rounded-3xl ${modo === 'mini' ? 'rounded-t-2xl px-3 py-2' : 'rounded-t-3xl p-3'}`}>
              {modo === 'mini' ? (
                <>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setModo('abierta')} className="min-w-0 flex-1 text-left" aria-label="Agrandar la calculadora">
                      <span className="block truncate text-xs text-slate-500">🧮 {expr || 'Toca un número de la pantalla'}</span>
                      <span className="block text-lg font-extrabold tabular-nums leading-tight text-slate-800">= {pantalla}</span>
                    </button>
                    <button onClick={usar} disabled={resultado === null} className={`${boton} bg-violet-500 text-white disabled:opacity-40`}>
                      Usar
                    </button>
                    <button onClick={() => setModo('abierta')} className={`${boton} bg-sky-100 text-sky-800`} aria-label="Agrandar la calculadora">
                      ▴ Teclado
                    </button>
                    <button onClick={() => setModo('cerrada')} className="rounded-lg px-1.5 text-lg text-slate-400 hover:bg-slate-100" aria-label="Cerrar">
                      ✕
                    </button>
                  </div>
                  {aviso && <p className="mt-1 text-xs font-bold text-violet-700">{aviso}</p>}
                </>
              ) : (
                <>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">🧮 Calculadora</p>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setModo('mini')} className={`${boton} bg-sky-100 text-sky-800`} aria-label="Achicar la calculadora">
                        ▾ Achicar
                      </button>
                      <button onClick={() => setModo('cerrada')} className="rounded-lg px-2 text-lg text-slate-400 hover:bg-slate-100" aria-label="Cerrar">
                        ✕
                      </button>
                    </div>
                  </div>
                  <div className="mb-1.5 rounded-2xl bg-slate-100 px-3 py-1.5 text-right">
                    <p className="min-h-4 break-all text-xs text-slate-500">{expr || '0'}</p>
                    <p className="text-2xl font-extrabold tabular-nums text-slate-800" aria-live="polite">
                      {pantalla}
                    </p>
                  </div>
                  <p className="mb-1.5 text-center text-[11px] font-bold text-violet-700">
                    {aviso || '💡 Toca cualquier número de la pantalla y se agrega aquí.'}
                  </p>
                  <div className="mb-1.5 flex gap-1">
                    {ATAJOS.map((a) => (
                      <button
                        key={a.etiqueta}
                        onClick={() => atajo(a.aplicar)}
                        title={a.titulo}
                        className="flex-1 rounded-lg bg-amber-50 py-1 text-xs font-extrabold text-amber-800 hover:bg-amber-100"
                      >
                        {a.etiqueta}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {TECLAS.map((t) => (
                      <button
                        key={t}
                        onClick={() => tecla(t)}
                        className={`rounded-xl border-b-2 py-2 text-lg font-extrabold active:translate-y-[1px] ${
                          /[0-9,]/.test(t)
                            ? 'border-slate-300 bg-slate-50 text-slate-800'
                            : t === 'C'
                              ? 'border-rose-300 bg-rose-50 text-rose-700'
                              : 'border-sky-300 bg-sky-50 text-sky-800'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                    <button onClick={igual} className="col-span-2 rounded-xl border-b-2 border-emerald-700 bg-emerald-500 py-2 text-lg font-extrabold text-white">
                      =
                    </button>
                    <button
                      onClick={usar}
                      disabled={resultado === null}
                      className="col-span-2 rounded-xl border-b-2 border-violet-700 bg-violet-500 py-2 text-sm font-extrabold text-white disabled:opacity-40"
                    >
                      Usar en la casilla
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
