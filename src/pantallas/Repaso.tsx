import { useState } from 'react';
import { TODAS_LAS_PREGUNTAS } from '../content';
import { quitarRepaso } from '../engine/progreso';
import { useProgreso } from '../estado/Progreso';
import { ProveedorSesion, useSesion } from '../estado/Sesion';
import { MarcoEjercicio } from '../juego/MarcoEjercicio';
import { PreguntaVista } from '../juego/ejercicios/PreguntaVista';
import { Boton, Tarjeta } from '../componentes/ui';

const POR_SESION = 5;

export function Repaso({ onSalir }: { onSalir: () => void }) {
  return (
    <ProveedorSesion sinDanio>
      <SesionRepaso onSalir={onSalir} />
    </ProveedorSesion>
  );
}

function SesionRepaso({ onSalir }: { onSalir: () => void }) {
  const { progreso, actualizar } = useProgreso();
  const sesion = useSesion();
  // Se toma una "foto" del mazo al entrar, para que no cambie mientras se responde.
  const [mazo] = useState(() => progreso.repaso.filter((id) => TODAS_LAS_PREGUNTAS.has(id)).slice(0, POR_SESION));
  const [indice, setIndice] = useState(0);
  const [aciertos, setAciertos] = useState(0);

  if (mazo.length === 0) {
    return (
      <Tarjeta className="text-center">
        <p className="text-5xl">✨</p>
        <p className="mt-2 font-extrabold">Tu mazo de repaso está vacío</p>
        <p className="text-sm text-slate-500">Las preguntas que falles en las trivias aparecerán aquí para que las practiques.</p>
        <Boton className="mt-4 w-full" onClick={onSalir}>
          Volver al mapa
        </Boton>
      </Tarjeta>
    );
  }

  if (indice >= mazo.length) {
    return (
      <div className="aparecer space-y-4 text-center">
        <p className="text-6xl">📚</p>
        <h2 className="text-2xl font-extrabold">
          Repasaste {aciertos} de {mazo.length}
        </h2>
        <p className="text-slate-600">
          Ganaste {sesion.xpSesion} XP. {progreso.repaso.length > 0 ? `Quedan ${progreso.repaso.length} en tu mazo.` : '¡Mazo vacío!'}
        </p>
        <Boton className="w-full" onClick={onSalir}>
          Volver al mapa
        </Boton>
      </div>
    );
  }

  const pregunta = TODAS_LAS_PREGUNTAS.get(mazo[indice])!;
  return (
    <MarcoEjercicio
      key={indice}
      permitirReintento={false}
      alAcertar={() => {
        setAciertos((a) => a + 1);
        actualizar((p) => quitarRepaso(p, pregunta.id));
      }}
      onTerminar={() => setIndice(indice + 1)}
    >
      {(api) => (
        <>
          <p className="mb-2 text-xs font-extrabold uppercase text-slate-400">
            Repaso {indice + 1} de {mazo.length} · sin daño a la caja
          </p>
          <PreguntaVista pregunta={pregunta} api={api} />
        </>
      )}
    </MarcoEjercicio>
  );
}
