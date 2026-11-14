import apuntesJson from './apuntes.json';
import preguntas from './preguntas.json';
import situaciones from './situaciones.json';
import clasificaciones from './clasificaciones.json';
import { elegirVarios, type Rng } from '../../engine/azar';
import type { Ejercicio, Pregunta } from '../../engine/ejercicios';
import {
  calculoMPM,
  calculoReexpresionNic1,
  calculoSubtotalesNiif18,
  generarTransicionNiif18,
  ordenEstadoNiif18,
} from '../../engine/niif18';
import { armarClasificar } from '../nivel8';
import type { Apunte, ContenidoNivel, PasoPractica } from '../tipos';

const banco = situaciones as Pregunta[];

export const categoriasNiif18 = (rng: Rng) =>
  armarClasificar(
    rng,
    {
      titulo: '¿En qué categoría va cada partida?',
      instruccion: 'Clasifica cada ingreso o gasto de la ferretería (una empresa comercial) en su categoría de la NIIF 18.',
      opciones: [
        { id: 'operacion', etiqueta: 'Operación' },
        { id: 'inversion', etiqueta: 'Inversión' },
        { id: 'financiacion', etiqueta: 'Financiación' },
        { id: 'impuestos', etiqueta: 'Impuestos' },
        { id: 'discontinuadas', etiqueta: 'Discontinuadas' },
      ],
      tema: 'Categorías NIIF 18',
      pista: 'Inversión: asociadas, efectivo y activos que rinden por sí solos. Financiación: intereses de préstamos, bonos y otros pasivos (arriendos, provisiones). Impuestos: impuesto a la renta. Discontinuadas: NIIF 5. Todo lo demás, aunque sea inusual: operación.',
    },
    clasificaciones.categorias,
    7,
  );

export const flujosNic7 = (rng: Rng) =>
  armarClasificar(
    rng,
    {
      titulo: 'Flujos de efectivo con la NIC 7 modificada',
      instruccion: 'Clasifica cada flujo de la ferretería en su actividad. Ojo con los intereses y dividendos: ya no hay opción.',
      opciones: [
        { id: 'operacion', etiqueta: 'Operación' },
        { id: 'inversion', etiqueta: 'Inversión' },
        { id: 'financiacion', etiqueta: 'Financiación' },
      ],
      tema: 'Flujos de efectivo (NIC 7 modificada)',
      pista: 'Empresa comercial: intereses y dividendos pagados → financiación; intereses y dividendos recibidos → inversión. El impuesto a la renta, normalmente operación.',
    },
    clasificaciones.flujos,
  );

const pasos: PasoPractica[] = [
  {
    id: 'basico',
    descripcion: 'Las cinco categorías y la nueva estructura del estado del resultado.',
    generar: (rng: Rng): Ejercicio[] => {
      const [p1, p2] = elegirVarios(rng, banco, 2);
      return [
        { tipo: 'clasificarOpciones', datos: categoriasNiif18(rng) },
        { tipo: 'pregunta', pregunta: p1 },
        { tipo: 'ordenar', datos: ordenEstadoNiif18(rng) },
        { tipo: 'pregunta', pregunta: p2 },
      ];
    },
  },
  {
    id: 'intermedio',
    descripcion: 'Los subtotales obligatorios y los flujos de efectivo.',
    generar: (rng: Rng): Ejercicio[] => {
      const [p] = elegirVarios(rng, banco, 1);
      return [
        { tipo: 'calculo', datos: calculoSubtotalesNiif18(rng) },
        { tipo: 'clasificarOpciones', datos: flujosNic7(rng) },
        { tipo: 'pregunta', pregunta: p },
        { tipo: 'clasificarOpciones', datos: categoriasNiif18(rng) },
      ];
    },
  },
  {
    id: 'avanzado',
    descripcion: 'Reexpresar desde la NIC 1 y las medidas de la gerencia (MPM).',
    generar: (rng: Rng): Ejercicio[] => [
      { tipo: 'calculo', datos: calculoReexpresionNic1(rng) },
      { tipo: 'calculo', datos: calculoMPM(rng) },
      { tipo: 'calculo', datos: calculoSubtotalesNiif18(rng) },
    ],
  },
];

export const nivel9: ContenidoNivel = {
  apuntes: apuntesJson as Apunte[],
  intro: {
    personaje: 'Don Lucho',
    emoji: '👨‍🔧',
    texto:
      '¡Recién terminamos de pasar a NIIF y ya viene otro cambio! La auditora dice que desde 2027 la NIC 1 se reemplaza por la NIIF 18 y que hay que rehacer el estado de resultados de 2026. ¿Me ayudas a entender qué cambia?',
  },
  preguntas: preguntas as Pregunta[],
  plantillas: [],
  pasos,
  generarJefe: (rng) => ({ tipo: 'decision', datos: generarTransicionNiif18(rng) }),
  jefe: {
    nombre: 'La auditora externa',
    emoji: '👩‍💼',
    titulo: 'El comparativo 2026 bajo NIIF 18',
    texto:
      'Los primeros estados con NIIF 18 serán los de 2027, pero el comparativo 2026 debe venir reexpresado y conciliado con lo que presentaron con la NIC 1. Muéstrenme los números y cómo lo van a presentar.',
    reintentable: true,
    avisoFallo: 'Puedes corregir y volver a presentar, pero ganas la mitad de XP.',
  },
  etiquetaDanio: 'Observación de auditoría',
  cierre:
    '¡Listos para 2027! La ferretería ya tiene su estado del resultado con las categorías y subtotales de la NIIF 18, el comparativo reexpresado y su nota de medidas de la gerencia. Estás al día con la norma más nueva. 🚀',
};
