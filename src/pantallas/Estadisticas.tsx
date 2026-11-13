import { useState } from 'react';
import { NIVELES, CONTENIDO } from '../content';
import { premioActual } from '../content/premios';
import { infoError } from '../engine/errores';
import { estadoNivel, fechaISO, PASOS_NIVEL, pasoCompletado } from '../engine/progreso';
import { erroresHistoricos, erroresPorEjercicio, formatoDuracion, precision, temasHistoricos, tendencia } from '../engine/estadisticas';
import { useProgreso } from '../estado/Progreso';
import { Tarjeta } from '../componentes/ui';
import { BotonCompartir } from '../componentes/Compartir';
import { datosAvance } from '../lib/compartir';

function diasAtras(n: number): string[] {
  const hoy = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() - (n - 1 - i));
    return fechaISO(d);
  });
}

const DIA_SEMANA = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

export function Estadisticas() {
  const { progreso } = useProgreso();
  const [vista, setVista] = useState<'grafico' | 'tabla'>('grafico');
  const { historial, tiempo } = progreso;
  const dias = diasAtras(14);
  const minutos = dias.map((d) => Math.round((tiempo.porDia[d] ?? 0) / 60));
  const maxMin = Math.max(10, ...minutos);
  const hoy = tiempo.porDia[fechaISO()] ?? 0;
  const semana = diasAtras(7).reduce((s, d) => s + (tiempo.porDia[d] ?? 0), 0);
  const diasJugados = Object.values(tiempo.porDia).filter((s) => s > 0).length;

  const t = tendencia(historial);
  const recientes = historial.slice(-20);
  const errores = erroresHistoricos(historial);
  const temas = temasHistoricos(historial);
  const debiles = temas.filter((x) => x.total >= 2).sort((a, b) => a.ok / a.total - b.ok / b.total).slice(0, 4);
  const fuertes = temas
    .filter((x) => x.total >= 2 && x.ok / x.total >= 0.8)
    .sort((a, b) => b.ok / b.total - a.ok / a.total || b.total - a.total)
    .slice(0, 4);
  const pasosHechos = NIVELES.filter((n) => CONTENIDO[n.id]).reduce((s, n) => s + PASOS_NIVEL.filter((p) => pasoCompletado(progreso, n.id, p)).length, 0);
  const premio = premioActual(progreso.chispas);

  const veredicto = {
    mejorando: { emoji: '📈', texto: `¡Vas mejorando! Cometes ${Math.abs(t.variacion)}% menos errores por ejercicio que al comienzo.`, clase: 'bg-emerald-50 text-emerald-800' },
    igual: { emoji: '➡️', texto: 'Te mantienes estable: cometes más o menos los mismos errores que al comienzo. Prueba reforzando tus debilidades.', clase: 'bg-slate-100 text-slate-700' },
    empeorando: { emoji: '🧗', texto: `Ahora cometes ${t.variacion}% más errores por ejercicio, ¡pero los pasos nuevos son más difíciles! Es normal al subir de nivel.`, clase: 'bg-amber-50 text-amber-900' },
    sin_datos: { emoji: '🌱', texto: 'Juega algunos pasos más y aquí verás si vas mejorando.', clase: 'bg-slate-100 text-slate-700' },
  }[t.veredicto];

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Cifra valor={formatoDuracion(hoy)} etiqueta="Jugado hoy" />
        <Cifra valor={formatoDuracion(semana)} etiqueta="Últimos 7 días" />
        <Cifra valor={formatoDuracion(tiempo.total)} etiqueta="Tiempo total" />
        <Cifra valor={`${progreso.racha} 🔥`} etiqueta={`Racha · ${diasJugados} ${diasJugados === 1 ? 'día jugado' : 'días jugados'}`} />
      </section>

      <Tarjeta>
        <div className="mb-2 flex items-center justify-between">
          <p className="font-extrabold">⏱️ Minutos jugados por día</p>
          <div className="flex rounded-full bg-slate-100 p-0.5 text-xs font-extrabold">
            {(['grafico', 'tabla'] as const).map((v) => (
              <button key={v} onClick={() => setVista(v)} className={`rounded-full px-2.5 py-1 ${vista === v ? 'bg-white shadow-sm' : 'text-slate-500'}`}>
                {v === 'grafico' ? 'Gráfico' : 'Tabla'}
              </button>
            ))}
          </div>
        </div>
        {vista === 'grafico' ? (
          <div className="flex h-36 items-end gap-1 border-b border-slate-200" role="img" aria-label="Minutos jugados en los últimos 14 días">
            {minutos.map((m, i) => (
              <div key={dias[i]} className="group relative flex h-full flex-1 flex-col items-center justify-end" title={`${dias[i]}: ${m} min`}>
                {m > 0 && <span className="mb-0.5 text-[10px] font-bold text-slate-500 opacity-0 group-hover:opacity-100">{m}</span>}
                <div className="w-full max-w-[18px] rounded-t bg-violet-500 transition-all group-hover:bg-violet-600" style={{ height: `${(m / maxMin) * 100}%`, minHeight: m > 0 ? 3 : 0 }} />
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {dias
                .map((d, i) => [d, minutos[i]] as const)
                .reverse()
                .map(([d, m]) => (
                  <tr key={d} className="border-b border-slate-100">
                    <td className="py-1">{d}</td>
                    <td className="py-1 text-right font-bold tabular-nums">{m} min</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
        {vista === 'grafico' && (
          <div className="mt-1 flex gap-1 text-center text-[10px] font-bold text-slate-400">
            {dias.map((d) => (
              <span key={d} className="flex-1">
                {DIA_SEMANA[new Date(`${d}T12:00:00`).getDay()]}
              </span>
            ))}
          </div>
        )}
      </Tarjeta>

      <Tarjeta>
        <p className="mb-2 font-extrabold">📊 ¿Estoy mejorando?</p>
        <p className={`rounded-xl p-3 text-sm font-bold ${veredicto.clase}`}>
          {veredicto.emoji} {veredicto.texto}
        </p>
        {t.veredicto !== 'sin_datos' && (
          <p className="mt-2 text-xs text-slate-500">
            Errores por ejercicio: al comienzo {t.antes.toFixed(2).replace('.', ',')} · ahora {t.ahora.toFixed(2).replace('.', ',')} · en total{' '}
            {erroresPorEjercicio(historial).toFixed(2).replace('.', ',')}.
          </p>
        )}
        {recientes.length > 0 && (
          <>
            <p className="mb-1 mt-3 text-xs font-extrabold uppercase text-slate-400">Aciertos al primer intento · últimos {recientes.length} pasos</p>
            <div className="flex h-24 items-end gap-1 border-b border-slate-200" role="img" aria-label="Porcentaje de aciertos al primer intento en los últimos pasos">
              {recientes.map((r, i) => {
                const pr = precision(r);
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-t bg-emerald-500 hover:bg-emerald-600"
                    style={{ height: `${Math.max(pr, 2)}%` }}
                    title={`Nivel ${r.nivel.replace('n', '').toUpperCase()} · ${r.paso} · ${pr}% · ${r.fallos} error(es) · ${formatoDuracion(r.segundos)}`}
                  />
                );
              })}
            </div>
            <p className="mt-1 text-[10px] font-bold text-slate-400">← más antiguo · más reciente →</p>
          </>
        )}
      </Tarjeta>

      {errores.length > 0 && (
        <Tarjeta>
          <p className="mb-2 font-extrabold">🔁 Errores que más se repiten</p>
          <ul className="space-y-1.5 text-sm">
            {errores.map((e) => {
              const hayTendencia = historial.length >= 4;
              const flecha = !hayTendencia ? '' : e.recientes < e.antiguos ? '↓ bajando' : e.recientes > e.antiguos ? '↑ subiendo' : '= igual';
              const clase = e.recientes < e.antiguos ? 'text-emerald-600' : e.recientes > e.antiguos ? 'text-rose-600' : 'text-slate-400';
              return (
                <li key={e.tipo} className="flex items-center justify-between gap-2">
                  <span>{infoError(e.tipo).titulo}</span>
                  <span className="shrink-0 text-xs font-extrabold">
                    ×{e.veces} <span className={clase}>{flecha}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </Tarjeta>
      )}

      {(fuertes.length > 0 || debiles.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Tarjeta>
            <p className="mb-2 font-extrabold text-emerald-700">💪 Tus fortalezas</p>
            {fuertes.length ? (
              <ul className="space-y-1 text-sm">
                {fuertes.map((x) => (
                  <li key={x.tema} className="flex justify-between gap-2">
                    <span>{x.tema}</span>
                    <span className="shrink-0 font-extrabold text-emerald-700">{Math.round((x.ok / x.total) * 100)}%</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Sigue jugando para descubrirlas.</p>
            )}
          </Tarjeta>
          <Tarjeta>
            <p className="mb-2 font-extrabold text-amber-700">🎯 Para reforzar</p>
            {debiles.length ? (
              <ul className="space-y-1 text-sm">
                {debiles.map((x) => (
                  <li key={x.tema} className="flex justify-between gap-2">
                    <span>{x.tema}</span>
                    <span className="shrink-0 font-extrabold text-amber-700">{Math.round((x.ok / x.total) * 100)}%</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">¡Nada pendiente por ahora!</p>
            )}
          </Tarjeta>
        </div>
      )}

      <Tarjeta>
        <p className="mb-2 font-extrabold">🗺️ Pasos por nivel</p>
        <ul className="space-y-1.5 text-sm">
          {NIVELES.filter((n) => CONTENIDO[n.id]).map((n) => {
            const e = estadoNivel(progreso, n.id);
            return (
              <li key={n.id} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate">
                  <b>Nivel {n.numero}</b> · {n.titulo}
                </span>
                <span className="shrink-0 text-xs tracking-tighter" aria-label={`Pasos completados del nivel ${n.numero}`}>
                  {PASOS_NIVEL.map((p) => (pasoCompletado(progreso, n.id, p) ? (e.pasos?.[p]?.estrellas === 3 ? '🌟' : '⭐') : '▫️')).join('')}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-slate-400">⭐ paso completado · 🌟 con 3 estrellas · ▫️ pendiente</p>
      </Tarjeta>

      <BotonCompartir
        className="w-full"
        variante="primario"
        datos={datosAvance(
          progreso,
          `Llevo ${formatoDuracion(tiempo.total)} aprendiendo contabilidad`,
          [`${pasosHechos} pasos completados`, ...(t.veredicto === 'mejorando' ? [`${Math.abs(t.variacion)}% menos errores que al comienzo 📈`] : [])],
          premio,
        )}
      />
    </div>
  );
}

function Cifra({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-white p-3">
      <p className="text-xl font-extrabold text-slate-800">{valor}</p>
      <p className="text-xs font-bold text-slate-500">{etiqueta}</p>
    </div>
  );
}
