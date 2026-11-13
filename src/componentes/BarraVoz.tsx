import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { aplicarVoz, callar, escuchar, lecturaDisponible, reconocimientoDisponible } from '../lib/voz';

/**
 * Barra fija sobre cada ejercicio: escuchar el enunciado y responder hablando.
 * `children` permite agregar otros botones (por ejemplo, la pista).
 */
export function BarraVoz({ contenedor, onLeer, children }: { contenedor: RefObject<HTMLElement | null>; onLeer: () => void; children?: ReactNode }) {
  const [oyendo, setOyendo] = useState(false);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const cancelar = useRef<() => void>(() => {});
  const puedeLeer = lecturaDisponible();
  const puedeOir = reconocimientoDisponible();

  useEffect(() => {
    return () => {
      cancelar.current();
      callar();
    };
  }, []);

  useEffect(() => {
    if (!mensaje) return;
    const t = setTimeout(() => setMensaje(null), 5000);
    return () => clearTimeout(t);
  }, [mensaje]);

  const microfono = () => {
    if (oyendo) {
      cancelar.current();
      return;
    }
    setMensaje(null);
    setOyendo(true);
    cancelar.current = escuchar(
      (alts) => {
        const el = contenedor.current;
        if (!el) return;
        const r = aplicarVoz(alts, el);
        setMensaje({ ok: r.ok, texto: r.mensaje });
      },
      (motivo) => setMensaje({ ok: false, texto: motivo }),
      () => setOyendo(false),
    );
  };

  return (
    <div data-herramienta className="sticky top-[64px] z-20 -mx-1 mb-3 px-1 py-1.5">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {puedeLeer && (
          <button
            onClick={onLeer}
            className="rounded-full border-2 border-sky-200 bg-white/95 px-3 py-1 text-xs font-extrabold text-sky-700 shadow-sm hover:bg-sky-50"
            aria-label="Leer el ejercicio en voz alta"
          >
            🔊 Escuchar
          </button>
        )}
        {puedeOir && (
          <button
            onClick={microfono}
            className={`rounded-full border-2 px-3 py-1 text-xs font-extrabold shadow-sm ${
              oyendo ? 'latido border-rose-400 bg-rose-500 text-white' : 'border-violet-200 bg-white/95 text-violet-700 hover:bg-violet-50'
            }`}
            aria-label={oyendo ? 'Dejar de escuchar' : 'Responder hablando'}
          >
            {oyendo ? '🎙️ Te escucho…' : '🎤 Responder hablando'}
          </button>
        )}
        {children}
      </div>
      {mensaje && (
        <p
          role="status"
          className={`aparecer mt-1.5 rounded-xl px-3 py-2 text-xs font-bold shadow-sm ${mensaje.ok ? 'bg-violet-50 text-violet-800' : 'bg-amber-50 text-amber-900'}`}
        >
          🎤 {mensaje.texto}
        </p>
      )}
    </div>
  );
}
