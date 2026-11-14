import { useState } from 'react';
import { NIVELES, ORDEN_NIVELES } from '../content';
import { CONCEPTOS } from '../content/conceptos';
import { crearRng, semillaAleatoria } from '../engine/azar';
import { armarSesion, resultadoSesion, type PreguntaConcepto, type PreguntaSesion, type Respuesta, type ResultadoSesion } from '../engine/conceptos';
import { fechaISO, nivelDesbloqueado, registrarConceptos, sumarChispas } from '../engine/progreso';
import { useProgreso } from '../estado/Progreso';
import { Boton, COLORES, Opcion, Tarjeta } from '../componentes/ui';

/** Chispas por cada respuesta completa y correcta. */
const CHISPAS_BUENA = 10;
const POR_SESION = 10;
const POR_SESION_MEZCLA = 15;

type Fase =
  | { tipo: 'elegir' }
  | { tipo: 'jugando'; nivel: string; titulo: string; refuerzo: boolean; sesion: PreguntaSesion[]; respuestas: Respuesta[]; indice: number; elegida: number | null; respondida: boolean }
  | { tipo: 'resultado'; nivel: string; titulo: string; refuerzo: boolean; sesion: PreguntaSesion[]; respuestas: Respuesta[]; resultado: ResultadoSesion };

/**
 * Repaso de conceptos por nivel, solo con alternativas. Cada pregunta trae una respuesta
 * completa, dos correctas pero incompletas y dos incorrectas: solo la completa vale.
 */
