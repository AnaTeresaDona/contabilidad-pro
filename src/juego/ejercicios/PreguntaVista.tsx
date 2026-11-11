import { useMemo, useState } from 'react';
import type { Pregunta } from '../../engine/ejercicios';
import { Boton, Opcion } from '../../componentes/ui';
import type { ApiEjercicio } from '../MarcoEjercicio';

export function PreguntaVista({ pregunta, api }: { pregunta: Pregunta; api: ApiEjercicio }) {
  // Las alternativas se barajan cada vez para que no se memorice la posición.
  const orden = useMemo(() => pregunta.opciones.map((_, i) => i).sort(() => Math.random() - 0.5), [pregunta]);
  const [eleccion, setEleccion] = useState<number | null>(null);

  const comprobar = () => {
    if (eleccion === null) return;
    const ok = eleccion === pregunta.correcta;
    api.comprobar({
      correcto: ok,
      errores: ok
        ? []
        : [
            {
              tipo: 'trivia',
              detalle: `La respuesta correcta es: «${pregunta.opciones[pregunta.correcta]}». ${pregunta.explicacion}`,
              fuente: pregunta.fuente,
            },
          ],
    });
  };

  return (
    <div>
      <h2 className="mb-5 text-xl font-extrabold leading-snug">{pregunta.pregunta}</h2>
      <div className="grid gap-2.5">
        {orden.map((i) => (
          <Opcion
            key={i}
            className="py-3.5 text-left text-[15px]"
            activa={eleccion === i}
            disabled={api.bloqueado}
            estado={api.bloqueado ? (i === pregunta.correcta ? 'bien' : i === eleccion ? 'mal' : null) : null}
            onClick={() => setEleccion(i)}
          >
            {pregunta.opciones[i]}
          </Opcion>
        ))}
      </div>
      {api.bloqueado && eleccion === pregunta.correcta && (
        <p className="aparecer mt-4 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-900">
          {pregunta.explicacion} <span className="block pt-1 text-xs font-bold text-emerald-700/70">Fuente: {pregunta.fuente}</span>
        </p>
      )}
      {!api.bloqueado && (
        <Boton className="mt-6 w-full" disabled={eleccion === null} onClick={comprobar}>
          Comprobar
        </Boton>
      )}
    </div>
  );
}
