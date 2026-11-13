import { useState } from 'react';
import { CONTENIDO, infoNivel } from '../content';
import type { ContenidoNivel } from '../content/tipos';
import { premioActual } from '../content/premios';
import { crearRng, elegirVarios, semillaAleatoria } from '../engine/azar';
import { armarPractica, type Ejercicio } from '../engine/ejercicios';
import { nuevoId } from '../engine/plantillas';
import {
  actualizarNivel,
  agregarRepaso,
  cambiarHp,
  estadoNivel,
  fechaISO,
  HP_MAX,
  PASOS_NIVEL,
  pasoCompletado,
  pasoDesbloqueado,
  registrarAsiento,
  registrarPaso,
  type IdPaso,
  type RegistroPaso,
} from '../engine/progreso';
import { chispasPorPaso, estrellasPorPrecision, REGLAS } from '../engine/recompensas';
import { armarRegistro, diagnosticar, precision, temaDe, temaPregunta, type ResultadoEjercicio } from '../engine/estadisticas';
import { useProgreso } from '../estado/Progreso';
import { ProveedorSesion, useSesion } from '../estado/Sesion';
import { MarcoEjercicio } from '../juego/MarcoEjercicio';
import { pistaDe, VistaEjercicio } from '../juego/VistaEjercicio';
import { Boton, COLORES, Dialogo, Tarjeta } from '../componentes/ui';
import { Apuntes } from './Apuntes';
import { ResultadoPaso } from './ResultadoPaso';
import { Confeti, Modal } from '../componentes/Efectos';
import { BotonCompartir } from '../componentes/Compartir';
import { datosAvance } from '../lib/compartir';

type Fase = 'hub' | 'apuntes' | 'jugando' | 'resultado' | 'refuerzo' | 'finRefuerzo' | 'jefeIntro' | 'jefe' | 'fin';

/** Nombre, emoji y explicación de cada paso del nivel. */
export function metaPaso(paso: IdPaso, c: ContenidoNivel): { numero: number; titulo: string; emoji: string; descripcion: string } {
  const numero = PASOS_NIVEL.indexOf(paso) + 1;
  switch (paso) {
    case 'conceptos':
      return { numero, titulo: 'Conceptos', emoji: '📘', descripcion: `Trivia de ${REGLAS.triviaPreguntas} preguntas. Necesitas ${REGLAS.triviaMinimo} correctas.` };
    case 'jefe':
      return { numero, titulo: 'Jefe final', emoji: c.jefe.emoji, descripcion: c.jefe.titulo };
    default: {
      const p = c.pasos.find((x) => x.id === paso)!;
      const titulo = paso === 'basico' ? 'Básico' : paso === 'intermedio' ? 'Intermedio' : 'Avanzado';
      const emoji = paso === 'basico' ? '🧩' : paso === 'intermedio' ? '🛠️' : '🚀';
      return { numero, titulo, emoji, descripcion: p.descripcion };
    }
  }
}

export function PantallaNivel({
  id,
  onSalir,
  onVerEmpresa,
  onVerPremios,
}: {
  id: string;
  onSalir: () => void;
  onVerEmpresa: () => void;
  onVerPremios: () => void;
}) {
  const { obtener } = useProgreso();
  const [insolvente, setInsolvente] = useState(() => obtener().hp === 0);
  const [reinicio, setReinicio] = useState(0);

  return (
    <ProveedorSesion key={reinicio} onInsolvencia={() => setInsolvente(true)} etiquetaDanio={CONTENIDO[id]?.etiquetaDanio}>
      <Partida id={id} onSalir={onSalir} onVerEmpresa={onVerEmpresa} onVerPremios={onVerPremios} pausada={insolvente} />
      {insolvente && (
        <Insolvencia
          onReintentar={() => {
            setInsolvente(false);
            setReinicio((r) => r + 1);
          }}
        />
      )}
    </ProveedorSesion>
  );
}

