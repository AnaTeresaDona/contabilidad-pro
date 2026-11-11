import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { cargarProgreso, guardarProgreso, type Progreso } from '../engine/progreso';
import { LOGROS, type Logro } from '../content/logros';

interface ValorProgreso {
  progreso: Progreso;
  /** Aplica una función pura al progreso; se guarda solo en localStorage. */
  actualizar: (fn: (p: Progreso) => Progreso) => void;
  reemplazar: (p: Progreso) => void;
  /** Lee el valor más reciente sin esperar un nuevo render. */
  obtener: () => Progreso;
  avisos: { id: number; logro: Logro }[];
  cerrarAviso: (id: number) => void;
}

const Ctx = createContext<ValorProgreso | null>(null);

export function ProveedorProgreso({ children }: { children: ReactNode }) {
  const [progreso, setProgreso] = useState<Progreso>(cargarProgreso);
  const ref = useRef(progreso);
  ref.current = progreso;
  const [avisos, setAvisos] = useState<{ id: number; logro: Logro }[]>([]);

  useEffect(() => {
    guardarProgreso(progreso);
  }, [progreso]);

  // Logros: se otorgan solos cuando se cumple su condición.
  useEffect(() => {
    const nuevos = LOGROS.filter((l) => !progreso.logros.includes(l.id) && l.cumple(progreso));
    if (nuevos.length === 0) return;
    setProgreso((p) => ({ ...p, logros: [...p.logros, ...nuevos.map((n) => n.id).filter((id) => !p.logros.includes(id))] }));
    setAvisos((a) => [...a, ...nuevos.map((logro) => ({ id: Math.random(), logro }))]);
  }, [progreso]);

  const actualizar = useCallback((fn: (p: Progreso) => Progreso) => setProgreso((p) => fn(p)), []);
  const reemplazar = useCallback((p: Progreso) => setProgreso(p), []);
  const obtener = useCallback(() => ref.current, []);
  const cerrarAviso = useCallback((id: number) => setAvisos((a) => a.filter((x) => x.id !== id)), []);

  return (
    <Ctx.Provider value={{ progreso, actualizar, reemplazar, obtener, avisos, cerrarAviso }}>{children}</Ctx.Provider>
  );
}

export function useProgreso(): ValorProgreso {
  const v = useContext(Ctx);
  if (!v) throw new Error('useProgreso fuera de ProveedorProgreso');
  return v;
}
