import type { Asiento, LineaAsiento } from './types';
import { barajar, elegir, elegirVarios, type Rng } from './azar';
import { CUENTAS_BASICAS as CUENTAS, PARES_CONFUSOS } from './cuentas';
import { generarTransaccion, type Plantilla, type Transaccion } from './plantillas';
import { generarCuentaT, type EjercicioCuentaT } from './cuentaT';
import { generarLibroConErrores, type EntradaLibro } from './libroConErrores';
import { generarMes, type Balance8 } from './balance8';
import type { DatosDecision, EjercicioCalculo } from './calculos';
import type { DatosAjustesCierre } from './ajustes';
import type { Afirmacion } from './ifrs';
import type { DatosOperacionRenta, Partida } from './tributario';
import type { DatosCrisis } from './analisis';

export interface Pregunta {
  id: string;
  pregunta: string;
  opciones: string[];
  correcta: number;
  explicacion: string;
  fuente: string;
}

export interface EjercicioMayorizar {
  asientos: Asiento[];
  datos: EjercicioCuentaT;
}

export type Ejercicio =
  | { tipo: 'clasificar'; cuentas: string[] }
  | { tipo: 'debeHaber'; trans: Transaccion; orden: LineaAsiento[] }
  | { tipo: 'completar'; trans: Transaccion; opciones: string[] }
  | { tipo: 'cuentaT'; datos: EjercicioCuentaT }
  | { tipo: 'pregunta'; pregunta: Pregunta }
  | { tipo: 'mayorizar'; datos: EjercicioMayorizar }
  | { tipo: 'columna8'; cuentas: string[] }
  | { tipo: 'balance8'; asientos: Asiento[]; balance: Balance8 }
  | { tipo: 'libroErrores'; libro: EntradaLibro[] }
  | { tipo: 'secciones'; cuentas: string[] }
  | { tipo: 'eerr'; balance: Balance8 }
  | { tipo: 'bg'; balance: Balance8 }
  | { tipo: 'estados'; asientos: Asiento[]; balance: Balance8 }
  | { tipo: 'calculo'; datos: EjercicioCalculo }
  | { tipo: 'ajustesCierre'; datos: DatosAjustesCierre }
  | { tipo: 'fiscalizacion'; afirmaciones: Afirmacion[] }
  | { tipo: 'clasificarPartidas'; partidas: Partida[] }
  | { tipo: 'operacionRenta'; datos: DatosOperacionRenta }
  | { tipo: 'clasificarOpciones'; datos: EjercicioClasificar }
  | { tipo: 'crisis'; datos: DatosCrisis }
  | { tipo: 'decision'; datos: DatosDecision };

/** Ejercicio genérico: ubicar cada elemento en una de varias categorías (ej. familias de razones). */
export interface EjercicioClasificar {
  titulo: string;
  instruccion: string;
  opciones: { id: string; etiqueta: string }[];
  items: { id: string; texto: string; correcta: string; explicacion: string; fuente: string }[];
}

/** Cuentas variadas para clasificar en las secciones de los estados financieros. */
export function ejSecciones(rng: Rng, n = 6): Ejercicio {
  const grupos = [
    CUENTAS.filter((c) => c.tipo === 'activo' && c.grupo === 'no_corriente'),
    CUENTAS.filter((c) => c.tipo === 'activo' && c.grupo !== 'no_corriente'),
    CUENTAS.filter((c) => c.tipo === 'pasivo' && c.grupo === 'no_corriente'),
    CUENTAS.filter((c) => c.tipo === 'pasivo' && c.grupo !== 'no_corriente'),
    CUENTAS.filter((c) => c.tipo === 'patrimonio' || c.tipo === 'ingreso' || c.tipo === 'gasto'),
  ];
  const elegidas = new Set(grupos.map((g) => elegir(rng, g).id));
  for (const c of barajar(rng, CUENTAS)) {
    if (elegidas.size >= n) break;
    elegidas.add(c.id);
  }
  return { tipo: 'secciones', cuentas: barajar(rng, [...elegidas]) };
}

/** Un mes con activo fijo y préstamo, para que el Balance General tenga todas sus secciones. */
export function mesConActivoFijo(rng: Rng, plantillas: Plantilla[], extra: number) {
  const fijo = elegir(rng, ['compra_maquina', 'compra_muebles_mixta']);
  const gasto = elegir(rng, ['pago_arriendo', 'publicidad', 'servicios_basicos', 'factura_luz']);
  const obligatorias = [fijo, gasto];
  if (rng() < 0.7) {
    obligatorias.push('prestamo');
    if (rng() < 0.6) obligatorias.push('intereses');
  }
  return generarMes(rng, plantillas, extra, obligatorias);
}

