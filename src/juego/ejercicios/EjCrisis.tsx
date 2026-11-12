import { useMemo, useState } from 'react';
import type { DatosCrisis } from '../../engine/analisis';
import type { Pregunta } from '../../engine/ejercicios';
import type { ErrorDetectado } from '../../engine/types';
import { validarCalculo } from '../../engine/calculos';
import { Boton, Opcion } from '../../componentes/ui';
import type { ApiEjercicio } from '../MarcoEjercicio';
import { FormCalculo } from './EjCalculo';

/** Una pregunta de alternativas dentro de un formulario más grande (sin su propio botón Comprobar). */
function Eleccion({ p, valor, onChange, bloqueado }: { p: Pregunta; valor: number | null; onChange: (i: number) => void; bloqueado: boolean }) {
  return (
    <div>
      <p className="mb-2 font-extrabold">{p.pregunta}</p>
      <div className="grid gap-2">
        {p.opciones.map((o, i) => (
          <Opcion
            key={i}
            className="py-2.5 text-left text-sm"
            activa={valor === i}
            estado={bloqueado ? (i === p.correcta ? 'bien' : i === valor ? 'mal' : null) : null}
            disabled={bloqueado}
            onClick={() => onChange(i)}
          >
            {o}
          </Opcion>
        ))}
      </div>
    </div>
  );
}

/** Jefe del Nivel 6: calcular los indicadores de dos años, diagnosticar la crisis y recomendar qué hacer. */
export function EjCrisis({ datos, api }: { datos: DatosCrisis; api: ApiEjercicio }) {
  const [resp, setResp] = useState<Record<string, number | null>>({});
  const [diag, setDiag] = useState<number | null>(null);
  const [dec, setDec] = useState<number | null>(null);
  const completo = useMemo(
    () => datos.calculo.preguntas.every((p) => resp[p.id] !== null && resp[p.id] !== undefined) && diag !== null && dec !== null,
    [datos, resp, diag, dec],
  );

  const comprobar = () => {
    const errores: ErrorDetectado[] = [...validarCalculo(datos.calculo, resp).errores];
    for (const [p, v] of [
      [datos.diagnostico, diag],
      [datos.decision, dec],
    ] as const)
      if (v !== p.correcta)
        errores.push({ tipo: 'trivia', detalle: `${p.pregunta} La respuesta correcta es: «${p.opciones[p.correcta]}». ${p.explicacion}`, fuente: p.fuente });
    api.comprobar({ correcto: errores.length === 0, errores });
  };

  return (
    <div>
      <h3 className="mb-2 font-extrabold">Parte 1 · Los números (año 1 → año 2)</h3>
      <FormCalculo datos={datos.calculo} resp={resp} onChange={setResp} bloqueado={api.bloqueado} />

      <h3 className="mb-2 mt-6 font-extrabold">Parte 2 · El diagnóstico</h3>
      <Eleccion p={datos.diagnostico} valor={diag} onChange={setDiag} bloqueado={api.bloqueado} />

      <h3 className="mb-2 mt-6 font-extrabold">Parte 3 · La decisión</h3>
      <Eleccion p={datos.decision} valor={dec} onChange={setDec} bloqueado={api.bloqueado} />

      {!api.bloqueado && (
        <Boton className="mt-6 w-full" disabled={!completo} onClick={comprobar}>
          Presentar al directorio
        </Boton>
      )}
    </div>
  );
}
