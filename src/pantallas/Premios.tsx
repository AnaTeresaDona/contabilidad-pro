import { useEffect, useRef } from 'react';
import { avanceAlSiguiente, PREMIOS, premioActual, premiosDesbloqueados, siguientePremio, ZONAS, type Zona } from '../content/premios';
import { REGLAS } from '../engine/recompensas';
import { useProgreso } from '../estado/Progreso';
import { IconoPremio } from '../componentes/IconoPremio';
import { BotonCompartir } from '../componentes/Compartir';
import { Tarjeta } from '../componentes/ui';
import { datosAvance } from '../lib/compartir';

/** Orden visual: de arriba (estrellas) hacia abajo (bajo tierra). */
const ORDEN_ZONAS: Zona[] = ['espacio', 'cielo', 'aire', 'bosque', 'tierra', 'subsuelo'];

/** El camino de premios: se recorre de abajo hacia arriba, desde la papita hasta las estrellas. */
export function Premios() {
  const { progreso } = useProgreso();
  const chispas = progreso.chispas;
  const n = premiosDesbloqueados(chispas);
  const actual = premioActual(chispas);
  const sig = siguientePremio(chispas);
  const refActual = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => refActual.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-gradient-to-br from-indigo-600 to-sky-500 p-5 text-white">
        <p className="text-xs font-extrabold uppercase tracking-wider opacity-80">Camino al cielo</p>
        <div className="mt-1 flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white/20">
            <IconoPremio premio={actual} tam={58} />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-extrabold leading-tight">{actual.nombre}</p>
            <p className="text-sm opacity-90">{actual.frase}</p>
            <p className="mt-1 text-lg font-extrabold">{chispas.toLocaleString('es-CL')} ✨ chispas de saber</p>
          </div>
        </div>
        {sig ? (
          <div className="mt-4">
            <div className="h-3 overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-amber-300 transition-all duration-700" style={{ width: `${Math.round(avanceAlSiguiente(chispas) * 100)}%` }} />
            </div>
            <p className="mt-1 text-sm font-bold">
              Te faltan {(sig.umbral - chispas).toLocaleString('es-CL')} ✨ para {sig.nombre}.
            </p>
          </div>
        ) : (
          <p className="mt-3 font-extrabold">¡Llegaste a lo más alto del cielo! Eres leyenda. 🌌</p>
        )}
      </section>

      <Tarjeta className="text-sm text-slate-600">
        <p className="mb-1 font-extrabold text-slate-700">¿Cómo gano chispas? (nunca se pierden)</p>
        <ul className="grid gap-0.5 sm:grid-cols-2">
          <li>✅ Cada acierto: +{REGLAS.chispasAcierto} ✨</li>
          <li>🎯 Al primer intento: +{REGLAS.chispasPrimerIntento} extra</li>
          <li>🔥 En combo: +{REGLAS.chispasCombo} extra</li>
          <li>📅 Primer acierto del día: +{REGLAS.chispasDia}</li>
          <li>⭐ Cada paso: +{REGLAS.chispasPaso} y +{REGLAS.chispasEstrella} por estrella</li>
          <li>🏆 Cada nivel completo: +{REGLAS.chispasNivel}</li>
        </ul>
      </Tarjeta>

      <div className="overflow-hidden rounded-3xl border-2 border-slate-200">
        {ORDEN_ZONAS.map((z) => {
          const premios = PREMIOS.filter((p) => p.zona === z).reverse();
          const zona = ZONAS[z];
          return (
            <section key={z} className={`relative bg-gradient-to-b ${zona.fondo} px-4 py-5 ${zona.texto}`}>
              {z === 'espacio' && <Estrellitas />}
              <p className="relative mb-3 text-center text-xs font-extrabold uppercase tracking-[0.2em] opacity-80">{zona.nombre}</p>
              <ol className="relative space-y-3">
                {premios.map((p) => {
                  const i = PREMIOS.indexOf(p);
                  const tiene = i < n;
                  const esActual = p.id === actual.id;
                  const lado = i % 2 === 0 ? 'mr-auto' : 'ml-auto flex-row-reverse text-right';
                  return (
                    <li key={p.id}>
                      <div ref={esActual ? refActual : undefined} className={`flex max-w-[85%] items-center gap-3 ${lado}`}>
                        <div
                          className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 ${
                            esActual ? 'latido border-amber-300 bg-white/90 shadow-lg shadow-amber-300/50' : tiene ? 'border-white/70 bg-white/80' : 'border-white/20 bg-black/15'
                          }`}
                        >
                          <IconoPremio premio={p} tam={44} apagado={!tiene} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold leading-tight">
                            {p.nombre} {esActual && <span className="rounded-full bg-amber-300 px-2 text-xs text-amber-950">¡Tú estás aquí!</span>}
                          </p>
                          <p className="text-xs opacity-85">{tiene ? p.frase : `Se desbloquea con ${p.umbral.toLocaleString('es-CL')} ✨`}</p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>

      <BotonCompartir
        className="w-full"
        variante="primario"
        datos={datosAvance(progreso, `¡Llegué a ${actual.nombre} en mi camino al cielo de la contabilidad!`, [`${n} de ${PREMIOS.length} premios desbloqueados`], actual)}
      />
    </div>
  );
}

function Estrellitas() {
  const puntos = Array.from({ length: 40 }, (_, i) => ({ x: (i * 37) % 100, y: (i * 53) % 100, r: (i % 3) + 1 }));
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      {puntos.map((p, i) => (
        <circle key={i} cx={`${p.x}%`} cy={`${p.y}%`} r={p.r * 0.7} fill="white" opacity={0.4 + (i % 4) * 0.15} />
      ))}
    </svg>
  );
}
