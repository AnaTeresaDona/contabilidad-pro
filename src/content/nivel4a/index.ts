import apuntesJson from './apuntes.json';
import preguntas from './preguntas.json';
import situaciones from './situaciones.json';
import plantillasJson from './plantillas.json';
import type { Plantilla } from '../../engine/plantillas';
import { elegirVarios, type Rng } from '../../engine/azar';
import { ejCompletar, type Ejercicio, type Pregunta } from '../../engine/ejercicios';
import { calculoDepreciacion, calculoReexpresion, generarAjustesCierre } from '../../engine/ajustes';
import type { Apunte, ContenidoNivel } from '../tipos';
import { nivel3 } from '../nivel3';

const ajustes = plantillasJson as unknown as Plantilla[];
const ajustesDelMes = ajustes.filter((p) => p.id !== 'ajuste_depreciacion_anual');
/** Operaciones normales del mes (niveles 1 y 2), sobre las que se hacen los ajustes. */
const delMes = nivel3.plantillas;
const banco = situaciones as Pregunta[];

function generarPractica(rng: Rng): Ejercicio[] {
  const [a, b] = elegirVarios(rng, ajustes, 2);
  const [p] = elegirVarios(rng, banco, 1);
  return [
    { tipo: 'calculo', datos: calculoDepreciacion(rng) },
    ejCompletar(rng, a),
    { tipo: 'pregunta', pregunta: p },
    ejCompletar(rng, b),
    { tipo: 'calculo', datos: calculoReexpresion(rng, delMes) },
  ];
}

export const nivel4a: ContenidoNivel = {
  apuntes: apuntesJson as Apunte[],
  intro: {
    personaje: 'Tía Rosa',
    emoji: '👩‍🍳',
    texto:
      'Ya tenemos dos locales, un horno nuevo y una camioneta. El banco ahora exige estados financieros bajo NIIF para las PYMES y revisados por un auditor externo. Dicen que hay que hacer "ajustes de cierre"… ¿el horno se gasta aunque no le pague nada?',
  },
  preguntas: preguntas as Pregunta[],
  plantillas: ajustes,
  generarPractica,
  // El jefe ajusta el cierre de un mes: se excluye la depreciación anual para no mezclar períodos.
  generarJefe: (rng) => ({ tipo: 'ajustesCierre', datos: generarAjustesCierre(rng, delMes, ajustesDelMes, 3) }),
  jefe: {
    nombre: 'Sra. Inés, auditora externa',
    emoji: '🕵️‍♀️',
    titulo: 'La revisión de la auditora',
    texto:
      'Revisé el cierre y faltan tres ajustes. Regístrelos y dígame cuál es el resultado ajustado del período. Sin esto no puedo firmar mi informe, y sin mi informe el banco no renueva la línea de crédito.',
    reintentable: true,
    avisoFallo: 'Puedes corregir y volver a entregar, pero ganas la mitad de XP.',
  },
  cierre:
    '¡La auditora firmó sin observaciones! Y hay noticias: unos inversionistas quieren que "Empanadas La Tía" se abra a la bolsa. Eso significa IFRS completas y la supervisión de la CMF…',
};
