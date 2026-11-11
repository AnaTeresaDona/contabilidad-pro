import { useMemo, useState } from 'react';
import type { ErrorDetectado } from '../../engine/types';
import type { DatosAjustesCierre } from '../../engine/ajustes';
import { compararAsiento } from '../../engine/asientos';
import { crearRng, barajar } from '../../engine/azar';
import { CUENTAS_BASICAS, PARES_CONFUSOS } from '../../engine/cuentas';
import { formatoCLP } from '../../engine/dinero';
import { Boton } from '../../componentes/ui';
import { AsientoVista } from '../../componentes/AsientoVista';
import { CampoMonto } from '../../componentes/CampoMonto';
import { Fila } from '../../componentes/EstadosVista';
import type { ApiEjercicio } from '../MarcoEjercicio';
import { FormAsiento, filasCompletas, lineasDe, type FilaAsiento } from './EjCompletar';

/** Cuentas para elegir: las correctas, sus "pares confusos" y algunas al azar. */
function opcionesPara(ids: string[], semilla: number): string[] {
  const rng = crearRng(semilla);
  const trampas = ids.map((id) => PARES_CONFUSOS[id]).filter((x): x is string => !!x && !ids.includes(x));
  const usadas = new Set([...ids, ...trampas]);
  const resto = barajar(rng, CUENTAS_BASICAS.map((c) => c.id).filter((id) => !usadas.has(id))).slice(0, Math.max(0, 8 - usadas.size));
  return barajar(rng, [...usadas, ...resto]);
}

/** Jefe del Nivel 4A: registrar los ajustes que pide la auditora y calcular el resultado ajustado. */
export function EjAjustesCierre({ datos, api }: { datos: DatosAjustesCierre; api: ApiEjercicio }) {
  const opciones = useMemo(
    () => datos.ajustes.map((t, i) => opcionesPara([...new Set(t.asiento.lineas.map((l) => l.cuentaId))], t.valores[Object.keys(t.valores)[0]] + i)),
    [datos],
  );
  const [filas, setFilas] = useState<FilaAsiento[][]>(datos.ajustes.map(() => []));
  const [resultado, setResultado] = useState<number | null>(null);

  const completo = filas.every(filasCompletas) && resultado !== null;

  const comprobar = () => {
    const errores: ErrorDetectado[] = [];
    datos.ajustes.forEach((t, i) => {
      for (const e of compararAsiento(t.asiento.lineas, lineasDe(filas[i]), t.valores).errores)
        errores.push({ ...e, detalle: `Ajuste N°${i + 1}: ${e.detalle}` });
    });
    if (resultado !== datos.resultadoAjustado)
      errores.push({
        tipo: 'calculo_incorrecto',
        detalle: `Resultado ajustado: ${formatoCLP(datos.resultadoPrevio)} menos los gastos de los tres ajustes = ${formatoCLP(datos.resultadoAjustado)}${resultado !== null ? ` (pusiste ${formatoCLP(resultado)})` : ''}.`,
        fuente: 'NIIF para las PYMES, Sección 2',
      });
    api.comprobar(
      { correcto: errores.length === 0, errores },
      <div className="space-y-3">
        {datos.ajustes.map((t, i) => (
          <div key={i}>
            <p className="mb-1 text-sm font-bold">Ajuste N°{i + 1}</p>
            <AsientoVista lineas={t.asiento.lineas} />
          </div>
        ))}
        <p className="font-extrabold">Resultado ajustado: {formatoCLP(datos.resultadoAjustado)}</p>
      </div>,
    );
  };

  return (
    <div>
      <div className="mb-5 rounded-2xl border-2 border-slate-200 bg-white p-4 text-sm">
        <Fila etiqueta="Resultado del período antes de ajustes" valor={<b>{formatoCLP(datos.resultadoPrevio)}</b>} />
      </div>

      {datos.ajustes.map((t, i) => (
        <section key={i} className="mb-6">
          <h3 className="mb-2 font-extrabold">Ajuste N°{i + 1}</h3>
          <FormAsiento
            trans={t}
            opciones={opciones[i]}
            filas={filas[i]}
            onChange={(f) => setFilas((fs) => fs.map((x, j) => (j === i ? f : x)))}
            bloqueado={api.bloqueado}
          />
        </section>
      ))}

      <section className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-sm">
        <h3 className="mb-1 font-extrabold">Resultado ajustado del período</h3>
        <p className="mb-2 text-slate-600">Parte del resultado antes de ajustes y descuenta el efecto de cada ajuste. Si queda en pérdida, escríbelo con signo menos.</p>
        <Fila
          etiqueta={<span className="font-bold">Resultado ajustado</span>}
          valor={<CampoMonto valor={resultado} etiqueta="Resultado ajustado" disabled={api.bloqueado} onChange={setResultado} />}
        />
      </section>

      {!api.bloqueado && (
        <Boton className="mt-6 w-full" disabled={!completo} onClick={comprobar}>
          Entregar a la auditora
        </Boton>
      )}
    </div>
  );
}
