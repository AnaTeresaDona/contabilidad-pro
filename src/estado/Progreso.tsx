import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { cargarProgreso, fechaISO, guardarProgreso, sumarTiempo, type Progreso } from '../engine/progreso';
import { LOGROS } from '../content/logros';
import { PREMIOS, premiosDesbloqueados, type Premio } from '../content/premios';

/** Aviso emergente: un logro o un premio nuevo del camino. */
export interface Aviso {
  id: number;
  emoji: string;
  titulo: string;
  etiqueta: string;
  premio?: Premio;
}

interface ValorProgreso {
  progreso: Progreso;
  /** Aplica una función pura al progreso; se guarda solo en localStorage. */
  actualizar: (fn: (p: Progreso) => Progreso) => void;
  reemplazar: (p: Progreso) => void;
  /** Lee el valor más reciente sin esperar un nuevo render. */
  obtener: () => Progreso;
  avisos: Aviso[];
  cerrarAviso: (id: number) => void;
}

const Ctx = createContext<ValorProgreso | null>(null);

/** Cada cuánto se suma el tiempo de juego y cuánto sin tocar nada cuenta como pausa. */
const TICK_SEGUNDOS = 15;
const INACTIVO_SEGUNDOS = 120;

export function ProveedorProgreso({ children }: { children: ReactNode }) {
  const [progreso, setProgreso] = useState<Progreso>(cargarProgreso);
  const ref = useRef(progreso);
  ref.current = progreso;
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  useEffect(() => {
    guardarProgreso(progreso);
  }, [progreso]);

  // Logros: se otorgan solos cuando se cumple su condición.
  useEffect(() => {
    const nuevos = LOGROS.filter((l) => !progreso.logros.includes(l.id) && l.cumple(progreso));
    if (nuevos.length === 0) return;
    setProgreso((p) => ({ ...p, logros: [...p.logros, ...nuevos.map((n) => n.id).filter((id) => !p.logros.includes(id))] }));
    setAvisos((a) => [...a, ...nuevos.map((l) => ({ id: Math.random(), emoji: l.emoji, titulo: l.titulo, etiqueta: '¡Logro desbloqueado!' }))]);
  }, [progreso]);

  // Premios del camino al cielo: se anuncian al alcanzar sus chispas.
  useEffect(() => {
    const n = premiosDesbloqueados(progreso.chispas);
    if (n <= progreso.premiosVistos) return;
    const nuevos = PREMIOS.slice(progreso.premiosVistos, n);
    setProgreso((p) => ({ ...p, premiosVistos: Math.max(p.premiosVistos, n) }));
    setAvisos((a) => [
      ...a,
      ...nuevos.map((premio) => ({ id: Math.random(), emoji: premio.emoji, titulo: premio.nombre, etiqueta: '¡Nuevo premio en tu camino!', premio })),
    ]);
  }, [progreso.chispas, progreso.premiosVistos]);

  // Tiempo de juego: cuenta mientras la pestaña está visible y el jugador hizo algo hace poco.
  useEffect(() => {
    let ultimo = Date.now();
    const actividad = () => (ultimo = Date.now());
    const eventos = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;
    eventos.forEach((e) => window.addEventListener(e, actividad, { passive: true }));
    const t = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - ultimo > INACTIVO_SEGUNDOS * 1000) return;
      setProgreso((p) => sumarTiempo(p, TICK_SEGUNDOS, fechaISO()));
    }, TICK_SEGUNDOS * 1000);
    return () => {
      clearInterval(t);
      eventos.forEach((e) => window.removeEventListener(e, actividad));
    };
  }, []);

  const actualizar = useCallback((fn: (p: Progreso) => Progreso) => setProgreso((p) => fn(p)), []);
  const reemplazar = useCallback((p: Progreso) => setProgreso(p), []);
  const obtener = useCallback(() => ref.current, []);
  const cerrarAviso = useCallback((id: number) => setAvisos((a) => a.filter((x) => x.id !== id)), []);

  return <Ctx.Provider value={{ progreso, actualizar, reemplazar, obtener, avisos, cerrarAviso }}>{children}</Ctx.Provider>;
}

export function useProgreso(): ValorProgreso {
  const v = useContext(Ctx);
  if (!v) throw new Error('useProgreso fuera de ProveedorProgreso');
  return v;
}
