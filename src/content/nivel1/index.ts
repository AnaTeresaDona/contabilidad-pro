import preguntas from './preguntas.json';
import plantillasJson from './plantillas.json';
import type { Plantilla } from '../../engine/plantillas';
import { elegirVarios, type Rng } from '../../engine/azar';
import {
  ejClasificar,
  ejCompletar,
  ejCuentaT,
  ejDebeHaber,
  ejLibroErrores,
  type Ejercicio,
  type Pregunta,
} from '../../engine/ejercicios';
import type { ContenidoNivel } from '../tipos';

const plantillas = plantillasJson as unknown as Plantilla[];

function generarPractica(rng: Rng): Ejercicio[] {
  const [a, b, c] = elegirVarios(rng, plantillas, 3);
  return [ejClasificar(rng), ejDebeHaber(rng, a), ejCuentaT(rng), ejDebeHaber(rng, b), ejCompletar(rng, c)];
}

export const nivel1: ContenidoNivel = {
  intro: {
    personaje: 'Tía Rosa',
    emoji: '👩‍🍳',
    texto:
      '¡Hola! Soy la Tía Rosa. Acabo de abrir mi local de empanadas y necesito a alguien que lleve las cuentas. Mi sobrino dice que la contabilidad es "puro sumar y restar"… pero yo no entiendo nada de Debe y Haber. ¿Me ayudas?',
  },
  preguntas: preguntas as Pregunta[],
  plantillas,
  generarPractica,
  generarJefe: (rng) => ejLibroErrores(rng, plantillas),
  jefe: {
    nombre: 'Don Ramiro',
    emoji: '👴',
    titulo: 'El libro de Don Ramiro',
    reintentable: false,
    avisoFallo: 'Si fallas, Don Ramiro te pasa otro libro.',
    texto:
      'Mañana me jubilo, mijo. Te dejo mi libro diario: impecable, ¡cuarenta años sin un error! (La Tía Rosa te susurra: "Revísalo bien. Yo creo que hay exactamente 2 asientos malos, y el banco viene mañana").',
  },
  cierre:
    '¡Lo lograste! Por fin entiendo mi negocio con Debe y Haber. Ahora viene el primer cierre de mes: facturas, boletas y el famoso Balance de 8 columnas.',
};
