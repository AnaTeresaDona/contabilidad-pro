import apuntesJson from './apuntes.json';
import preguntas from './preguntas.json';
import situaciones from './situaciones.json';
import { elegir, elegirVarios, type Rng } from '../../engine/azar';
import type { Ejercicio, Pregunta } from '../../engine/ejercicios';
import {
  calculoAhorro,
  calculoCompuesto,
  calculoCuota,
  calculoDescuento,
  calculoDiasExactos,
  calculoDuplicar,
  calculoInteresSimple,
  calculoReajusteUF,
  calculoTasas,
  generarCreditoHorno,
} from '../../engine/financiera';
import type { Apunte, ContenidoNivel, PasoPractica } from '../tipos';

const banco = situaciones as Pregunta[];

const pasos: PasoPractica[] = [
  {
    id: 'basico',
    descripcion: 'Interés simple, UF e IPC, y días exactos.',
    generar: (rng: Rng): Ejercicio[] => {
      const [p1, p2] = elegirVarios(rng, banco, 2);
      return [
        { tipo: 'calculo', datos: calculoInteresSimple(rng) },
        { tipo: 'pregunta', pregunta: p1 },
        { tipo: 'calculo', datos: calculoReajusteUF(rng) },
        { tipo: 'calculo', datos: calculoDiasExactos(rng) },
        { tipo: 'pregunta', pregunta: p2 },
      ];
    },
  },
  {
    id: 'intermedio',
    descripcion: 'Descuento de pagarés, interés compuesto y la regla del 72.',
    generar: (rng: Rng): Ejercicio[] => {
      const [p] = elegirVarios(rng, banco, 1);
      return [
        { tipo: 'calculo', datos: calculoDescuento(rng) },
        { tipo: 'calculo', datos: calculoCompuesto(rng) },
        { tipo: 'pregunta', pregunta: p },
        { tipo: 'calculo', datos: calculoDuplicar(rng) },
      ];
    },
  },
  {
    id: 'avanzado',
    descripcion: 'Tasas equivalentes, cuotas de crédito y ahorro.',
    generar: (rng: Rng): Ejercicio[] => [
      { tipo: 'calculo', datos: calculoTasas(rng) },
      { tipo: 'calculo', datos: calculoCuota(rng) },
      { tipo: 'calculo', datos: elegir(rng, [calculoAhorro, calculoCompuesto, calculoDescuento])(rng) },
    ],
  },
];

export const nivel7: ContenidoNivel = {
  apuntes: apuntesJson as Apunte[],
  intro: {
    personaje: 'Tía Rosa',
    emoji: '👩‍🍳',
    texto:
      'El horno viejo ya no da más y queremos abrir una segunda sucursal. Dos bancos nos ofrecen crédito, el proveedor nos paga con pagarés y la deuda del local está en UF… Necesito a alguien que entienda de tasas, cuotas e intereses para no tomar una mala decisión.',
  },
  preguntas: preguntas as Pregunta[],
  plantillas: [],
  pasos,
  generarJefe: (rng) => ({ tipo: 'decision', datos: generarCreditoHorno(rng) }),
  jefe: {
    nombre: 'Don Hernán, ejecutivo de banco',
    emoji: '🧑‍💼',
    titulo: 'El crédito para el horno nuevo',
    texto:
      'Tengo dos ofertas para ustedes, y cada banco anuncia su tasa a su manera. Si me dicen cuál les conviene y por qué, con los números en la mano, firmamos hoy mismo.',
    reintentable: true,
    avisoFallo: 'Puedes corregir y volver a presentar, pero ganas la mitad de XP.',
  },
  cierre:
    '¡Excelente! Elegiste el crédito más barato con los números en la mano y el horno nuevo ya está funcionando. Ahora sabes comparar tasas, calcular cuotas y evaluar si una inversión conviene. 💰',
};