function Insolvencia({ onReintentar }: { onReintentar: () => void }) {
  const { actualizar } = useProgreso();
  return (
    <Modal>
      <div className="text-center">
        <p className="text-6xl">💸</p>
        <h2 className="mt-2 text-2xl font-extrabold text-rose-600">¡Insolvencia!</h2>
        <p className="mt-2 text-slate-600">
          Los errores le costaron toda la caja a la empresa. Tranquilo: conservas tu XP y tus chispas. El banco te da un crédito puente para volver a intentarlo.
        </p>
        <Boton
          className="mt-5 w-full"
          onClick={() => {
            actualizar((p) => cambiarHp(p, HP_MAX));
            onReintentar();
          }}
        >
          Refinanciar y reintentar
        </Boton>
      </div>
    </Modal>
  );
}

/** Ejercicios para reforzar los temas débiles, sacados de los pasos del nivel hasta el actual. */
function ejerciciosDeRefuerzo(c: ContenidoNivel, paso: IdPaso, debilidades: string[], semilla: number): Ejercicio[] {
  const rng = crearRng(semilla);
  const quiero = new Set(debilidades);
  if (paso === 'conceptos') {
    const preguntas = c.preguntas.filter((q) => quiero.has(temaPregunta(q)));
    return elegirVarios(rng, preguntas, Math.min(5, preguntas.length)).map((pregunta) => ({ tipo: 'pregunta', pregunta }));
  }
  const hasta = paso === 'jefe' ? c.pasos.length : c.pasos.findIndex((p) => p.id === paso) + 1;
  const generadores = c.pasos.slice(0, hasta);
  const generar = (r: typeof rng) => generadores.flatMap((g) => g.generar(r)).filter((e) => quiero.has(temaDe(e)));
  return armarPractica(generar, rng, 4);
}

