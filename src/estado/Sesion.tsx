import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { useProgreso } from './Progreso';
import { cambiarHp, fechaISO, registrarActividad, sumarXp } from '../engine/progreso';
import { danioPorErrores, REGLAS, xpPorAcierto } from '../engine/recompensas';

/** Estado de una partida (un nivel o una sesión de repaso): combo, XP ganado, pistas usadas. */
interface ValorSesion {
  combo: number;
  xpSesion: number;
  usoPistas: boolean;
  registrarAcierto: (conAyuda: boolean, xpBase?: number) => number;
  registrarFallo: (tiposError: string[]) => void;
  marcarPista: () => void;
  cobrarAuditoria: () => void;
}

const Ctx = createContext<ValorSesion | null>(null);

export function ProveedorSesion({
  children,
  sinDanio = false,
  onInsolvencia,
}: {
  children: ReactNode;
  sinDanio?: boolean;
  onInsolvencia?: () => void;
}) {
  const { actualizar, obtener } = useProgreso();
  const comboRef = useRef(0);
  const [combo, setCombo] = useState(0);
  const [xpSesion, setXpSesion] = useState(0);
  const [usoPistas, setUsoPistas] = useState(false);

  const valor: ValorSesion = {
    combo,
    xpSesion,
    usoPistas,
    registrarAcierto(conAyuda, xpBase) {
      const c = comboRef.current + 1;
      comboRef.current = c;
      setCombo(c);
      const xp = xpBase !== undefined ? (conAyuda ? xpBase / 2 : xpBase) : xpPorAcierto(c, conAyuda);
      actualizar((p) => ({ ...registrarActividad(sumarXp(p, xp), fechaISO()), mejorCombo: Math.max(p.mejorCombo, c) }));
      setXpSesion((x) => x + xp);
      return xp;
    },
    registrarFallo(tipos) {
      comboRef.current = 0;
      setCombo(0);
      if (sinDanio) return;
      const danio = danioPorErrores(tipos);
      const hpFinal = Math.max(0, obtener().hp - danio);
      actualizar((p) => cambiarHp(p, -danio));
      if (hpFinal === 0) onInsolvencia?.();
    },
    marcarPista() {
      setUsoPistas(true);
    },
    cobrarAuditoria() {
      actualizar((p) => sumarXp(p, -REGLAS.costoAuditoria));
      setXpSesion((x) => x - REGLAS.costoAuditoria);
    },
  };

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useSesion(): ValorSesion {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSesion fuera de ProveedorSesion');
  return v;
}
