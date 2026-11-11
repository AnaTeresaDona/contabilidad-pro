import { useState, type ReactNode } from 'react';
import type { ErrorDetectado, ResultadoValidacion } from '../engine/types';
import { infoError } from '../engine/errores';
import { REGLAS } from '../engine/recompensas';
import { useSesion } from '../estado/Sesion';
import { Boton } from '../componentes/ui';
import { Modal } from '../componentes/Efectos';

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
  alFallar?: () => void;
  /** `fallos`: cuántas veces se equivocó antes de terminar. */
  onTerminar: (correcto: boolean, fallos: number) => void;
  children: (api: ApiEjercicio) => ReactNode;
}

type Feedback = { correcto: true; xp: number } | { correcto: false; errores: ErrorDetectado[]; solucion?: ReactNode };

/**
 * Envuelve cualquier ejercicio y le da: pista, comprobación, XP, daño a la caja,
 * reintento y el botón "¿En qué me equivoqué?".
 */
export function MarcoEjercicio({ pista, permitirReintento = true, xpBase, alAcertar, alFallar, onTerminar, children }: Props) {
  const sesion = useSesion();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pistaVisible, setPistaVisible] = useState(false);
  const [fallos, setFallos] = useState(0);
  const [auditorias, setAuditorias] = useState(0);
  const [auditoriaAbierta, setAuditoriaAbierta] = useState(false);

  const comprobar = (r: ResultadoValidacion, solucion?: ReactNode) => {
    if (feedback) return;
    if (r.correcto) {
      const xp = sesion.registrarAcierto(pistaVisible || fallos > 0, xpBase);
      alAcertar?.();
      setFeedback({ correcto: true, xp });
    } else {
      sesion.registrarFallo(r.errores.map((e) => e.tipo));
      setFallos((f) => f + 1);
      alFallar?.();
      setFeedback({ correcto: false, errores: r.errores, solucion });
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
  };

  const primerError = feedback && !feedback.correcto ? infoError(feedback.errores[0]?.tipo ?? '') : null;

  return (
    <div className={feedback ? 'pb-48' : 'pb-6'}>
      {pista && (
        <div className="mb-3 flex justify-end">
          {pistaVisible ? (
            <p className="aparecer w-full rounded-2xl border-2 border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              💡 {pista}
            </p>
          ) : (
            <button
              onClick={verPista}
              disabled={!!feedback}
              className="rounded-full border-2 border-amber-300 bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-700 hover:bg-amber-100 disabled:opacity-40"
            >
              💡 Pista (gana la mitad de XP)
            </button>
          )}
        </div>
      )}

      {children({ comprobar, bloqueado: !!feedback })}

      {feedback && (
        <div
          className={`aparecer fixed inset-x-0 bottom-0 z-30 border-t-2 ${feedback.correcto ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}
          role="status"
        >
          <div className="mx-auto max-w-2xl px-4 py-4">
            {feedback.correcto ? (
              <>
                <p className="text-xl font-extrabold text-emerald-700">
                  ✅ ¡Correcto! <span className="text-amber-500">+{feedback.xp} XP</span>
                  {sesion.combo >= REGLAS.comboDesde && <span className="latido ml-2 inline-block text-orange-500">🔥 Combo x{sesion.combo}</span>}
                </p>
                <Boton className="mt-3 w-full" onClick={() => onTerminar(true, fallos)} autoFocus>
                  Continuar
                </Boton>
              </>
            ) : (
              <>
                <p className="sacudir text-xl font-extrabold text-rose-700">❌ {primerError?.titulo}</p>
                <p className="text-sm text-rose-700/80">
                  {feedback.errores.length > 1
                    ? `${feedback.errores.length} problemas encontrados.`
                    : feedback.errores[0]?.tipo === 'trivia'
                      ? 'Mira la explicación para aprender de este error.'
                      : 'Revisa la operación.'}
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Boton variante="aviso" onClick={abrirAuditoria}>
                    🔍 ¿En qué me equivoqué? {auditorias === 0 ? '(gratis)' : `(−${REGLAS.costoAuditoria} XP)`}
                  </Boton>
                  {permitirReintento ? (
                    <Boton variante="peligro" onClick={() => setFeedback(null)}>
                      Reintentar
                    </Boton>
                  ) : (
                    <Boton variante="peligro" onClick={() => onTerminar(false, fallos)}>
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

export function PanelAuditoria({ errores, solucion, onCerrar }: { errores: ErrorDetectado[]; solucion?: ReactNode; onCerrar: () => void }) {
  return (
    <Modal onCerrar={onCerrar}>
      <h2 className="mb-1 text-xl font-extrabold">🔍 Auditoría de error</h2>
      <p className="mb-4 text-sm text-slate-500">Esto es lo que pasó y la regla que lo explica.</p>
      <div className="space-y-3">
        {errores.map((e, i) => {
          const info = infoError(e.tipo);
          const fuente = e.fuente ?? info.fuente;
          return (
            <div key={i} className="rounded-2xl border-2 border-rose-100 bg-rose-50/50 p-4 text-sm">
              <p className="font-extrabold text-rose-700">{info.titulo}</p>
              <p className="mt-1">{e.detalle}</p>
              {info.regla && (
                <p className="mt-2">
                  <span className="font-extrabold">📏 Regla: </span>
                  {info.regla}
                </p>
              )}
              {info.explicacion && <p className="mt-1 text-slate-600">{info.explicacion}</p>}
              {info.comoCorregir && (
                <p className="mt-2">
                  <span className="font-extrabold">🛠️ Cómo corregirlo: </span>
                  {info.comoCorregir}
                </p>
              )}
              {fuente && <p className="mt-2 text-xs font-bold text-slate-400">Fuente: {fuente}</p>}
            </div>
          );
        })}
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
