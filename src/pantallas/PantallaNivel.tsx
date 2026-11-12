import { useMemo, useState } from 'react';
import { CONTENIDO, infoNivel } from '../content';
import { crearRng, elegirVarios, semillaAleatoria } from '../engine/azar';
import type { Ejercicio } from '../engine/ejercicios';
import { nuevoId } from '../engine/plantillas';
import { actualizarNivel, agregarRepaso, cambiarHp, estadoNivel, fechaISO, HP_MAX, registrarAsiento } from '../engine/progreso';
import { REGLAS } from '../engine/recompensas';
import { calcularIva, formatoCLP } from '../engine/dinero';
import { useProgreso } from '../estado/Progreso';
import { ProveedorSesion, useSesion } from '../estado/Sesion';
import { MarcoEjercicio } from '../juego/MarcoEjercicio';
import { PreguntaVista } from '../juego/ejercicios/PreguntaVista';
import { EjClasificar } from '../juego/ejercicios/EjClasificar';
import { EjDebeHaber } from '../juego/ejercicios/EjDebeHaber';
import { EjCompletar } from '../juego/ejercicios/EjCompletar';
import { EjCuentaT } from '../juego/ejercicios/EjCuentaT';
import { EjJefe } from '../juego/ejercicios/EjJefe';
import { EjMayorizar } from '../juego/ejercicios/EjMayorizar';
import { EjColumna8 } from '../juego/ejercicios/EjColumna8';
import { EjBalance8 } from '../juego/ejercicios/EjBalance8';
import { EjBalanceGeneral, EjEstadoResultados, EjEstadosCompletos, EjSecciones } from '../juego/ejercicios/EjEstados';
import { EjCalculo } from '../juego/ejercicios/EjCalculo';
import { EjAjustesCierre } from '../juego/ejercicios/EjAjustesCierre';
import { EjFiscalizacion } from '../juego/ejercicios/EjFiscalizacion';
import { EjClasificarPartidas, EjOperacionRenta } from '../juego/ejercicios/EjPartidas';
import { EjClasificarOpciones } from '../juego/ejercicios/EjClasificarOpciones';
import { EjCrisis } from '../juego/ejercicios/EjCrisis';
import type { ApiEjercicio } from '../juego/MarcoEjercicio';
import { Boton, COLORES, Dialogo, Tarjeta } from '../componentes/ui';
import { Confeti, Modal } from '../componentes/Efectos';

type Fase = 'intro' | 'trivia' | 'resultadoTrivia' | 'practica' | 'jefeIntro' | 'jefe' | 'fin';

