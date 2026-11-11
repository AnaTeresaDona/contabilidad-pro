import { LOGROS } from '../content/logros';
import { useProgreso } from '../estado/Progreso';

export function Logros() {
  const { progreso } = useProgreso();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {LOGROS.map((l) => {
        const tiene = progreso.logros.includes(l.id);
        return (
          <div
            key={l.id}
            className={`flex items-center gap-3 rounded-2xl border-2 p-4 ${tiene ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}
          >
            <span className={`text-4xl ${tiene ? '' : 'opacity-30 grayscale'}`}>{l.emoji}</span>
            <div>
              <p className={`font-extrabold ${tiene ? '' : 'text-slate-500'}`}>{l.titulo}</p>
              <p className="text-sm text-slate-500">{l.descripcion}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
