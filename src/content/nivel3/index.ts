import apuntesJson from './apuntes.json';
import preguntas from './preguntas.json';
import situaciones from './situaciones.json';
import { elegirVarios, type Rng } from '../../engine/azar';
import { ejSecciones, mesConActivoFijo, type Ejercicio, type Pregunta } from '../../engine/ejercicios';
import type { Apunte, ContenidoNivel } from '../tipos';
import { nivel2 } from '../nivel2';

/** Las operaciones son las mismas de los niveles 1 y 2: aquí se aprende a presentarlas. */
const plantillas = nivel2.plantillas;
const banco = situaciones as Pregunta[];

function generarPractica(rng: Rng): Ejercicio[] {
  const [p1, p2] = elegirVarios(rng, banco, 2);
  return [
    ejSecciones(rng),
    { tipo: 'eerr', balance: mesConActivoFijo(rng, plantillas, 3).balance },
    { tipo: 'pregunta', pregunta: p1 },
    { tipo: 'bg', balance: mesConActivoFijo(rng, plantillas, 3).balance },
    { tipo: 'pregunta', pregunta: p2 },
  ];
}

export const nivel3: ContenidoNivel = {
  apuntes: apuntesJson as Apunte[],
  intro: {
    personaje: 'Tía Rosa',
    emoji: '👩‍🍳',
    texto:
      '¡El banco me aprobó el crédito y compré un horno nuevo! Pero ahora el comité pide "estados financieros": un Estado de Resultados y un Balance General clasificado. Dicen que el Balance de 8 columnas es solo la hoja de trabajo…',
  },
  preguntas: preguntas as Pregunta[],
  plantillas,
  generarPractica,
  generarJefe: (rng) => ({ tipo: 'estados', ...mesConActivoFijo(rng, plantillas, 4) }),
  jefe: {
    nombre: 'Don Patricio, comité de riesgo',
    emoji: '🧑‍💼',
    titulo: 'El informe para el comité',
    texto:
      'Señora Rosa, el comité no lee hojas de trabajo. Necesito el Estado de Resultados del mes y el Balance General clasificado en corriente y no corriente. Si el balance no cuadra, el crédito no sigue.',
    reintentable: true,
    avisoFallo: 'Puedes corregir y volver a entregar, pero ganas la mitad de XP.',
  },
  cierre:
    '¡El comité quedó conforme! Ahora sabemos cuánto ganamos y qué tenemos. Con tanto crecimiento, el contador externo dice que debemos aplicar IFRS para PyMEs… ¿qué será eso?',
};