export function ejClasificar(rng: Rng, n = 4): Ejercicio {
  return { tipo: 'clasificar', cuentas: elegirVarios(rng, CUENTAS.map((c) => c.id), n) };
}

export function ejDebeHaber(rng: Rng, p: Plantilla): Ejercicio {
  const trans = generarTransaccion(p, rng);
  return { tipo: 'debeHaber', trans, orden: barajar(rng, trans.asiento.lineas) };
}

/** Opciones = cuentas correctas + sus "pares confusos" + otras al azar, hasta 8. */
export function ejCompletar(rng: Rng, p: Plantilla, totalOpciones = 8): Ejercicio {
  const trans = generarTransaccion(p, rng);
  const correctas = [...new Set(trans.asiento.lineas.map((l) => l.cuentaId))];
  const trampas = correctas.map((id) => PARES_CONFUSOS[id]).filter((id): id is string => !!id && !correctas.includes(id));
  const usadas = new Set([...correctas, ...trampas]);
  const resto = elegirVarios(
    rng,
    CUENTAS.map((c) => c.id).filter((id) => !usadas.has(id)),
    Math.max(0, totalOpciones - usadas.size),
  );
  return { tipo: 'completar', trans, opciones: barajar(rng, [...usadas, ...resto]) };
}

export function ejCuentaT(rng: Rng): Ejercicio {
  return { tipo: 'cuentaT', datos: generarCuentaT(rng) };
}

export function ejPregunta(rng: Rng, banco: Pregunta[]): Ejercicio {
  return { tipo: 'pregunta', pregunta: elegir(rng, banco) };
}

/** Un libro diario corto y una cuenta para mayorizar (con movimientos en ambos lados). */
export function ejMayorizar(rng: Rng, plantillas: Plantilla[]): Ejercicio {
  const { asientos, balance } = generarMes(rng, plantillas, 1);
  const conAmbos = balance.filas.filter((f) => f.debe > 0 && f.haber > 0);
  const fila = conAmbos.length ? elegir(rng, conAmbos) : balance.filas[0];
  const movimientos = asientos.flatMap((a, i) =>
    a.lineas.filter((l) => l.cuentaId === fila.cuentaId).map((l) => ({ lado: l.lado, monto: l.monto, glosa: `Asiento N°${i + 1}` })),
  );
  return {
    tipo: 'mayorizar',
    datos: { asientos, datos: { cuentaId: fila.cuentaId, movimientos, saldo: fila.saldo, naturaleza: fila.naturaleza } },
  };
}

/** Cuentas variadas (al menos una de resultado y una de balance) para ubicar en el Balance de 8 columnas. */
export function ejColumna8(rng: Rng, n = 5): Ejercicio {
  const resultado = CUENTAS.filter((c) => c.tipo === 'ingreso' || c.tipo === 'gasto').map((c) => c.id);
  const balance = CUENTAS.filter((c) => !resultado.includes(c.id)).map((c) => c.id);
  const patrimonio = CUENTAS.filter((c) => c.tipo === 'patrimonio').map((c) => c.id);
  const elegidas = new Set([elegir(rng, resultado), elegir(rng, patrimonio), elegir(rng, balance)]);
  for (const id of barajar(rng, CUENTAS.map((c) => c.id))) {
    if (elegidas.size >= n) break;
    elegidas.add(id);
  }
  return { tipo: 'columna8', cuentas: barajar(rng, [...elegidas]) };
}

export function ejBalance8(rng: Rng, plantillas: Plantilla[], extra = 3): Ejercicio {
  return { tipo: 'balance8', ...generarMes(rng, plantillas, extra) };
}

export function ejLibroErrores(rng: Rng, plantillas: Plantilla[]): Ejercicio {
  return { tipo: 'libroErrores', libro: generarLibroConErrores(rng, plantillas) };
}

/**
 * Arma la práctica de un nivel con `n` ejercicios: llama varias veces al generador del nivel
 * (cada vez con montos distintos) y evita repetir la misma pregunta o el mismo cálculo.
 */
export function armarPractica(generar: (rng: Rng) => Ejercicio[], rng: Rng, n: number): Ejercicio[] {
  const clave = (e: Ejercicio): string | null =>
    e.tipo === 'pregunta' ? `p:${e.pregunta.id}` : e.tipo === 'calculo' ? `c:${e.datos.titulo}` : null;
  const vistos = new Set<string>();
  const resultado: Ejercicio[] = [];
  for (let vuelta = 0; vuelta < 6 && resultado.length < n; vuelta++) {
    for (const e of generar(rng)) {
      if (resultado.length >= n) break;
      const k = clave(e);
      if (k && vistos.has(k)) continue;
      if (k) vistos.add(k);
      resultado.push(e);
    }
  }
  return resultado;
}
