import type { Apunte } from '../content/tipos';
import { Boton } from '../componentes/ui';

/** Apuntes del nivel: índice de temas y, para cada uno, ideas clave, un ejemplo y la fuente. */
export function Apuntes({ titulo, apuntes, onVolver, onComenzar }: { titulo: string; apuntes: Apunte[]; onVolver: () => void; onComenzar: () => void }) {
  const ir = (id: string) => document.getElementById(`apunte-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return (
    <div className="aparecer space-y-5">
      <div className="rounded-3xl bg-slate-800 p-5 text-white">
        <p className="text-sm font-extrabold uppercase text-amber-300">📖 Apuntes del nivel</p>
        <h2 className="text-2xl font-extrabold leading-tight">{titulo}</h2>
        <p className="mt-1 text-sm opacity-80">Lo que necesitas saber antes de la trivia. Puedes volver a estos apuntes cuando quieras.</p>
      </div>

      <nav aria-label="Índice de los apuntes" className="rounded-2xl border-2 border-slate-200 bg-white p-4">
        <p className="mb-2 text-xs font-extrabold uppercase tracking-wider text-slate-400">Índice</p>
        <ol className="space-y-1">
          {apuntes.map((a, i) => (
            <li key={a.id}>
              <button onClick={() => ir(a.id)} className="w-full rounded-lg px-2 py-1.5 text-left text-sm font-bold text-sky-700 hover:bg-sky-50">
                {i + 1}. {a.titulo}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {apuntes.map((a, i) => (
        <section key={a.id} id={`apunte-${a.id}`} className="scroll-mt-20 rounded-2xl border-2 border-slate-200 bg-white p-4">
          <h3 className="mb-2 text-lg font-extrabold">
            {i + 1}. {a.titulo}
          </h3>
          <ul className="list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed">
            {a.puntos.map((p, j) => (
              <li key={j}>{p}</li>
            ))}
          </ul>
          {a.ejemplo && (
            <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm leading-relaxed text-amber-950">
              <span className="font-extrabold">Ejemplo: </span>
              {a.ejemplo}
            </p>
          )}
          <p className="mt-3 text-xs font-bold text-slate-400">Fuente: {a.fuente}</p>
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="mt-2 text-xs font-bold text-sky-600 hover:underline">
            ↑ Volver al índice
          </button>
        </section>
      ))}

      <div className="grid gap-2 pb-6">
        <Boton onClick={onComenzar}>Ya estudié: comenzar la trivia</Boton>
        <Boton variante="secundario" onClick={onVolver}>
          Volver a la presentación del nivel
        </Boton>
      </div>
    </div>
  );
}
