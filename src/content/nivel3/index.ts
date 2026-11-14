import apuntesJson from './apuntes.json';
import preguntas from './preguntas.json';
import situaciones from './situaciones.json';
import { elegirVarios, type Rng } from '../../engine/azar';
import { ejSecciones, mesConActivoFijo, type Ejercicio, type Pregunta } from '../../engine/ejercicios';
import type { Apunte, ContenidoNivel, PasoPractica } from '../tipos';
import { nivel2 } from '../nivel2';
import { ordenBalanceConCuentas, ordenEERR, ordenSeccionesBG } from '../../engine/ordenar';

/** Las operaciones son las mismas de los niveles 1 y 2: aquí se aprende a presentarlas. */
const plantillas = nivel2.plantillas;
const banco = situaciones as Pregunta[];

const pasos: PasoPractica[] = [
  {
    id: 'basico',
    descripcion: 'Corriente o no corriente, el orden del Balance General e interpretación.',
    generar: (rng: Rng): Ejercicio[] => {
      const [p1, p2] = elegirVarios(rng, banco, 2);
      return [
        ejSecciones(rng),
        { tipo: 'ordenar', datos: ordenSeccionesBG(rng) },
        { tipo: 'pregunta', pregunta: p1 },
        ejSecciones(rng, 8),
        { tipo: 'pregunta', pregunta: p2 },
      ];
    },
  },
  {
    id: 'intermedio',
    descripcion: 'Ordenar y armar el Estado de Resultados y el Balance General.',
    generar: (rng: Rng): Ejercicio[] => {
      const [p] = elegirVarios(rng, banco, 1);
      return [
        { tipo: 'ordenar', datos: ordenEERR(rng) },
        { tipo: 'eerr', balance: mesConActivoFijo(rng, plantillas, 2).balance },
        { tipo: 'bg', balance: mesConActivoFijo(rng, plantillas, 2).balance },
        { tipo: 'pregunta', pregunta: p },
        { tipo: 'eerr', balance: mesConActivoFijo(rng, plantillas, 3).balance },
      ];
    },
  },
  {
    id: 'avanzado',
    descripcion: 'Meses más largos y los dos estados juntos.',
    generar: (rng: Rng): Ejercicio[] => [
      { tipo: 'ordenar', datos: ordenBalanceConCuentas(rng) },
      { tipo: 'bg', balance: mesConActivoFijo(rng, plantillas, 3).balance },
      { tipo: 'eerr', balance: mesConActivoFijo(rng, plantillas, 4).balance },
      { tipo: 'estados', ...mesConActivoFijo(rng, plantillas, 2) },
    ],
  },
];

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
  pasos,
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
