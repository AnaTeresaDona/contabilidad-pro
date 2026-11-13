import apuntesJson from './apuntes.json';
import preguntas from './preguntas.json';
import situaciones from './situaciones.json';
import razones from './razones.json';
import { elegir, elegirVarios, type Rng } from '../../engine/azar';
import type { Ejercicio, EjercicioClasificar, Pregunta } from '../../engine/ejercicios';
import {
  calculoActividad,
  calculoEndeudamiento,
  calculoFlujoOperacional,
  calculoLiquidez,
  calculoRentabilidad,
  calculoVerticalHorizontal,
  generarCrisis,
} from '../../engine/analisis';
import type { Apunte, ContenidoNivel, PasoPractica } from '../tipos';

const banco = situaciones as Pregunta[];
const bancoRazones = razones as EjercicioClasificar['items'];

export const FAMILIAS = [
  { id: 'liquidez', etiqueta: 'Liquidez' },
  { id: 'endeudamiento', etiqueta: 'Endeudamiento' },
  { id: 'rentabilidad', etiqueta: 'Rentabilidad' },
  { id: 'actividad', etiqueta: 'Actividad' },
];

/** Una razón de cada familia y dos más al azar. */
export function familiasDeRazones(rng: Rng): EjercicioClasificar {
  const una = FAMILIAS.map((f) => elegir(rng, bancoRazones.filter((r) => r.correcta === f.id)));
  const resto = elegirVarios(rng, bancoRazones.filter((r) => !una.includes(r)), 2);
  return {
    titulo: '¿A qué familia pertenece cada razón?',
    instruccion: 'Cada familia responde una pregunta distinta: ¿puedo pagar pronto? ¿cuánto debo? ¿cuánto gano? ¿qué tan rápido gira el dinero?',
    opciones: FAMILIAS,
    items: elegirVarios(rng, [...una, ...resto], 6),
  };
}

const pasos: PasoPractica[] = [
  {
    id: 'basico',
    descripcion: 'Familias de razones, liquidez e interpretación.',
    generar: (rng: Rng): Ejercicio[] => {
      const [p1, p2] = elegirVarios(rng, banco, 2);
      return [
        { tipo: 'clasificarOpciones', datos: familiasDeRazones(rng) },
        { tipo: 'pregunta', pregunta: p1 },
        { tipo: 'calculo', datos: calculoLiquidez(rng) },
        { tipo: 'pregunta', pregunta: p2 },
      ];
    },
  },
  {
    id: 'intermedio',
    descripcion: 'Endeudamiento, rentabilidad y actividad.',
    generar: (rng: Rng): Ejercicio[] => {
      const [p] = elegirVarios(rng, banco, 1);
      return [
        { tipo: 'calculo', datos: calculoEndeudamiento(rng) },
        { tipo: 'calculo', datos: calculoRentabilidad(rng) },
        { tipo: 'calculo', datos: calculoActividad(rng) },
        { tipo: 'pregunta', pregunta: p },
      ];
    },
  },
  {
    id: 'avanzado',
    descripcion: 'Análisis vertical y horizontal, y flujo de efectivo.',
    generar: (rng: Rng): Ejercicio[] => [
      { tipo: 'calculo', datos: calculoVerticalHorizontal(rng) },
      { tipo: 'calculo', datos: calculoFlujoOperacional(rng) },
      { tipo: 'calculo', datos: elegir(rng, [calculoLiquidez, calculoEndeudamiento, calculoRentabilidad, calculoActividad])(rng) },
    ],
  },
];

export const nivel6: ContenidoNivel = {
  apuntes: apuntesJson as Apunte[],
  intro: {
    personaje: 'Tía Rosa',
    emoji: '👩‍🍳',
    texto:
      'No entiendo nada: este año vendimos más que nunca y la utilidad creció… pero el banco no nos quiere renovar la línea de crédito y casi no tenemos plata para pagar sueldos. El directorio te nombró CFO. Necesito que leas los números y me digas qué está pasando.',
  },
  preguntas: preguntas as Pregunta[],
  plantillas: [],
  pasos,
  generarJefe: (rng) => ({ tipo: 'crisis', datos: generarCrisis(rng) }),
  jefe: {
    nombre: 'El directorio',
    emoji: '🏛️',
    titulo: 'La crisis de caja',
    texto:
      'Señor CFO: vendemos más, ganamos más, y aun así estamos sin caja. Calcule los indicadores clave de los dos años, explíquenos qué pasó y díganos qué hacer. De su respuesta depende el futuro de la empresa.',
    reintentable: true,
    avisoFallo: 'Puedes corregir y volver a presentar, pero ganas la mitad de XP.',
  },
  cierre:
    '¡Lo lograste! Liberamos la caja, renegociamos la deuda y la empresa sigue creciendo, ahora con los números en orden. Pasaste de registrar tu primer asiento a dirigir las finanzas de una sociedad anónima. ¡Felicitaciones, CFO! 🎓',
};