export function RepasoConceptos() {
  const { progreso, actualizar } = useProgreso();
  const [fase, setFase] = useState<Fase>({ tipo: 'elegir' });

  const visto = (id: string) => !!NIVELES.find((n) => n.id === id)?.libre || nivelDesbloqueado(progreso, ORDEN_NIVELES, id);
  const vistos = NIVELES.filter((n) => visto(n.id) && CONCEPTOS[n.id]?.length);

  const empezar = (nivel: string, titulo: string, banco: PreguntaConcepto[], n: number, refuerzo = false) => {
    const sesion = armarSesion(crearRng(semillaAleatoria()), banco, n);
    setFase({ tipo: 'jugando', nivel, titulo, refuerzo, sesion, respuestas: sesion.map(() => null), indice: 0, elegida: null, respondida: false });
    window.scrollTo({ top: 0 });
  };

  const terminar = (f: Extract<Fase, { tipo: 'jugando' }>, respuestas: Respuesta[]) => {
    const resultado = resultadoSesion(f.sesion, respuestas);
    if (!f.refuerzo) actualizar((p) => registrarConceptos(p, f.nivel, resultado.pctBuenas, fechaISO()));
    setFase({ tipo: 'resultado', nivel: f.nivel, titulo: f.titulo, refuerzo: f.refuerzo, sesion: f.sesion, respuestas, resultado });
    window.scrollTo({ top: 0 });
  };

  if (fase.tipo === 'jugando') {
    const actual = fase.sesion[fase.indice];
    const elegida = fase.elegida !== null ? actual.alternativas[fase.elegida] : null;
    const completa = actual.alternativas.find((a) => a.tipo === 'completa')!;

    const responder = () => {
      if (fase.elegida === null) return;
      const respuestas = [...fase.respuestas];
      respuestas[fase.indice] = fase.elegida;
      if (actual.alternativas[fase.elegida].tipo === 'completa') actualizar((p) => sumarChispas(p, CHISPAS_BUENA));
      setFase({ ...fase, respuestas, respondida: true });
    };
    const siguiente = (respuestas = fase.respuestas) => {
      if (fase.indice + 1 >= fase.sesion.length) return terminar(fase, respuestas);
      setFase({ ...fase, respuestas, indice: fase.indice + 1, elegida: null, respondida: false });
      window.scrollTo({ top: 0 });
    };

    return (
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wide text-slate-400">
            <span>
              {fase.refuerzo ? '🎯 Refuerzo · ' : ''}
              {fase.titulo}
            </span>
            <span>
              {fase.indice + 1} de {fase.sesion.length}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${(fase.indice / fase.sesion.length) * 100}%` }} />
          </div>
        </div>

        <h2 className="text-xl font-extrabold leading-snug">{actual.pregunta.pregunta}</h2>
        <p className="text-xs text-slate-500">Elige la respuesta más completa: algunas alternativas son correctas pero incompletas.</p>

        <div className="grid gap-2">
          {actual.alternativas.map((a, i) => {
            const estado = !fase.respondida ? null : a.tipo === 'completa' ? 'bien' : i === fase.elegida ? 'mal' : null;
            return (
              <Opcion
                key={i}
                className="py-3 text-left text-sm"
                activa={fase.elegida === i}
                estado={estado}
                disabled={fase.respondida}
                onClick={() => setFase({ ...fase, elegida: i })}
              >
                {a.texto}
                {fase.respondida && a.tipo === 'incompleta' && <span className="mt-1 block text-xs font-bold text-amber-700">Correcta pero incompleta</span>}
              </Opcion>
            );
          })}
        </div>

        {fase.respondida && elegida && (
          <div
            className={`aparecer rounded-2xl border-2 p-4 text-sm ${
              elegida.tipo === 'completa' ? 'border-emerald-300 bg-emerald-50' : elegida.tipo === 'incompleta' ? 'border-amber-300 bg-amber-50' : 'border-rose-300 bg-rose-50'
            }`}
          >
            <p className="font-extrabold">
              {elegida.tipo === 'completa' && `✅ ¡Completa y correcta! +${CHISPAS_BUENA} ✨`}
              {elegida.tipo === 'incompleta' && '🟡 Correcta, pero incompleta'}
              {elegida.tipo === 'incorrecta' && '❌ Incorrecta'}
            </p>
            {elegida.tipo === 'incompleta' && <p className="mt-1">{elegida.falta}</p>}
            {elegida.tipo !== 'completa' && (
              <p className="mt-1">
                La respuesta completa: <b>{completa.texto}</b>
              </p>
            )}
            <p className="mt-2 text-slate-600">{actual.pregunta.explicacion}</p>
            <p className="mt-1 text-xs font-bold text-slate-400">📖 {actual.pregunta.fuente}</p>
          </div>
        )}

        {!fase.respondida ? (
          <div className="flex gap-2">
            <Boton variante="secundario" onClick={() => siguiente()}>
              Saltar
            </Boton>
            <Boton className="flex-1" disabled={fase.elegida === null} onClick={responder}>
              Responder
            </Boton>
          </div>
        ) : (
          <Boton className="w-full" onClick={() => siguiente()}>
            {fase.indice + 1 >= fase.sesion.length ? 'Ver mi resultado' : 'Siguiente'}
          </Boton>
        )}
        <button className="w-full text-center text-sm font-bold text-slate-400 underline" onClick={() => terminar(fase, fase.respuestas)}>
          Terminar la sesión ahora (las que faltan quedan sin responder)
        </button>
      </div>
    );
  }

  if (fase.tipo === 'resultado') {
    const r = fase.resultado;
    return (
      <div className="aparecer space-y-4">
        <div className="text-center">
          <p className="text-5xl">{r.pctBuenas >= 80 ? '🏆' : r.pctBuenas >= 60 ? '👍' : '💪'}</p>
          <h2 className="mt-1 text-2xl font-extrabold">
            {fase.refuerzo ? 'Refuerzo terminado' : 'Sesión terminada'} · {fase.titulo}
          </h2>
          <p className="text-sm text-slate-500">
            {r.buenas} de {r.total} completas y correctas
            {r.buenas > 0 && ` · +${r.buenas * CHISPAS_BUENA} ✨`}
          </p>
        </div>

        <Tarjeta>
          <p className="mb-2 text-xs font-extrabold uppercase tracking-wider text-slate-400">Resultado de la sesión</p>
          <div className="flex h-4 w-full gap-0.5 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`Buenas ${r.pctBuenas}%, malas ${r.pctMalas}%, no respondidas ${r.pctNoRespondidas}%`}>
            {r.pctBuenas > 0 && <div className="h-full bg-emerald-500" style={{ width: `${r.pctBuenas}%` }} />}
            {r.pctMalas > 0 && <div className="h-full bg-rose-500" style={{ width: `${r.pctMalas}%` }} />}
            {r.pctNoRespondidas > 0 && <div className="h-full bg-slate-300" style={{ width: `${r.pctNoRespondidas}%` }} />}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Dato color="bg-emerald-500" valor={`${r.pctBuenas}%`} etiqueta="Buenas" detalle={`${r.buenas}`} />
            <Dato color="bg-rose-500" valor={`${r.pctMalas}%`} etiqueta="Malas" detalle={r.incompletas ? `${r.malas} (${r.incompletas} ${r.incompletas === 1 ? 'incompleta' : 'incompletas'})` : `${r.malas}`} />
            <Dato color="bg-slate-300" valor={`${r.pctNoRespondidas}%`} etiqueta="Sin responder" detalle={`${r.noRespondidas}`} />
          </div>
        </Tarjeta>

        {r.paraReforzar.length > 0 && (
          <Tarjeta>
            <p className="mb-2 text-xs font-extrabold uppercase tracking-wider text-slate-400">Para reforzar</p>
            <ul className="space-y-3 text-sm">
              {r.paraReforzar.map((p) => (
                <li key={p.id}>
                  <p className="font-bold">{p.pregunta}</p>
                  <p className="text-emerald-700">✓ {p.completa}</p>
                </li>
              ))}
            </ul>
          </Tarjeta>
        )}

        <div className="space-y-2">
          {r.paraReforzar.length > 0 && (
            <Boton className="w-full" onClick={() => empezar(fase.nivel, fase.titulo, r.paraReforzar, r.paraReforzar.length, true)}>
              🎯 Reforzar las malas ({r.paraReforzar.length})
            </Boton>
          )}
          {r.sinResponder.length > 0 && (
            <Boton variante="secundario" className="w-full" onClick={() => empezar(fase.nivel, fase.titulo, r.sinResponder, r.sinResponder.length, true)}>
              Responder las que quedaron ({r.sinResponder.length})
            </Boton>
          )}
          <Boton variante="secundario" className="w-full" onClick={() => setFase({ tipo: 'elegir' })}>
            Elegir otro nivel
          </Boton>
        </div>
      </div>
    );
  }

  const todas = vistos.flatMap((n) => CONCEPTOS[n.id]);
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-extrabold">🧠 Repaso de conceptos</h2>
        <p className="text-sm text-slate-500">
          Solo alternativas. En cada pregunta hay una respuesta completa y correcta, dos correctas pero incompletas y dos incorrectas: solo vale la completa.
        </p>
      </div>

      {vistos.length > 1 && (
        <button
          onClick={() => empezar('todos', 'Todos los niveles', todas, POR_SESION_MEZCLA)}
          className="flex w-full items-center gap-3 rounded-2xl border-2 border-b-4 border-indigo-300 bg-indigo-50 p-4 text-left active:translate-y-[2px]"
        >
          <span className="text-3xl">🎲</span>
          <span className="flex-1">
            <span className="block font-extrabold">Mezcla de todos los niveles vistos</span>
            <span className="block text-xs font-bold text-slate-500">
              {POR_SESION_MEZCLA} preguntas al azar de {todas.length}
            </span>
          </span>
          <Resumen r={progreso.conceptos.todos} />
        </button>
      )}

      <div className="space-y-2">
        {NIVELES.filter((n) => CONCEPTOS[n.id]?.length).map((n) => {
          const abierto = visto(n.id);
          const c = COLORES[n.color];
          const banco = CONCEPTOS[n.id];
          return (
            <button
              key={n.id}
              disabled={!abierto}
              onClick={() => empezar(n.id, `Nivel ${n.numero}`, banco, POR_SESION)}
              className="flex w-full items-center gap-3 rounded-2xl border-2 border-b-4 border-slate-200 bg-white p-3 text-left transition active:translate-y-[2px] disabled:opacity-50"
            >
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-extrabold text-white ${abierto ? c.fondo : 'bg-slate-300'}`}>
                {abierto ? n.numero : '🔒'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-extrabold leading-tight">{n.titulo}</span>
                <span className="block text-xs font-bold text-slate-500">
                  {abierto ? `${Math.min(POR_SESION, banco.length)} preguntas de ${banco.length}` : 'Ábrelo en el mapa para repasarlo'}
                </span>
              </span>
              {abierto && <Resumen r={progreso.conceptos[n.id]} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Dato({ color, valor, etiqueta, detalle }: { color: string; valor: string; etiqueta: string; detalle: string }) {
  return (
    <div>
      <p className="text-2xl font-extrabold tabular-nums">{valor}</p>
      <p className="flex items-center justify-center gap-1 text-xs font-bold text-slate-500">
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} aria-hidden />
        {etiqueta}
      </p>
      <p className="text-xs text-slate-400">{detalle}</p>
    </div>
  );
}

function Resumen({ r }: { r?: { sesiones: number; mejor: number; ultima: number } }) {
  if (!r?.sesiones) return <span className="text-xs font-bold text-slate-400">Nuevo</span>;
  return (
    <span className="shrink-0 text-right text-xs font-bold text-slate-500">
      <span className="block text-sm font-extrabold text-emerald-600">{r.ultima}%</span>
      mejor {r.mejor}%
    </span>
  );
}
