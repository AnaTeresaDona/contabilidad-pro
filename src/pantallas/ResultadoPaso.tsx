import type { RegistroPaso } from '../engine/progreso';
import { REGLAS } from '../engine/recompensas';
import { diagnosticar, formatoDuracion, precision } from '../engine/estadisticas';
import { infoError } from '../engine/errores';
import { Boton, Tarjeta } from '../componentes/ui';
import { Confeti } from '../componentes/Efectos';
import { BotonCompartir } from '../componentes/Compartir';
import type { DatosCompartir } from '../lib/compartir';

/** Pantalla al terminar un paso: estrellas, estadísticas, fortalezas, debilidades y qué hacer ahora. */
export function ResultadoPaso({
  numero,
  titulo,
  esTrivia,
  registro,
  completado,
  estrellas,
  chispas,
  previo,
  compartir,
  siguiente,
  onRefuerzo,
  onRepetir,
  onApuntes,
  onVolver,
}: {
  numero: number;
  titulo: string;
  esTrivia: boolean;
  registro: RegistroPaso;
  completado: boolean;
  estrellas: number;
  chispas: number;
  previo: RegistroPaso | null;
  compartir: DatosCompartir;
  siguiente: { texto: string; accion: () => void };
  onRefuerzo?: () => void;
  onRepetir: () => void;
  onApuntes: () => void;
  onVolver: () => void;
}) {
  const prec = precision(registro);
  const d = diagnosticar(registro);
  const tema = (t: string) => registro.temas[t];

  return (
    <div className="aparecer space-y-4">
      {completado && estrellas === 3 && <Confeti />}
      <div className="text-center">
        <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
          Paso {numero} · {titulo}
        </p>
        <h2 className="text-2xl font-extrabold">
          {completado ? (estrellas === 3 ? '¡Perfecto!' : '¡Paso superado!') : `Necesitas ${REGLAS.triviaMinimo} de ${REGLAS.triviaPreguntas} para avanzar`}
        </h2>
        <p className="mt-1 text-5xl tracking-wide" aria-label={`${completado ? estrellas : 0} de 3 estrellas`}>
          {[1, 2, 3].map((i) => (
            <span key={i} className={i <= (completado ? estrellas : 0) ? 'aparecer inline-block' : 'inline-block opacity-25 grayscale'}>
              ⭐
            </span>
          ))}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Dato valor={`${registro.aciertosPrimera}/${registro.ejercicios}`} detalle={`${prec}% al primer intento`} />
        <Dato valor={formatoDuracion(registro.segundos)} detalle="Tiempo del paso" />
        <Dato valor={`+${chispas.toLocaleString('es-CL')} ✨`} detalle={completado ? 'Bono del paso' : 'Las chispas de tus aciertos ya son tuyas'} />
        <Dato valor={String(registro.fallos)} detalle={registro.fallos === 1 ? 'Error' : 'Errores'} />
      </div>

      {previo && <Comparacion antes={previo} ahora={registro} />}

      {d.fortalezas.length > 0 && (
        <Tarjeta>
          <p className="mb-2 font-extrabold text-emerald-700">💪 Tus fortalezas</p>
          <div className="flex flex-wrap gap-1.5">
            {d.fortalezas.map((t) => (
              <span key={t} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                ✓ {t}
              </span>
            ))}
          </div>
        </Tarjeta>
      )}

      {d.debilidades.length > 0 && (
        <Tarjeta className="border-amber-200">
          <p className="mb-2 font-extrabold text-amber-700">🎯 Para reforzar</p>
          <ul className="space-y-1.5 text-sm">
            {d.debilidades.map((t) => (
              <li key={t} className="flex items-center justify-between gap-2">
                <span className="font-bold">{t}</span>
                <span className="shrink-0 text-xs font-extrabold text-amber-700">
                  {tema(t).ok} de {tema(t).total} al primer intento
                </span>
              </li>
            ))}
          </ul>
          {d.erroresFrecuentes.length > 0 && (
            <>
              <p className="mb-1 mt-3 text-xs font-extrabold uppercase text-slate-400">Errores que más cometiste</p>
              <ul className="space-y-1 text-sm">
                {d.erroresFrecuentes.slice(0, 3).map((e) => (
                  <li key={e.tipo} className="flex justify-between gap-2">
                    <span>{infoError(e.tipo).titulo}</span>
                    <span className="shrink-0 font-extrabold text-rose-600">×{e.veces}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Tarjeta>
      )}

      {d.debilidades.length === 0 && (
        <Tarjeta className="text-center text-sm font-bold text-emerald-700">🌟 Todo salió al primer intento. ¡No hay debilidades en este paso!</Tarjeta>
      )}

      <div className="grid gap-2 pb-4">
        <Boton onClick={siguiente.accion}>{siguiente.texto}</Boton>
        {onRefuerzo && (
          <Boton variante="aviso" onClick={onRefuerzo}>
            🎯 Practicar mis debilidades <span className="font-bold normal-case opacity-80">(opcional)</span>
          </Boton>
        )}
        {esTrivia && !completado && (
          <Boton variante="secundario" onClick={onApuntes}>
            📖 Repasar los apuntes
          </Boton>
        )}
        <BotonCompartir datos={compartir} />
        {completado && (
          <Boton variante="secundario" onClick={onRepetir}>
            Repetir este paso
          </Boton>
        )}
        <Boton variante="fantasma" onClick={onVolver}>
          Volver al nivel
        </Boton>
      </div>
    </div>
  );
}

function Dato({ valor, detalle }: { valor: string; detalle: string }) {
  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-white p-3 text-center">
      <p className="text-2xl font-extrabold text-slate-800">{valor}</p>
      <p className="text-xs font-bold text-slate-500">{detalle}</p>
    </div>
  );
}

function Comparacion({ antes, ahora }: { antes: RegistroPaso; ahora: RegistroPaso }) {
  const pa = precision(antes);
  const pn = precision(ahora);
  const mejor = pn > pa || (pn === pa && ahora.fallos < antes.fallos);
  const peor = pn < pa || (pn === pa && ahora.fallos > antes.fallos);
  const texto = mejor
    ? `📈 Mejoraste: ${pn}% al primer intento (la vez anterior, ${pa}%) y ${ahora.fallos} error(es) (antes, ${antes.fallos}).`
    : peor
      ? `📉 Esta vez costó más: ${pn}% al primer intento (antes, ${pa}%). ¡Es normal! Refuerza tus debilidades y vuelve a intentarlo.`
      : `➡️ Igual que la vez anterior: ${pn}% al primer intento.`;
  const rapidez =
    ahora.segundos < antes.segundos * 0.85 ? ` Y lo hiciste más rápido (${formatoDuracion(ahora.segundos)} vs ${formatoDuracion(antes.segundos)}).` : '';
  return (
    <p className={`rounded-2xl p-3 text-sm font-bold ${mejor ? 'bg-emerald-50 text-emerald-800' : peor ? 'bg-amber-50 text-amber-900' : 'bg-slate-100 text-slate-700'}`}>
      {texto}
      {rapidez}
    </p>
  );
}