export function PantallaNivel({ id, onSalir, onVerEmpresa }: { id: string; onSalir: () => void; onVerEmpresa: () => void }) {
  const { obtener } = useProgreso();
  const [insolvente, setInsolvente] = useState(() => obtener().hp === 0);
  const [reinicio, setReinicio] = useState(0);

  return (
    <ProveedorSesion key={reinicio} onInsolvencia={() => setInsolvente(true)} etiquetaDanio={CONTENIDO[id]?.etiquetaDanio}>
      <Partida id={id} onSalir={onSalir} onVerEmpresa={onVerEmpresa} pausada={insolvente} />
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
          Los errores le costaron toda la caja a la empresa. Tranquilo: conservas tu XP. El banco te da un crédito puente para volver a intentarlo.
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

function Partida({ id, onSalir, onVerEmpresa, pausada }: { id: string; onSalir: () => void; onVerEmpresa: () => void; pausada: boolean }) {
  const contenido = CONTENIDO[id];
  const info = infoNivel(id);
  const color = COLORES[info.color];
  const { progreso, actualizar } = useProgreso();
  const sesion = useSesion();
  const triviaAprobada = estadoNivel(progreso, id).triviaAprobada;

  const [fase, setFase] = useState<Fase>('intro');
  const [semilla, setSemilla] = useState(semillaAleatoria);
  const [indice, setIndice] = useState(0);
  const [resultados, setResultados] = useState<boolean[]>([]);
  const [intentosJefe, setIntentosJefe] = useState(0);
  const [jefePrimerIntento, setJefePrimerIntento] = useState(false);

  const preguntas = useMemo(() => elegirVarios(crearRng(semilla), contenido.preguntas, REGLAS.triviaPreguntas), [semilla, contenido]);
  const ejercicios = useMemo(() => contenido.generarPractica(crearRng(semilla + 1)), [semilla, contenido]);
  const jefe = useMemo(() => contenido.generarJefe(crearRng(semilla + 100 + intentosJefe)), [semilla, intentosJefe, contenido]);

  const empezarTrivia = () => {
    setSemilla(semillaAleatoria());
    setIndice(0);
    setResultados([]);
    setFase('trivia');
  };
  const empezarPractica = () => {
    setSemilla(semillaAleatoria());
    setIndice(0);
    setFase('practica');
  };

  /** Los asientos bien hechos pasan al libro de la empresa del jugador. */
  const registrarEnLibro = (ej: Ejercicio) => {
    const nuevos =
      ej.tipo === 'debeHaber' || ej.tipo === 'completar' ? [ej.trans.asiento] : ej.tipo === 'balance8' || ej.tipo === 'estados'
          ? ej.asientos
          : ej.tipo === 'ajustesCierre'
            ? ej.datos.ajustes.map((t) => t.asiento)
            : [];
    if (nuevos.length === 0) return;
    actualizar((p) => nuevos.reduce((q, a) => registrarAsiento(q, { ...a, id: nuevoId(), fecha: fechaISO() }), p));
  };

  const terminarNivel = (primerIntento: boolean) => {
    setJefePrimerIntento(primerIntento);
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
    setFase('fin');
  };

  // Barra de avance del nivel: 5 trivia + 5 práctica + jefe.
  const pasos = REGLAS.triviaPreguntas + ejercicios.length + 1;
  const hecho =
    fase === 'trivia'
      ? indice
      : fase === 'resultadoTrivia'
        ? REGLAS.triviaPreguntas
        : fase === 'practica'
          ? REGLAS.triviaPreguntas + indice
          : fase === 'jefeIntro' || fase === 'jefe'
            ? pasos - 1
            : fase === 'fin'
              ? pasos
              : 0;

  return (
    <div className={pausada ? 'pointer-events-none' : ''}>
      {fase !== 'intro' && (
        <div className="mb-5 flex items-center gap-3">
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200">
            <div className={`h-full rounded-full transition-all duration-500 ${color.fondo}`} style={{ width: `${(hecho / pasos) * 100}%` }} />
          </div>
          {sesion.combo >= REGLAS.comboDesde && <span className="latido text-sm font-extrabold text-orange-500">🔥x{sesion.combo}</span>}
        </div>
      )}

      {fase === 'intro' && (
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
          <Tarjeta className="text-sm text-slate-600">
            <p className="mb-1 font-extrabold text-slate-700">Cómo se juega</p>
            <ol className="list-decimal space-y-0.5 pl-5">
              <li>
                Trivia: {REGLAS.triviaPreguntas} preguntas. Necesitas {REGLAS.triviaMinimo} correctas.
              </li>
              <li>Práctica: operaciones con montos distintos cada vez. Puedes reintentar.</li>
              <li>Jefe final: un desafío para cerrar el nivel.</li>
            </ol>
            <p className="mt-2">Cada error grave le cuesta caja a la empresa 💰. Si llega a cero, entras en insolvencia.</p>
          </Tarjeta>
          <div className="grid gap-2">
            {triviaAprobada ? (
              <>
                <Boton onClick={empezarPractica}>Ir a la práctica</Boton>
                <Boton variante="secundario" onClick={empezarTrivia}>
                  Repetir la trivia
                </Boton>
              </>
            ) : (
              <Boton onClick={empezarTrivia}>Comenzar trivia</Boton>
            )}
          </div>
        </div>
      )}

      {fase === 'trivia' && (
        <MarcoEjercicio
          key={`t-${semilla}-${indice}`}
          permitirReintento={false}
          alFallar={() => actualizar((p) => agregarRepaso(p, preguntas[indice].id))}
          onTerminar={(ok) => {
            const nuevos = [...resultados, ok];
            setResultados(nuevos);
            if (indice + 1 < preguntas.length) setIndice(indice + 1);
            else {
              if (nuevos.filter(Boolean).length >= REGLAS.triviaMinimo) actualizar((p) => actualizarNivel(p, id, { triviaAprobada: true }));
              setFase('resultadoTrivia');
            }
          }}
        >
          {(api) => (
            <>
              <p className="mb-2 text-xs font-extrabold uppercase text-slate-400">
                Pregunta {indice + 1} de {preguntas.length}
              </p>
              <PreguntaVista pregunta={preguntas[indice]} api={api} />
            </>
          )}
        </MarcoEjercicio>
      )}

      {fase === 'resultadoTrivia' && (
        <ResultadoTrivia
          aciertos={resultados.filter(Boolean).length}
          onPractica={empezarPractica}
          onReintentar={empezarTrivia}
        />
      )}

      {fase === 'practica' && (
        <MarcoEjercicio
          key={`p-${semilla}-${indice}`}
          pista={pistaDe(ejercicios[indice])}
          alAcertar={() => registrarEnLibro(ejercicios[indice])}
          onTerminar={() => {
            if (indice + 1 < ejercicios.length) setIndice(indice + 1);
            else setFase('jefeIntro');
          }}
        >
          {(api) => (
            <>
              <p className="mb-2 text-xs font-extrabold uppercase text-slate-400">
                Práctica {indice + 1} de {ejercicios.length}
              </p>
              <VistaEjercicio ej={ejercicios[indice]} api={api} />
            </>
          )}
        </MarcoEjercicio>
      )}

      {fase === 'jefeIntro' && (
        <div className="aparecer space-y-5">
          <div className="rounded-3xl bg-slate-800 p-5 text-white">
            <p className="text-sm font-extrabold uppercase text-amber-300">⚔️ Jefe final</p>
            <h2 className="text-2xl font-extrabold">{contenido.jefe.titulo}</h2>
          </div>
          <Dialogo emoji={contenido.jefe.emoji} nombre={contenido.jefe.nombre}>
            {contenido.jefe.texto}
          </Dialogo>
          <p className="text-center text-sm text-slate-500">
            Recompensa: +{REGLAS.xpJefe} XP. {contenido.jefe.avisoFallo}
          </p>
          <Boton className="w-full" onClick={() => setFase('jefe')}>
            Aceptar el desafío
          </Boton>
        </div>
      )}

      {fase === 'jefe' && (
        <MarcoEjercicio
          key={`j-${semilla}-${intentosJefe}`}
          permitirReintento={contenido.jefe.reintentable}
          xpBase={REGLAS.xpJefe}
          alAcertar={() => registrarEnLibro(jefe)}
          onTerminar={(ok, fallos) => {
            if (ok) terminarNivel(intentosJefe === 0 && fallos === 0);
            else setIntentosJefe((n) => n + 1);
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
          <div className="grid grid-cols-3 gap-2">
            <Dato valor={`+${sesion.xpSesion}`} etiqueta="XP ganado" />
            <Dato valor={`+${REGLAS.curacionNivel}`} etiqueta="Caja recuperada" />
            <Dato valor={jefePrimerIntento ? '🎯' : `${intentosJefe + 1}`} etiqueta={jefePrimerIntento ? 'Jefe al primer intento' : 'Intentos del jefe'} />
          </div>
          <Dialogo emoji={contenido.intro.emoji} nombre={contenido.intro.personaje}>
            {contenido.cierre}
          </Dialogo>
          <div className="grid gap-2">
            <Boton onClick={onSalir}>Volver al mapa</Boton>
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
      <p className="text-2xl font-extrabold text-emerald-600">{valor}</p>
      <p className="text-xs font-bold text-slate-500">{etiqueta}</p>
    </div>
  );
}

function ResultadoTrivia({ aciertos, onPractica, onReintentar }: { aciertos: number; onPractica: () => void; onReintentar: () => void }) {
  const aprobada = aciertos >= REGLAS.triviaMinimo;
  return (
    <div className="aparecer space-y-4 text-center">
      <p className="text-6xl">{aprobada ? '🎉' : '📖'}</p>
      <h2 className="text-2xl font-extrabold">
        {aciertos} de {REGLAS.triviaPreguntas} correctas
      </h2>
      <p className="text-slate-600">
        {aprobada
          ? '¡Trivia aprobada! Desbloqueaste la práctica.'
          : `Necesitas ${REGLAS.triviaMinimo} para avanzar. Las preguntas que fallaste quedaron en tu mazo de Repaso.`}
      </p>
      {aprobada ? (
        <Boton className="w-full" onClick={onPractica}>
          Ir a la práctica
        </Boton>
      ) : (
        <Boton className="w-full" onClick={onReintentar}>
          Intentar de nuevo
        </Boton>
      )}
    </div>
  );
}

function pistaDe(ej: Ejercicio): string {
  switch (ej.tipo) {
    case 'clasificar':
      return 'Activo: lo que la empresa tiene o le deben. Pasivo: lo que debe. Patrimonio: lo de los dueños. Ingreso: lo que gana por su actividad. Gasto: lo que consume para funcionar.';
    case 'cuentaT':
      return 'Suma cada lado por separado y resta el menor al mayor. El saldo toma el nombre del lado mayor: Debe → deudor, Haber → acreedor.';
    case 'debeHaber':
      return ej.trans.pista;
    case 'completar': {
      const v = ej.trans.valores;
      return ej.trans.conIva
        ? `${ej.trans.pista} Neto ${formatoCLP(v.neto)}, IVA ${formatoCLP(v.iva ?? calcularIva(v.neto))}, total ${formatoCLP(v.total)}.`
        : ej.trans.pista;
    }
    case 'pregunta':
      return 'Piensa quién es el comprador (¿consumidor final o empresa?) y si la operación crea, aumenta, rebaja o solo traslada.';
    case 'mayorizar':
      return 'Recorre los asientos uno por uno: cada vez que aparezca la cuenta, anota su monto en el mismo lado (Debe o Haber) de la Cuenta T. Después suma cada lado y resta.';
    case 'columna8':
      return 'Activo → Activo. Pasivo y Patrimonio → Pasivo. Gastos → Pérdidas. Ingresos → Ganancias.';
    case 'balance8':
      return 'Saldo = lado mayor − lado menor. Activo, Pasivo y Patrimonio van a Inventario; Ingresos y Gastos a Resultados. Resultado = Ganancias − Pérdidas.';
    case 'libroErrores':
      return 'Revisa cada asiento: ¿cuadra? ¿las cuentas son las de la operación? ¿cada una está en su lado? ¿el IVA es 19% del neto?';
    case 'secciones':
      return 'Activos y pasivos: ¿se cobran, usan o pagan en menos de 12 meses (corriente) o en más (no corriente)? Ingresos y gastos van al Estado de Resultados.';
    case 'eerr':
      return 'Margen bruto = Ventas − Costo de ventas. Resultado operacional = Margen bruto − gastos de administración y ventas. Antes de impuesto = Resultado operacional + otros ingresos − gastos financieros.';
    case 'bg':
    case 'estados':
      return 'Caja, banco, clientes, mercaderías e IVA crédito son corrientes; los activos fijos, no corrientes. El préstamo bancario va como no corriente. El resultado del ejercicio va en Patrimonio.';
    case 'calculo':
      return ej.datos.pista;
    case 'ajustesCierre':
      return 'Cada ajuste es un gasto contra una cuenta de balance: depreciación → Depreciación acumulada; deterioro → Estimación de incobrables o Mercaderías; provisión → Provisiones; devengo → Remuneraciones por pagar; anticipo → Arriendo pagado por anticipado. Resultado ajustado = resultado anterior − gastos de los ajustes.';
    case 'fiscalizacion':
      return 'Busca: arriendos largos registrados solo como gasto (NIIF 16), hechos esenciales informados tarde, dividendos bajo el 30% sin unanimidad, investigación capitalizada, uso de información privilegiada, activos deteriorados sin ajustar o estados anuales sin auditoría.';
    case 'clasificarPartidas':
    case 'operacionRenta':
      return 'Agregados: multas fiscales, provisiones y estimaciones no pagadas, deterioros contables, gastos sin respaldo o personales. Deducciones: dividendos de S.A. chilenas, mayor depreciación acelerada, provisiones de años anteriores pagadas este año. Gastos necesarios y acreditados: sin ajuste. RLI = resultado + agregados − deducciones; impuesto = RLI × 27%; saldo = impuesto − PPM.';
    case 'clasificarOpciones':
      return 'Liquidez: ¿puedo pagar lo que vence pronto? Endeudamiento: ¿cuánto debo? Rentabilidad: ¿cuánto gano? Actividad: ¿qué tan rápido cobro, vendo y pago?';
    case 'crisis':
      return 'Razón corriente = activo corriente ÷ pasivo corriente. Días de cobro = clientes ÷ ventas × 365. Flujo operacional = utilidad + depreciación − aumento de clientes − aumento de inventario + aumento de proveedores.';
  }
}

function VistaEjercicio({ ej, api }: { ej: Ejercicio; api: ApiEjercicio }) {
  switch (ej.tipo) {
    case 'pregunta':
      return <PreguntaVista pregunta={ej.pregunta} api={api} />;
    case 'mayorizar':
      return <EjMayorizar datos={ej.datos} api={api} />;
    case 'columna8':
      return <EjColumna8 cuentas={ej.cuentas} api={api} />;
    case 'balance8':
      return <EjBalance8 asientos={ej.asientos} balance={ej.balance} api={api} />;
    case 'libroErrores':
      return <EjJefe libro={ej.libro} api={api} />;
    case 'secciones':
      return <EjSecciones cuentas={ej.cuentas} api={api} />;
    case 'eerr':
      return <EjEstadoResultados balance={ej.balance} api={api} />;
    case 'bg':
      return <EjBalanceGeneral balance={ej.balance} api={api} />;
    case 'estados':
      return <EjEstadosCompletos asientos={ej.asientos} balance={ej.balance} api={api} />;
    case 'calculo':
      return <EjCalculo datos={ej.datos} api={api} />;
    case 'ajustesCierre':
      return <EjAjustesCierre datos={ej.datos} api={api} />;
    case 'fiscalizacion':
      return <EjFiscalizacion afirmaciones={ej.afirmaciones} api={api} />;
    case 'clasificarPartidas':
      return <EjClasificarPartidas partidas={ej.partidas} api={api} />;
    case 'operacionRenta':
      return <EjOperacionRenta datos={ej.datos} api={api} />;
    case 'clasificarOpciones':
      return <EjClasificarOpciones datos={ej.datos} api={api} />;
    case 'crisis':
      return <EjCrisis datos={ej.datos} api={api} />;
    case 'clasificar':
      return <EjClasificar cuentas={ej.cuentas} api={api} />;
    case 'debeHaber':
      return <EjDebeHaber trans={ej.trans} orden={ej.orden} api={api} />;
    case 'completar':
      return <EjCompletar trans={ej.trans} opciones={ej.opciones} api={api} />;
    case 'cuentaT':
      return <EjCuentaT datos={ej.datos} api={api} />;
  }
}
