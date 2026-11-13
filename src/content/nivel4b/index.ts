import apuntesJson from './apuntes.json';
import preguntas from './preguntas.json';
import situaciones from './situaciones.json';
import afirmaciones from './afirmaciones.json';
import plantillasJson from './plantillas.json';
import type { Plantilla } from '../../engine/plantillas';
import { elegir, elegirVarios, type Rng } from '../../engine/azar';
import { ejCompletar, type Ejercicio, type Pregunta } from '../../engine/ejercicios';
import {
  calculoArrendamiento,
  calculoDeterioro,
  calculoDividendoMinimo,
  calculoGananciaPorAccion,
  generarFiscalizacion,
  type Afirmacion,
} from '../../engine/ifrs';
import type { Apunte, ContenidoNivel, PasoPractica } from '../tipos';

const plantillas = plantillasJson as unknown as Plantilla[];
const banco = situaciones as Pregunta[];
const bancoAfirmaciones = afirmaciones as Afirmacion[];

const otrosCalculos = [calculoDeterioro, calculoGananciaPorAccion, calculoDividendoMinimo];

const pasos: PasoPractica[] = [
  {
    id: 'basico',
    descripcion: 'Preguntas de NIIF plenas y CMF, y un arrendamiento.',
    generar: (rng: Rng): Ejercicio[] => {
      const [p1, p2, p3] = elegirVarios(rng, banco, 3);
      return [
        { tipo: 'pregunta', pregunta: p1 },
        { tipo: 'pregunta', pregunta: p2 },
        { tipo: 'calculo', datos: calculoArrendamiento(rng) },
        { tipo: 'pregunta', pregunta: p3 },
      ];
    },
  },
  {
    id: 'intermedio',
    descripcion: 'Deterioro, ganancia por acción, dividendos y asientos.',
    generar: (rng: Rng): Ejercicio[] => {
      const [a, b] = elegirVarios(rng, plantillas, 2);
      const [c1, c2] = elegirVarios(rng, otrosCalculos, 2);
      return [ejCompletar(rng, a), { tipo: 'calculo', datos: c1(rng) }, ejCompletar(rng, b), { tipo: 'calculo', datos: c2(rng) }];
    },
  },
  {
    id: 'avanzado',
    descripcion: 'Una fiscalización más corta que la del jefe.',
    generar: (rng: Rng): Ejercicio[] => [
      { tipo: 'calculo', datos: calculoArrendamiento(rng) },
      { tipo: 'fiscalizacion', afirmaciones: generarFiscalizacion(rng, bancoAfirmaciones, 2, 2) },
      { tipo: 'calculo', datos: elegir(rng, otrosCalculos)(rng) },
    ],
  },
];

export const nivel4b: ContenidoNivel = {
  apuntes: apuntesJson as Apunte[],
  intro: {
    personaje: 'Tía Rosa',
    emoji: '👩‍🍳',
    texto:
      '¡Lo logramos: "Empanadas La Tía S.A." ya transa en la bolsa! Ahora somos una sociedad anónima abierta: aplicamos NIIF completas, informamos cada trimestre a la CMF y tenemos accionistas que no conozco. El abogado dice que un error ahora puede costar una sanción…',
  },
  preguntas: preguntas as Pregunta[],
  plantillas,
  pasos,
  generarJefe: (rng) => ({ tipo: 'fiscalizacion', afirmaciones: generarFiscalizacion(rng, bancoAfirmaciones, 3, 3) }),
  jefe: {
    nombre: 'Sr. Fuentes, fiscalizador de la CMF',
    emoji: '🕴️',
    titulo: 'La fiscalización de la CMF',
    texto:
      'Buenos días. Revisamos los estados financieros y la información que entregaron al mercado. Le presento seis situaciones: exactamente tres son infracciones. Identifíquelas y explíqueme por qué… o la Comisión aplicará sanciones.',
    reintentable: false,
    avisoFallo: 'Si fallas, la CMF aplica una sanción y revisa otras seis situaciones.',
  },
  etiquetaDanio: 'Sanción CMF',
  cierre:
    '¡La CMF cerró la fiscalización y aceptó nuestras correcciones! Pero se acerca abril y con él la Operación Renta: hay que calcular la Renta Líquida Imponible y declarar al SII…',
};
