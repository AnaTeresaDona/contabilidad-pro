import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ErrorDetectado, ResultadoValidacion } from '../engine/types';
import { infoError } from '../engine/errores';
import { REGLAS } from '../engine/recompensas';
import { useSesion } from '../estado/Sesion';
import { useProgreso } from '../estado/Progreso';
import { Boton } from '../componentes/ui';
import { Modal } from '../componentes/Efectos';
import { BarraVoz } from '../componentes/BarraVoz';
import { hablar } from '../lib/voz';
import type { EjercicioEnCurso } from '../engine/progreso';

export interface ApiEjercicio {
  /** Llamar al presionar "Comprobar". `solucion` se muestra en la auditoría si hay error. */
  comprobar: (r: ResultadoValidacion, solucion?: ReactNode) => void;
  /** true mientras se muestra el resultado: el ejercicio no debe aceptar cambios. */
  bloqueado: boolean;
}

interface Props {
  pista?: string;
  permitirReintento?: boolean;
  xpBase?: number;
  alAcertar?: () => void;
  alFallar?: (tipos: string[]) => void;
  /** `fallos`: cuántas veces se equivocó antes de terminar. `errores`: tipos de error que cometió. */
  onTerminar: (correcto: boolean, fallos: number, errores: string[]) => void;
  /** Estado guardado del ejercicio (si se retoma después de cerrar la app). */
  inicial?: EjercicioEnCurso;
  /** Avisa cada cambio que hay que guardar: respuestas, fallos y uso de la pista. */
  alCambiar?: (e: EjercicioEnCurso) => void;
  children: (api: ApiEjercicio) => ReactNode;
}

type Feedback =
  | { correcto: true; xp: number; chispas: number }
  | { correcto: false; errores: ErrorDetectado[]; solucion?: ReactNode; danio: number };

/**
 * Envuelve cualquier ejercicio y le da: pista, lectura en voz alta, respuesta por voz,
 * comprobación, XP, chispas, daño a la caja, reintento y el botón "¿En qué me equivoqué?".
 */
