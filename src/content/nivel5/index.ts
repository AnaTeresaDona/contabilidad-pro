import apuntesJson from './apuntes.json';
import preguntas from './preguntas.json';
import situaciones from './situaciones.json';
import partidasJson from './partidas.json';
import plantillasJson from './plantillas.json';
import type { Plantilla } from '../../engine/plantillas';
import { elegirVarios, type Rng } from '../../engine/azar';
import { ejCompletar, type Ejercicio, type Pregunta } from '../../engine/ejercicios';
import { calculoF22, calculoRLI, elegirPartidas, generarOperacionRenta, type PartidaBanco } from '../../engine/tributario';
import type { Apunte, ContenidoNivel, PasoPractica } from '../tipos';

const plantillas = plantillasJson as unknown as Plantilla[];
const banco = situaciones as Pregunta[];
export const PARTIDAS = partidasJson as PartidaBanco[];

const pasos: PasoPractica[] = [
  {
    id: 'basico',
    descripcion: 'Agregados, deducciones y preguntas tributarias.',
    generar: (rng: Rng): Ejercicio[] => {
      const [p1, p2] = elegirVarios(rng, banco, 2);
      return [
        { tipo: 'clasificarPartidas', partidas: elegirPartidas(rng, PARTIDAS, 2, 2, 1) },
        { tipo: 'pregunta', pregunta: p1 },
        { tipo: 'clasificarPartidas', partidas: elegirPartidas(rng, PARTIDAS, 2, 1, 2) },
        { tipo: 'pregunta', pregunta: p2 },
      ];
    },
  },
  {
    id: 'intermedio',
    descripcion: 'Calcular la RLI y el F22, y asientos tributarios.',
    generar: (rng: Rng): Ejercicio[] => {
      const [a, b] = elegirVarios(rng, plantillas, 2);
      return [{ tipo: 'calculo', datos: calculoRLI(rng, PARTIDAS) }, ejCompletar(rng, a), { tipo: 'calculo', datos: calculoF22(rng) }, ejCompletar(rng, b)];
    },
  },
  {
    id: 'avanzado',
    descripcion: 'Una Operación Renta más corta que la del jefe.',
    generar: (rng: Rng): Ejercicio[] => [
      { tipo: 'calculo', datos: calculoRLI(rng, PARTIDAS) },
      { tipo: 'operacionRenta', datos: generarOperacionRenta(rng, PARTIDAS, { agregados: 2, deducciones: 1, sinAjuste: 1 }) },
      { tipo: 'calculo', datos: calculoF22(rng) },
    ],
  },
];

export const nivel5: ContenidoNivel = {
  apuntes: apuntesJson as Apunte[],
  intro: {
    personaje: 'Tía Rosa',
    emoji: '👩‍🍳',
    texto:
      'Llegó abril y con él la Operación Renta. Yo pensaba que el impuesto era el 27% de la utilidad… pero el contador dice que hay que calcular la "Renta Líquida Imponible", que hay gastos que el SII rechaza y que los PPM se descuentan. ¿Me ayudas a no equivocarnos con el SII?',
  },
  preguntas: preguntas as Pregunta[],
  plantillas,
  pasos,
  generarJefe: (rng) => ({ tipo: 'operacionRenta', datos: generarOperacionRenta(rng, PARTIDAS, { agregados: 3, deducciones: 2, sinAjuste: 1 }) }),
  jefe: {
    nombre: 'Sra. Carmen, fiscalizadora del SII',
    emoji: '👩‍⚖️',
    titulo: 'La Operación Renta',
    texto:
      'Buenas tardes. Antes de aceptar el Formulario 22, revise conmigo cada partida: ¿se agrega, se deduce o no se ajusta? Luego calcule la RLI, el Impuesto de Primera Categoría y el saldo después de los PPM. Un error aquí significa una liquidación con multa e intereses.',
    reintentable: true,
    avisoFallo: 'Puedes corregir y volver a entregar, pero ganas la mitad de XP.',
  },
  etiquetaDanio: 'Multa SII',
  cierre:
    '¡Declaración aceptada por el SII! Pero el directorio está preocupado: las ventas crecen, la utilidad también… y aun así la caja está casi vacía. Es hora de ponerse el sombrero de CFO y analizar los números.',
};