function Partida({
  id,
  onSalir,
  onVerEmpresa,
  onVerPremios,
  pausada,
}: {
  id: string;
  onSalir: () => void;
  onVerEmpresa: () => void;
  onVerPremios: () => void;
  pausada: boolean;
}) {
  const contenido = CONTENIDO[id];
  const info = infoNivel(id);
  const color = COLORES[info.color];
  const { progreso, actualizar, obtener } = useProgreso();
  const sesion = useSesion();
  const est = estadoNivel(progreso, id);

  const [fase, setFase] = useState<Fase>('hub');
  const [paso, setPaso] = useState<IdPaso>('conceptos');
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
  const [indice, setIndice] = useState(0);
  const [resultados, setResultados] = useState<ResultadoEjercicio[]>([]);
  const [inicio, setInicio] = useState(0);
  const [semilla, setSemilla] = useState(semillaAleatoria);
  const [resultado, setResultado] = useState<{ registro: RegistroPaso; completado: boolean; estrellas: number; chispas: number; previo: RegistroPaso | null } | null>(null);
  const [refuerzo, setRefuerzo] = useState<{ ejercicios: Ejercicio[]; indice: number; resultados: ResultadoEjercicio[]; inicio: number }>({
    ejercicios: [],
    indice: 0,
    resultados: [],
    inicio: 0,
  });
  const [intentosJefe, setIntentosJefe] = useState(0);
  const [jefe, setJefe] = useState<Ejercicio | null>(null);
  const [jefeResultado, setJefeResultado] = useState<ResultadoEjercicio>({ tema: contenido.jefe.titulo, primerIntento: true, fallos: 0, errores: [] });
  const [chispasInicioNivel] = useState(() => obtener().chispas);

  const irArriba = () => window.scrollTo(0, 0);

  const verApuntes = () => {
    actualizar((p) => actualizarNivel(p, id, { apuntesVistos: true }));
    setFase('apuntes');
    irArriba();
  };

  const empezarPaso = (p: IdPaso) => {
    if (p === 'jefe') {
      setPaso('jefe');
      setIntentosJefe(0);
      setJefe(contenido.generarJefe(crearRng(semillaAleatoria())));
      setJefeResultado({ tema: contenido.jefe.titulo, primerIntento: true, fallos: 0, errores: [] });
      setInicio(Date.now());
      setFase('jefeIntro');
      irArriba();
      return;
    }
    const s = semillaAleatoria();
    setSemilla(s);
    const ejs: Ejercicio[] =
      p === 'conceptos'
        ? elegirVarios(crearRng(s), contenido.preguntas, REGLAS.triviaPreguntas).map((pregunta) => ({ tipo: 'pregunta', pregunta }))
        : (() => {
            const def = contenido.pasos.find((x) => x.id === p)!;
            return armarPractica(def.generar, crearRng(s), def.generar(crearRng(s)).length);
          })();
    setPaso(p);
    setEjercicios(ejs);
    setIndice(0);
    setResultados([]);
    setInicio(Date.now());
    setFase('jugando');
    irArriba();
  };

  /** Los asientos bien hechos pasan al libro de la empresa del jugador. */
  const registrarEnLibro = (ej: Ejercicio) => {
    const nuevos =
      ej.tipo === 'debeHaber' || ej.tipo === 'completar'
        ? [ej.trans.asiento]
        : ej.tipo === 'balance8' || ej.tipo === 'estados'
          ? ej.asientos
          : ej.tipo === 'ajustesCierre'
            ? ej.datos.ajustes.map((t) => t.asiento)
            : [];
    if (nuevos.length === 0) return;
    actualizar((p) => nuevos.reduce((q, a) => registrarAsiento(q, { ...a, id: nuevoId(), fecha: fechaISO() }), p));
  };

  const cerrarPaso = (p: IdPaso, res: ResultadoEjercicio[]) => {
    const registro = armarRegistro(id, p, res, (Date.now() - inicio) / 1000);
    const prec = precision(registro);
    const completado = p === 'conceptos' ? registro.aciertosPrimera >= REGLAS.triviaMinimo : true;
    const estrellas = p === 'jefe' ? (res[0]?.primerIntento ? 3 : intentosJefe <= 1 ? 2 : 1) : estrellasPorPrecision(prec);
    const previos = obtener().historial.filter((h) => h.nivel === id && h.paso === p);
    const previo = previos[previos.length - 1] ?? null;
    actualizar((q) => {
      let r = registrarPaso(q, registro, estrellas, completado);
      if (p === 'conceptos' && completado) r = actualizarNivel(r, id, { triviaAprobada: true });
      return r;
    });
    const chispas = completado ? chispasPorPaso(estrellas) : 0;
    if (chispas) sesion.ganarChispas(chispas);
    setResultado({ registro, completado, estrellas, chispas, previo });
  };

  const terminarEjercicio = (ok: boolean, fallos: number, errores: string[]) => {
    const ej = ejercicios[indice];
    const nuevos = [...resultados, { tema: temaDe(ej), primerIntento: ok && fallos === 0, fallos: ok ? fallos : Math.max(1, fallos), errores }];
    setResultados(nuevos);
    if (indice + 1 < ejercicios.length) setIndice(indice + 1);
    else {
      cerrarPaso(paso, nuevos);
      setFase('resultado');
      irArriba();
    }
  };

  const terminarNivel = (res: ResultadoEjercicio) => {
    const primerIntento = res.primerIntento;
    actualizar((p) => {
      const previo = estadoNivel(p, id);
      const q = actualizarNivel(p, id, {
        triviaAprobada: true,
        completado: true,
        jefePerfecto: previo.jefePerfecto || primerIntento,
        sinPistas: previo.sinPistas || !sesion.usoPistas,
      });
      return cambiarHp(q, REGLAS.curacionNivel);
    });
    cerrarPaso('jefe', [res]);
    sesion.ganarChispas(REGLAS.chispasNivel);
    setFase('fin');
    irArriba();
  };

  const siguientePaso = (p: IdPaso): IdPaso | null => PASOS_NIVEL[PASOS_NIVEL.indexOf(p) + 1] ?? null;

  const empezarRefuerzo = () => {
    if (!resultado) return;
    const ejs = ejerciciosDeRefuerzo(contenido, paso, diagnosticar(resultado.registro).debilidades, semillaAleatoria());
    if (ejs.length === 0) return;
    setRefuerzo({ ejercicios: ejs, indice: 0, resultados: [], inicio: Date.now() });
    setFase('refuerzo');
    irArriba();
  };

  // Barra de avance dentro del paso.
  const total = fase === 'refuerzo' ? refuerzo.ejercicios.length : ejercicios.length;
  const hecho = fase === 'refuerzo' ? refuerzo.indice : indice;
  const mostrarBarra = fase === 'jugando' || fase === 'refuerzo';
  const meta = metaPaso(paso, contenido);
  const premio = premioActual(progreso.chispas);

  return (
    <div className={pausada ? 'pointer-events-none' : ''}>
      {mostrarBarra && (
        <div className="mb-3">
          <p className="mb-1 text-xs font-extrabold uppercase text-slate-400">
            {fase === 'refuerzo' ? '🎯 Refuerzo de debilidades · sin daño a la caja' : `Paso ${meta.numero} · ${meta.titulo}`}
          </p>
          <div className="flex items-center gap-3">
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200">
              <div className={`h-full rounded-full transition-all duration-500 ${fase === 'refuerzo' ? 'bg-violet-500' : color.fondo}`} style={{ width: `${(hecho / Math.max(1, total)) * 100}%` }} />
            </div>
            {sesion.combo >= REGLAS.comboDesde && <span className="latido text-sm font-extrabold text-orange-500">🔥x{sesion.combo}</span>}
          </div>
        </div>
      )}

      {fase === 'hub' && (
        <div className="aparecer space-y-5">
          <div className={`rounded-3xl ${color.fondo} p-5 text-white`}>
            <p className="text-sm font-extrabold uppercase opacity-80">
              Nivel {info.numero} · {info.etapa}
            </p>
            <h2 className="text-2xl font-extrabold leading-tight">{info.titulo}</h2>
            <p className="mt-1 opacity-90">{info.tema}</p>
          </div>
          <Dialogo emoji={contenido.intro.emoji} nombre={contenido.intro.personaje}>
            {contenido.intro.texto}
          </Dialogo>

          <button
            onClick={verApuntes}
            className={`flex w-full items-center gap-3 rounded-2xl border-2 border-b-4 bg-white p-4 text-left transition hover:bg-slate-50 active:translate-y-[2px] ${
              est.apuntesVistos ? 'border-slate-200' : 'latido border-amber-300'
            }`}
          >
            <span className="text-3xl">📖</span>
            <span className="min-w-0 flex-1">
              <span className="block font-extrabold">Apuntes del nivel</span>
              <span className="block text-xs font-bold text-slate-500">
                {contenido.apuntes.length} temas con su fuente · {est.apuntesVistos ? 'Leídos ✓ (repásalos cuando quieras)' : 'Recomendado antes de empezar'}
              </span>
            </span>
          </button>

          <section aria-label="Pasos del nivel" className="space-y-2.5">
            <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Pasos del nivel · de menor a mayor dificultad</p>
            {PASOS_NIVEL.map((p) => {
              const m = metaPaso(p, contenido);
              const abierto = pasoDesbloqueado(progreso, id, p);
              const hecho = pasoCompletado(progreso, id, p);
              const estrellas = est.pasos?.[p]?.estrellas ?? 0;
              const siguiente = abierto && !hecho;
              return (
                <button
                  key={p}
                  disabled={!abierto}
                  onClick={() => empezarPaso(p)}
                  className={`flex w-full items-center gap-3 rounded-2xl border-2 border-b-4 p-3 text-left transition active:translate-y-[2px] disabled:cursor-not-allowed ${
                    siguiente ? `${color.suave} border-current ${color.texto}` : abierto ? 'border-slate-200 bg-white hover:bg-slate-50' : 'border-slate-200 bg-slate-100'
                  }`}
                >
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl ${
                      hecho ? 'bg-emerald-100' : abierto ? `${color.fondo} ${siguiente ? 'latido' : ''}` : 'bg-slate-200'
                    }`}
                  >
                    {abierto ? m.emoji : '🔒'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-xs font-extrabold uppercase ${abierto ? '' : 'text-slate-400'}`}>Paso {m.numero}</span>
                    <span className={`block font-extrabold leading-tight ${abierto ? 'text-slate-800' : 'text-slate-400'}`}>{m.titulo}</span>
                    <span className="block text-xs text-slate-500">{abierto ? m.descripcion : 'Completa el paso anterior para abrirlo.'}</span>
                  </span>
                  <span className="shrink-0 text-right text-sm">
                    {hecho ? (
                      <>
                        <span className="block tracking-tighter">{'⭐'.repeat(estrellas) + '☆'.repeat(Math.max(0, 3 - estrellas))}</span>
                        <span className="block text-xs font-extrabold text-slate-400">Repetir</span>
                      </>
                    ) : abierto ? (
                      <span className="font-extrabold">Jugar ▸</span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </section>

          <Tarjeta className="text-sm text-slate-600">
            <p className="mb-1 font-extrabold text-slate-700">Cómo se juega</p>
            <p>
              Cada paso es un poco más difícil que el anterior. Al terminarlo verás tus estadísticas, tus fortalezas y tus debilidades, y podrás
              reforzar lo que te costó (es opcional). Cada error grave le cuesta caja a la empresa 💰; cada acierto te da chispas de saber ✨ para
              subir el camino de premios.
            </p>
          </Tarjeta>

          {est.completado && (
            <BotonCompartir
              className="w-full"
              datos={datosAvance(progreso, `¡Completé el Nivel ${info.numero} de Contabilidad Pro!`, [info.titulo], premio)}
            />
          )}
        </div>
      )}

      {fase === 'apuntes' && (
        <Apuntes
          titulo={info.titulo}
          apuntes={contenido.apuntes}
          onVolver={() => setFase('hub')}
          onComenzar={() => empezarPaso(pasoCompletado(progreso, id, 'conceptos') ? (PASOS_NIVEL.find((p) => !pasoCompletado(progreso, id, p)) ?? 'conceptos') : 'conceptos')}
        />
      )}

      {fase === 'jugando' && ejercicios[indice] && (
        <MarcoEjercicio
          key={`${paso}-${semilla}-${indice}`}
          permitirReintento={paso !== 'conceptos'}
          pista={paso === 'conceptos' ? undefined : pistaDe(ejercicios[indice])}
          alAcertar={() => registrarEnLibro(ejercicios[indice])}
          alFallar={() => {
            const ej = ejercicios[indice];
            if (ej.tipo === 'pregunta') actualizar((p) => agregarRepaso(p, ej.pregunta.id));
          }}
          onTerminar={terminarEjercicio}
        >
          {(api) => (
            <>
              <p className="mb-2 text-xs font-extrabold uppercase text-slate-400">
                {paso === 'conceptos' ? 'Pregunta' : 'Ejercicio'} {indice + 1} de {ejercicios.length}
              </p>
              <VistaEjercicio ej={ejercicios[indice]} api={api} />
            </>
          )}
        </MarcoEjercicio>
      )}

      {fase === 'resultado' && resultado && (
        <ResultadoPaso
          numero={meta.numero}
          titulo={meta.titulo}
          esTrivia={paso === 'conceptos'}
          {...resultado}
          compartir={datosAvance(
            progreso,
            resultado.completado ? `¡Superé el Paso ${meta.numero} (${meta.titulo}) del Nivel ${info.numero}!` : `Estoy practicando el Nivel ${info.numero} de contabilidad`,
            [`${info.titulo} · ${'⭐'.repeat(resultado.estrellas)}`, `${precision(resultado.registro)}% de aciertos al primer intento`],
            premio,
          )}
          siguiente={
            !resultado.completado
              ? { texto: 'Intentar de nuevo', accion: () => empezarPaso(paso) }
              : siguientePaso(paso)
                ? {
                    texto: `Siguiente: Paso ${metaPaso(siguientePaso(paso)!, contenido).numero} · ${metaPaso(siguientePaso(paso)!, contenido).titulo}`,
                    accion: () => empezarPaso(siguientePaso(paso)!),
                  }
                : { texto: 'Volver al nivel', accion: () => setFase('hub') }
          }
          onRefuerzo={diagnosticar(resultado.registro).debilidades.length > 0 ? empezarRefuerzo : undefined}
          onRepetir={() => empezarPaso(paso)}
          onApuntes={verApuntes}
          onVolver={() => {
            setFase('hub');
            irArriba();
          }}
        />
      )}

      {fase === 'refuerzo' && refuerzo.ejercicios[refuerzo.indice] && (
        <ProveedorSesion sinDanio>
          <MarcoEjercicio
            key={`r-${refuerzo.inicio}-${refuerzo.indice}`}
            pista={pistaDe(refuerzo.ejercicios[refuerzo.indice])}
            onTerminar={(ok, fallos, errores) => {
              const ej = refuerzo.ejercicios[refuerzo.indice];
              const res = [...refuerzo.resultados, { tema: temaDe(ej), primerIntento: ok && fallos === 0, fallos, errores }];
              if (refuerzo.indice + 1 < refuerzo.ejercicios.length) setRefuerzo({ ...refuerzo, indice: refuerzo.indice + 1, resultados: res });
              else {
                const registro = armarRegistro(id, 'refuerzo', res, (Date.now() - refuerzo.inicio) / 1000);
                actualizar((p) => ({ ...p, historial: [...p.historial, registro].slice(-400) }));
                setRefuerzo({ ...refuerzo, indice: refuerzo.indice + 1, resultados: res });
                setFase('finRefuerzo');
                irArriba();
              }
            }}
          >
            {(api) => (
              <>
                <p className="mb-2 text-xs font-extrabold uppercase text-slate-400">
                  Refuerzo {refuerzo.indice + 1} de {refuerzo.ejercicios.length}
                </p>
                <VistaEjercicio ej={refuerzo.ejercicios[refuerzo.indice]} api={api} />
              </>
            )}
          </MarcoEjercicio>
        </ProveedorSesion>
      )}

      {fase === 'finRefuerzo' && (
        <div className="aparecer space-y-4 text-center">
          <p className="text-6xl">🎯</p>
          <h2 className="text-2xl font-extrabold">¡Refuerzo terminado!</h2>
          <p className="text-slate-600">
            {refuerzo.resultados.filter((r) => r.primerIntento).length} de {refuerzo.resultados.length} al primer intento. Lo que practicas hoy, mañana te sale
            solo.
          </p>
          <div className="grid gap-2">
            {resultado?.completado && siguientePaso(paso) ? (
              <Boton onClick={() => empezarPaso(siguientePaso(paso)!)}>Seguir al Paso {metaPaso(siguientePaso(paso)!, contenido).numero}</Boton>
            ) : (
              <Boton onClick={() => empezarPaso(paso)}>{resultado?.completado ? 'Repetir el paso' : 'Intentar el paso de nuevo'}</Boton>
            )}
            <Boton variante="secundario" onClick={empezarRefuerzo}>
              🎯 Reforzar otra vez
            </Boton>
            <Boton variante="fantasma" onClick={() => setFase('hub')}>
              Volver al nivel
            </Boton>
          </div>
        </div>
      )}

      {fase === 'jefeIntro' && (
        <div className="aparecer space-y-5">
          <div className="rounded-3xl bg-slate-800 p-5 text-white">
            <p className="text-sm font-extrabold uppercase text-amber-300">⚔️ Paso 5 · Jefe final</p>
            <h2 className="text-2xl font-extrabold">{contenido.jefe.titulo}</h2>
          </div>
          <Dialogo emoji={contenido.jefe.emoji} nombre={contenido.jefe.nombre}>
            {contenido.jefe.texto}
          </Dialogo>
          <p className="text-center text-sm text-slate-500">
            Recompensa: +{REGLAS.xpJefe} XP y +{REGLAS.chispasNivel} ✨ al completar el nivel. {contenido.jefe.avisoFallo}
          </p>
          <Boton className="w-full" onClick={() => setFase('jefe')}>
            Aceptar el desafío
          </Boton>
        </div>
      )}

      {fase === 'jefe' && jefe && (
        <MarcoEjercicio
          key={`j-${intentosJefe}`}
          permitirReintento={contenido.jefe.reintentable}
          xpBase={REGLAS.xpJefe}
          alAcertar={() => registrarEnLibro(jefe)}
          onTerminar={(ok, fallos, errores) => {
            const acumulado: ResultadoEjercicio = {
              ...jefeResultado,
              primerIntento: jefeResultado.primerIntento && ok && fallos === 0,
              fallos: jefeResultado.fallos + (ok ? fallos : Math.max(1, fallos)),
              errores: [...jefeResultado.errores, ...errores],
            };
            setJefeResultado(acumulado);
            if (ok) terminarNivel(acumulado);
            else {
              setIntentosJefe((n) => n + 1);
              setJefe(contenido.generarJefe(crearRng(semillaAleatoria())));
            }
          }}
        >
          {(api) => (
            <>
              <h2 className="mb-1 text-xl font-extrabold">⚔️ {contenido.jefe.titulo}</h2>
              {intentosJefe > 0 && <p className="mb-2 text-sm font-bold text-amber-600">Intento {intentosJefe + 1}: un desafío nuevo.</p>}
              <VistaEjercicio ej={jefe} api={api} />
            </>
          )}
        </MarcoEjercicio>
      )}

      {fase === 'fin' && (
        <div className="aparecer space-y-5 text-center">
          <Confeti />
          <p className="text-7xl">🏆</p>
          <h2 className="text-3xl font-extrabold">¡Nivel {info.numero} completado!</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Dato valor={`+${sesion.xpSesion}`} etiqueta="XP ganado" />
            <Dato valor={`+${(progreso.chispas - chispasInicioNivel).toLocaleString('es-CL')} ✨`} etiqueta="Chispas de saber" />
            <Dato valor={`+${REGLAS.curacionNivel}`} etiqueta="Caja recuperada" />
            <Dato
              valor={jefeResultado.primerIntento ? '🎯' : `${intentosJefe + 1}`}
              etiqueta={jefeResultado.primerIntento ? 'Jefe al primer intento' : 'Intentos del jefe'}
            />
          </div>
          <Dialogo emoji={contenido.intro.emoji} nombre={contenido.intro.personaje}>
            {contenido.cierre}
          </Dialogo>
          <div className="grid gap-2">
            <Boton onClick={onSalir}>Volver al mapa</Boton>
            <BotonCompartir datos={datosAvance(progreso, `¡Completé el Nivel ${info.numero} de Contabilidad Pro!`, [info.titulo], premio)} />
            <Boton variante="secundario" onClick={onVerPremios}>
              ☁️ Ver mi camino de premios
            </Boton>
            <Boton variante="secundario" onClick={onVerEmpresa}>
              Ver el libro de mi empresa
            </Boton>
          </div>
        </div>
      )}
    </div>
  );
}

function Dato({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-white p-3">
      <p className="text-xl font-extrabold text-emerald-600">{valor}</p>
      <p className="text-xs font-bold text-slate-500">{etiqueta}</p>
    </div>
  );
}
