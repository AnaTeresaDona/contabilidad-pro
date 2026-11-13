import apuntesJson from './apuntes.json';
import preguntas from './preguntas.json';
import situaciones from './situaciones.json';
import clasificaciones from './clasificaciones.json';
import { elegir, elegirVarios, type Rng } from '../../engine/azar';
import type { Ejercicio, EjercicioClasificar, Pregunta } from '../../engine/ejercicios';
import {
  calculoAjustesTransicion,
  calculoCostoActivo,
  calculoErrorNIC8,
  calculoMantenidoVenta,
  calculoMedicionPosterior,
  generarAperturaNIIF,
} from '../../engine/niif';
import type { Apunte, ContenidoNivel, PasoPractica } from '../tipos';

const banco = situaciones as Pregunta[];
type Item = EjercicioClasificar['items'][number];

/** Una partida de cada categoría y el resto al azar, para que aparezcan todas. */
function armarClasificar(
  rng: Rng,
  base: Omit<EjercicioClasificar, 'items'>,
  items: Item[],
  n = 6,
): EjercicioClasificar {
  const una = base.opciones.map((o) => elegir(rng, items.filter((it) => it.correcta === o.id)));
  const resto = elegirVarios(rng, items.filter((it) => !una.includes(it)), n - una.length);
  return { ...base, items: elegirVarios(rng, [...una, ...resto], n) };
}

export const tiposDeAjuste = (rng: Rng) =>
  armarClasificar(
    rng,
    {
      titulo: '¿Qué ajuste de transición corresponde?',
      instruccion: 'Para el balance de apertura NIIF, decide qué hacer con cada partida del balance PCGA.',
      opciones: [
        { id: 'eliminar', etiqueta: 'Eliminar' },
        { id: 'reconocer', etiqueta: 'Reconocer' },
        { id: 'reclasificar', etiqueta: 'Reclasificar' },
        { id: 'valorizar', etiqueta: 'Valorizar' },
      ],
      tema: 'Ajustes de transición (NIIF 1)',
      pista: 'Eliminar: no es activo ni pasivo bajo NIIF. Reconocer: falta y las NIIF lo exigen. Reclasificar: está, pero en otro rubro. Valorizar: está en el rubro correcto, pero mal medido.',
    },
    clasificaciones.ajustes,
  );

export const normaDelActivo = (rng: Rng) =>
  armarClasificar(
    rng,
    {
      titulo: '¿Bajo qué norma va cada bien?',
      instruccion: 'Clasifica cada bien según para qué lo tiene la empresa.',
      opciones: [
        { id: 'ppe', etiqueta: 'PPE (NIC 16)' },
        { id: 'pi', etiqueta: 'Prop. de inversión (NIC 40)' },
        { id: 'venta', etiqueta: 'Para la venta (NIIF 5)' },
        { id: 'inventario', etiqueta: 'Inventario (NIC 2)' },
      ],
      tema: 'NIC 16, NIC 40, NIIF 5 o NIC 2',
      pista: 'Se usa en el negocio: NIC 16. Se tiene para rentas o plusvalía: NIC 40. Se decidió venderlo y la venta es muy probable en 12 meses: NIIF 5. Se vende en el giro normal: NIC 2.',
    },
    clasificaciones.normas,
  );

export const politicaEstimacionError = (rng: Rng) =>
  armarClasificar(
    rng,
    {
      titulo: '¿Política, estimación o error?',
      instruccion: 'Según la NIC 8, clasifica cada situación. De eso depende si se corrige hacia atrás o desde ahora.',
      opciones: [
        { id: 'politica', etiqueta: 'Cambio de política' },
        { id: 'estimacion', etiqueta: 'Cambio de estimación' },
        { id: 'error', etiqueta: 'Error de un período anterior' },
      ],
      tema: 'Políticas, estimaciones y errores (NIC 8)',
      pista: 'Política: cambia la regla (retrospectivo). Estimación: cambia el juicio por nueva información, incluso el método de depreciación (prospectivo). Error: algo se hizo mal antes (reexpresión retrospectiva).',
    },
    clasificaciones.nic8,
  );

const pasos: PasoPractica[] = [
  {
    id: 'basico',
    descripcion: 'Marco conceptual, ajustes de transición y el costo de un activo fijo.',
    generar: (rng: Rng): Ejercicio[] => {
      const [p1, p2] = elegirVarios(rng, banco, 2);
      return [
        { tipo: 'clasificarOpciones', datos: tiposDeAjuste(rng) },
        { tipo: 'pregunta', pregunta: p1 },
        { tipo: 'calculo', datos: calculoCostoActivo(rng) },
        { tipo: 'pregunta', pregunta: p2 },
      ];
    },
  },
  {
    id: 'intermedio',
    descripcion: 'NIC 16, NIC 40 y NIIF 5: clasificar y medir.',
    generar: (rng: Rng): Ejercicio[] => {
      const [p] = elegirVarios(rng, banco, 1);
      return [
        { tipo: 'clasificarOpciones', datos: normaDelActivo(rng) },
        { tipo: 'calculo', datos: calculoMedicionPosterior(rng) },
        { tipo: 'pregunta', pregunta: p },
        { tipo: 'calculo', datos: calculoMantenidoVenta(rng) },
      ];
    },
  },
  {
    id: 'avanzado',
    descripcion: 'NIC 8 y el patrimonio NIIF de apertura.',
    generar: (rng: Rng): Ejercicio[] => [
      { tipo: 'clasificarOpciones', datos: politicaEstimacionError(rng) },
      { tipo: 'calculo', datos: calculoErrorNIC8(rng) },
      { tipo: 'calculo', datos: calculoAjustesTransicion(rng) },
    ],
  },
];

export const nivel8: ContenidoNivel = {
  apuntes: apuntesJson as Apunte[],
  intro: {
    personaje: 'Don Lucho',
    emoji: '👨‍🔧',
    texto:
      'Llevo 30 años con la Ferretería El Roble y siempre hicimos la contabilidad «a la chilena», con los PCGA de antes. Ahora entra un socio inversionista y el banco nos pide estados financieros bajo NIIF. La Tía Rosa me dijo que tú sabes de esto: ¿me ayudas a hacer la transición?',
  },
  preguntas: preguntas as Pregunta[],
  plantillas: [],
  pasos,
  generarJefe: (rng) => ({ tipo: 'decision', datos: generarAperturaNIIF(rng) }),
  jefe: {
    nombre: 'La auditora externa',
    emoji: '👩‍💼',
    titulo: 'El balance de apertura NIIF',
    texto:
      'Revisé el balance PCGA de la ferretería a la fecha de transición y encontré varias diferencias. Necesito el balance de apertura bajo NIIF, la conciliación del patrimonio y que me expliquen cómo lo van a presentar.',
    reintentable: true,
    avisoFallo: 'Puedes corregir y volver a entregar, pero ganas la mitad de XP.',
  },
  etiquetaDanio: 'Observación de auditoría',
  cierre:
    '¡Transición lograda! La auditora firmó sin salvedades, el socio entró a la ferretería y Don Lucho ya tiene sus primeros estados bajo NIIF. Ahora sabes adoptar las NIIF, medir activos fijos y corregir errores como manda la NIC 8. 🏅',
};
