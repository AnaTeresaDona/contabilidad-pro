import { CONTENIDO, NIVELES, ORDEN_NIVELES } from '../content';
import { LOGROS } from '../content/logros';
import { estadoNivel, nivelDesbloqueado } from '../engine/progreso';
import { useProgreso } from '../estado/Progreso';
import { COLORES } from '../componentes/ui';
import type { Ruta } from '../App';
import { avanceAlSiguiente, premioActual, siguientePremio } from '../content/premios';
import { IconoPremio } from '../componentes/IconoPremio';

// Desplazamiento en zigzag de los nodos del camino.
const DESPLAZAMIENTO = ['ml-0', 'ml-10 sm:ml-16', 'ml-20 sm:ml-32', 'ml-10 sm:ml-16'];

export function Mapa({ ir }: { ir: (r: Ruta) => void }) {
  const { progreso } = useProgreso();
  const actual = NIVELES.find((n) => nivelDesbloqueado(progreso, ORDEN_NIVELES, n.id) && !estadoNivel(progreso, n.id).completado) ?? NIVELES[0];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white">
        <p className="text-xs font-extrabold uppercase tracking-wider opacity-80">Tu empresa</p>
        <h2 className="text-2xl font-extrabold">🥟 {progreso.empresa.nombre}</h2>
        <p className="mt-1 opacity-90">
          Etapa actual: <b>{actual.etapa}</b>
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Mini valor={progreso.chispas.toLocaleString('es-CL')} etiqueta="Chispas ✨" />
          <Mini valor={progreso.libro.length} etiqueta="Asientos" />
          <Mini valor={`${progreso.hp}%`} etiqueta="Caja" />
        </div>
      </section>

      <CaminoResumen chispas={progreso.chispas} onClick={() => ir({ pantalla: 'premios' })} />

      <section aria-label="Niveles" className="space-y-4">
        {NIVELES.map((n, i) => {
          const disponible = !!CONTENIDO[n.id];
          const abierto = nivelDesbloqueado(progreso, ORDEN_NIVELES, n.id);
          const completo = estadoNivel(progreso, n.id).completado;
          const jugable = disponible && abierto;
          const c = COLORES[n.color];
          return (
            <div key={n.id} className={`flex items-center gap-4 ${DESPLAZAMIENTO[i % DESPLAZAMIENTO.length]}`}>
              <button
                disabled={!jugable}
                onClick={() => ir({ pantalla: 'nivel', id: n.id })}
                aria-label={`Nivel ${n.numero}: ${n.titulo}`}
                className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-b-[6px] text-xl font-extrabold transition active:translate-y-1 active:border-b-2 ${
                  jugable ? `${c.fondo} ${c.borde} text-white ${!completo ? 'latido' : ''}` : 'border-slate-300 bg-slate-200 text-slate-400'
                }`}
              >
                {completo ? '✓' : !abierto ? '🔒' : n.numero}
              </button>
              <div className="min-w-0">
                <p className={`text-xs font-extrabold uppercase ${jugable ? c.texto : 'text-slate-400'}`}>
                  Nivel {n.numero} · {n.etapa}
                </p>
                <p className={`font-extrabold leading-tight ${jugable ? '' : 'text-slate-400'}`}>{n.titulo}</p>
                <p className="text-xs text-slate-400">{disponible ? n.tema : 'Próximamente'}</p>
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Acceso emoji="🏪" titulo="Mi empresa" detalle="Libro diario y mayor" onClick={() => ir({ pantalla: 'empresa' })} />
        <Acceso
          emoji="📚"
          titulo="Repaso"
          detalle={progreso.repaso.length ? `${progreso.repaso.length} pendientes` : 'Al día'}
          resaltar={progreso.repaso.length > 0}
          onClick={() => ir({ pantalla: 'repaso' })}
        />
        <Acceso emoji="🏆" titulo="Logros" detalle={`${progreso.logros.length} de ${LOGROS.length}`} onClick={() => ir({ pantalla: 'logros' })} />
        <Acceso emoji="📊" titulo="Estadísticas" detalle="Tiempo y mejora" onClick={() => ir({ pantalla: 'estadisticas' })} />
        <Acceso emoji="⚙️" titulo="Ajustes" detalle="Voz, instalar y respaldo" onClick={() => ir({ pantalla: 'ajustes' })} />
      </section>
    </div>
  );
}

function Mini({ valor, etiqueta }: { valor: string | number; etiqueta: string }) {
  return (
    <div className="rounded-2xl bg-white/15 py-2">
      <p className="text-xl font-extrabold">{valor}</p>
      <p className="text-xs font-bold opacity-80">{etiqueta}</p>
    </div>
  );
}

function Acceso({ emoji, titulo, detalle, onClick, resaltar }: { emoji: string; titulo: string; detalle: string; onClick: () => void; resaltar?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border-2 border-b-4 bg-white p-4 text-left transition hover:bg-slate-50 active:translate-y-[2px] ${resaltar ? 'border-amber-300' : 'border-slate-200'}`}
    >
      <span className="text-2xl">{emoji}</span>
      <span className="mt-1 block font-extrabold">{titulo}</span>
      <span className={`block text-xs font-bold ${resaltar ? 'text-amber-600' : 'text-slate-400'}`}>{detalle}</span>
    </button>
  );
}

function CaminoResumen({ chispas, onClick }: { chispas: number; onClick: () => void }) {
  const actual = premioActual(chispas);
  const sig = siguientePremio(chispas);
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-3xl border-b-4 border-indigo-800 bg-gradient-to-r from-indigo-600 via-sky-500 to-amber-400 p-4 text-left text-white transition active:translate-y-[2px]"
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/25">
        <IconoPremio premio={actual} tam={40} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-extrabold uppercase tracking-wider opacity-85">Camino al cielo ☁️</span>
        <span className="block font-extrabold leading-tight">
          {actual.nombre} · {chispas.toLocaleString('es-CL')} ✨
        </span>
        {sig && (
          <>
            <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-white/30">
              <span className="block h-full rounded-full bg-white" style={{ width: `${Math.round(avanceAlSiguiente(chispas) * 100)}%` }} />
            </span>
            <span className="mt-0.5 block text-xs font-bold opacity-90">
              Próximo: {sig.emoji === 'topo' ? 'Topo' : `${sig.emoji} ${sig.nombre}`} · faltan {(sig.umbral - chispas).toLocaleString('es-CL')} ✨
            </span>
          </>
        )}
      </span>
      <span className="text-2xl">›</span>
    </button>
  );
}
