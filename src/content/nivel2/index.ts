import apuntesJson from './apuntes.json';
import preguntas from './preguntas.json';
import situaciones from './situaciones.json';
import plantillasJson from './plantillas.json';
import type { Plantilla } from '../../engine/plantillas';
import { elegir, type Rng } from '../../engine/azar';
import {
  ejBalance8,
  ejColumna8,
  ejCompletar,
  ejMayorizar,
  ejPregunta,
  type Ejercicio,
  type Pregunta,
} from '../../engine/ejercicios';
import type { Apunte, ContenidoNivel, PasoPractica } from '../tipos';
import { nivel1 } from '../nivel1';

const propias = plantillasJson as unknown as Plantilla[];
/** Para armar un mes completo se mezclan las operaciones del Nivel 1 con los documentos del Nivel 2. */
const todas = [...nivel1.plantillas, ...propias];

const banco = situaciones as Pregunta[];

const pasos: PasoPractica[] = [
  {
    id: 'basico',
    descripcion: 'Qué documento emitir y a qué columna del balance va cada cuenta.',
    generar: (rng: Rng): Ejercicio[] => [ejPregunta(rng, banco), ejColumna8(rng), ejPregunta(rng, banco), ejColumna8(rng, 6)],
  },
  {
    id: 'intermedio',
    descripcion: 'Asientos con facturas y boletas, y mayorizar.',
    generar: (rng: Rng): Ejercicio[] => {
      const conDocumento = elegir(rng, propias.filter((p) => p.documento));
      const otra = elegir(rng, propias.filter((p) => p !== conDocumento));
      return [ejCompletar(rng, conDocumento), ejMayorizar(rng, todas), ejCompletar(rng, otra), ejMayorizar(rng, todas)];
    },
  },
  {
    id: 'avanzado',
    descripcion: 'Un Balance de 8 columnas más corto que el del jefe.',
    generar: (rng: Rng): Ejercicio[] => [ejCompletar(rng, elegir(rng, propias), 12), ejMayorizar(rng, todas), ejBalance8(rng, todas, 2)],
  },
];

export const nivel2: ContenidoNivel = {
  apuntes: apuntesJson as Apunte[],
  intro: {
    personaje: 'Tía Rosa',
    emoji: '👩‍🍳',
    texto:
      '¡Terminó nuestro primer mes! Tengo una caja de zapatos llena de facturas, boletas y hasta una nota de crédito. Y el banco me pide un "Balance de 8 columnas" para darme un crédito. ¿Me ayudas a cerrar el mes?',
  },
  preguntas: preguntas as Pregunta[],
  plantillas: todas,
  pasos,
  generarJefe: (rng) => ejBalance8(rng, todas, 4),
  jefe: {
    nombre: 'Sra. Marta, ejecutiva del banco',
    emoji: '👩‍💼',
    titulo: 'El Balance para el banco',
    texto:
      'Buenas tardes. Para evaluar el crédito necesito el Balance de 8 columnas del mes, con el resultado del ejercicio. Y que cuadre, ¿ah? Un balance que no cuadra, no lo presento al comité.',
    reintentable: true,
    avisoFallo: 'Puedes corregir y volver a entregar, pero ganas la mitad de XP.',
  },
  cierre:
    '¡El banco aprobó el crédito! Ahora que el mes cuadra, el siguiente paso es convertir este balance en Estados Financieros de verdad: Balance General y Estado de Resultados.',
};
