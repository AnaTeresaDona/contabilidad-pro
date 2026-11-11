import preguntas from './preguntas.json';
import situaciones from './situaciones.json';
import partidasJson from './partidas.json';
import plantillasJson from './plantillas.json';
import type { Plantilla } from '../../engine/plantillas';
import { elegirVarios, type Rng } from '../../engine/azar';
import { ejCompletar, type Ejercicio, type Pregunta } from '../../engine/ejercicios';
import { calculoF22, calculoRLI, elegirPartidas, generarOperacionRenta, type PartidaBanco } from '../../engine/tributario';
import type { ContenidoNivel } from '../tipos';

const plantillas = plantillasJson as unknown as Plantilla[];
const banco = situaciones as Pregunta[];
export const PARTIDAS = partidasJson as PartidaBanco[];

function generarPractica(rng: Rng): Ejercicio[] {
  const [a, b] = elegirVarios(rng, plantillas, 2);
  const [p] = elegirVarios(rng, banco, 1);
  return [
    { tipo: 'clasificarPartidas', partidas: elegirPartidas(rng, PARTIDAS, 2, 2, 1) },
    { tipo: 'calculo', datos: calculoRLI(rng, PARTIDAS) },
    ejCompletar(rng, a),
    { tipo: 'pregunta', pregunta: p },
    rng() < 0.5 ? { tipo: 'calculo', datos: calculoF22(rng) } : ejCompletar(rng, b),
  ];
}

export const nivel5: ContenidoNivel = {
  intro: {
    personaje: 'Tía Rosa',
    emoji: '👩‍🍳',
    texto:
      'Llegó abril y con él la Operación Renta. Yo pensaba que el impuesto era el 27% de la utilidad… pero el contador dice que hay que calcular la "Renta Líquida Imponible", que hay gastos que el SII rechaza y que los PPM se descuentan. ¿Me ayudas a no equivocarnos con el SII?',
  },
  preguntas: preguntas as Pregunta[],
  plantillas,
  generarPractica,
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