export function MarcoEjercicio({ pista, permitirReintento = true, xpBase, alAcertar, alFallar, onTerminar, inicial, alCambiar, children }: Props) {
  const sesion = useSesion();
  const { progreso } = useProgreso();
  const pref = progreso.preferencias;
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pistaVisible, setPistaVisible] = useState(inicial?.pista ?? false);
  const [fallos, setFallos] = useState(inicial?.fallos ?? 0);
  const [tipos, setTipos] = useState<string[]>(inicial?.errores ?? []);
  const [auditorias, setAuditorias] = useState(0);
  const [auditoriaAbierta, setAuditoriaAbierta] = useState(false);
  const contenido = useRef<HTMLDivElement>(null);

  const leerEjercicio = () => contenido.current && hablar(contenido.current.innerText, pref.velocidadVoz);

  // Lectura automática al aparecer el ejercicio (si el jugador la activó en Ajustes).
  useEffect(() => {
    if (!pref.leerAuto) return;
    const t = setTimeout(leerEjercicio, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const comprobar = (r: ResultadoValidacion, solucion?: ReactNode) => {
    if (feedback) return;
    if (r.correcto) {
      const { xp, chispas } = sesion.registrarAcierto(pistaVisible || fallos > 0, xpBase);
      alAcertar?.();
      alCambiar?.({ fallos, errores: tipos, pista: pistaVisible, terminado: { ok: true } });
      setFeedback({ correcto: true, xp, chispas });
      if (pref.leerAuto) hablar('¡Correcto!', pref.velocidadVoz);
    } else {
      const nuevos = r.errores.map((e) => e.tipo);
      const danio = sesion.registrarFallo(nuevos);
      setFallos(fallos + 1);
      setTipos([...tipos, ...nuevos]);
      alFallar?.(nuevos);
      alCambiar?.({ fallos: fallos + 1, errores: [...tipos, ...nuevos], pista: pistaVisible, terminado: permitirReintento ? null : { ok: false } });
      setFeedback({ correcto: false, errores: r.errores, solucion, danio });
      if (pref.leerAuto) {
        const e = r.errores[0];
        hablar(`${infoError(e?.tipo ?? '').titulo}. ${e?.detalle ?? ''}`, pref.velocidadVoz);
      }
    }
  };

  const abrirAuditoria = () => {
    if (auditorias > 0) sesion.cobrarAuditoria();
    setAuditorias((a) => a + 1);
    setAuditoriaAbierta(true);
  };

  const verPista = () => {
    setPistaVisible(true);
    sesion.marcarPista();
    alCambiar?.({ fallos, errores: tipos, pista: true, terminado: null });
  };

  const primerError = feedback && !feedback.correcto ? feedback.errores[0] : null;

  return (
    <div className={feedback ? 'pb-64' : 'pb-6'}>
      <BarraVoz contenedor={contenido} onLeer={leerEjercicio}>
        {pista && !pistaVisible && (
          <button
            onClick={verPista}
            disabled={!!feedback}
            className="rounded-full border-2 border-amber-300 bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-700 hover:bg-amber-100 disabled:opacity-40"
          >
            💡 Pista <span className="font-bold opacity-70">(½ XP)</span>
          </button>
        )}
      </BarraVoz>

      {pista && pistaVisible && (
        <p className="aparecer mb-3 w-full rounded-2xl border-2 border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">💡 {pista}</p>
      )}

      <div ref={contenido}>{children({ comprobar, bloqueado: !!feedback })}</div>

      {feedback && (
        <div
          className={`aparecer fixed inset-x-0 bottom-0 z-30 max-h-[75vh] overflow-y-auto border-t-2 ${feedback.correcto ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}
          role="status"
        >
          <div className="mx-auto max-w-2xl px-4 py-4">
            {feedback.correcto ? (
              <>
                <p className="text-xl font-extrabold text-emerald-700">
                  ✅ ¡Correcto! <span className="text-amber-500">+{feedback.xp} XP</span>{' '}
                  <span className="text-violet-600">+{feedback.chispas} ✨</span>
                  {sesion.combo >= REGLAS.comboDesde && <span className="latido ml-2 inline-block text-orange-500">🔥 Combo x{sesion.combo}</span>}
                </p>
                <Boton className="mt-3 w-full" onClick={() => onTerminar(true, fallos, tipos)} autoFocus>
                  Continuar
                </Boton>
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="sacudir text-lg font-extrabold text-rose-700">❌ Hay un error</p>
                  {feedback.danio > 0 && (
                    <p className="text-sm font-extrabold text-rose-800">
                      💸 {sesion.etiquetaDanio === 'Caja' ? '' : `${sesion.etiquetaDanio}: `}−{feedback.danio} de caja
                    </p>
                  )}
                </div>
                {primerError && <TarjetaError error={primerError} className="mt-2" />}
                {feedback.errores.length > 1 && (
                  <p className="mt-1 text-xs font-bold text-rose-700/80">Y {feedback.errores.length - 1} problema(s) más: míralos en la auditoría.</p>
                )}
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Boton variante="aviso" onClick={abrirAuditoria}>
                    🔍 ¿En qué me equivoqué? {auditorias === 0 ? '(gratis)' : `(−${REGLAS.costoAuditoria} XP)`}
                  </Boton>
                  {permitirReintento ? (
                    <Boton variante="peligro" onClick={() => setFeedback(null)}>
                      Reintentar
                    </Boton>
                  ) : (
                    <Boton variante="peligro" onClick={() => onTerminar(false, fallos, tipos)}>
                      Continuar
                    </Boton>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {auditoriaAbierta && feedback && !feedback.correcto && (
        <PanelAuditoria errores={feedback.errores} solucion={feedback.solucion} onCerrar={() => setAuditoriaAbierta(false)} />
      )}
    </div>
  );
}

/**
 * Tarjeta de un error: muestra el resumen en dos líneas y, al tocarla, crece
 * con la regla, la explicación, cómo corregirlo y la fuente.
 */
export function TarjetaError({ error, className = '' }: { error: ErrorDetectado; className?: string }) {
  const [abierta, setAbierta] = useState(false);
  const info = infoError(error.tipo);
  const fuente = error.fuente ?? info.fuente;
  return (
    <button
      type="button"
      onClick={() => setAbierta((a) => !a)}
      aria-expanded={abierta}
      className={`block w-full rounded-2xl border-2 border-rose-200 bg-white p-3 text-left text-sm transition hover:border-rose-300 ${className}`}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="font-extrabold text-rose-700">{info.titulo}</span>
        <span className="shrink-0 text-xs font-extrabold text-rose-400">{abierta ? 'Menos ▴' : 'Ver más ▾'}</span>
      </span>
      <span className={`mt-1 block text-slate-700 ${abierta ? '' : 'line-clamp-2'}`}>{error.detalle}</span>
      {abierta && (
        <span className="aparecer block">
          {info.regla && (
            <span className="mt-2 block">
              <span className="font-extrabold">📏 Regla: </span>
              {info.regla}
            </span>
          )}
          {info.explicacion && <span className="mt-1 block text-slate-600">{info.explicacion}</span>}
          {info.comoCorregir && (
            <span className="mt-2 block">
              <span className="font-extrabold">🛠️ Cómo corregirlo: </span>
              {info.comoCorregir}
            </span>
          )}
          {fuente && <span className="mt-2 block text-xs font-bold text-slate-400">Fuente: {fuente}</span>}
        </span>
      )}
    </button>
  );
}

export function PanelAuditoria({ errores, solucion, onCerrar }: { errores: ErrorDetectado[]; solucion?: ReactNode; onCerrar: () => void }) {
  return (
    <Modal onCerrar={onCerrar}>
      <h2 className="mb-1 text-xl font-extrabold">🔍 Auditoría de error</h2>
      <p className="mb-4 text-sm text-slate-500">Toca cada tarjeta para ver la regla, cómo corregirlo y la fuente.</p>
      <div className="space-y-3">
        {errores.map((e, i) => (
          <TarjetaError key={i} error={e} />
        ))}
      </div>
      {solucion && (
        <div className="mt-4">
          <p className="mb-2 font-extrabold text-emerald-700">✔️ Respuesta correcta</p>
          {solucion}
        </div>
      )}
      <Boton className="mt-5 w-full" onClick={onCerrar}>
        Entendido
      </Boton>
    </Modal>
  );
}
