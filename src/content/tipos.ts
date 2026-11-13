import type { Rng } from '../engine/azar';
import type { Ejercicio, Pregunta } from '../engine/ejercicios';
import type { Plantilla } from '../engine/plantillas';

/** Un tema de los apuntes del nivel: lo que hay que saber antes de jugar. */
export interface Apunte {
  id: string;
  titulo: string;
  /** Ideas clave, en orden. */
  puntos: string[];
  /** Un ejemplo con números o un caso de la Tía Rosa. */
  ejemplo?: string;
  /** De dónde viene: ley, artículo, norma o concepto. */
  fuente: string;
}

/** Un paso de práctica del nivel. Los pasos van de menor a mayor dificultad. */
export interface PasoPractica {
  id: 'basico' | 'intermedio' | 'avanzado';
  /** Qué se practica en este paso, en pocas palabras. */
  descripcion: string;
  generar: (rng: Rng) => Ejercicio[];
}

export interface ContenidoNivel {
  /** Apuntes para estudiar antes de la trivia, en el orden del índice. */
  apuntes: Apunte[];
  intro: { personaje: string; emoji: string; texto: string };
  preguntas: Pregunta[];
  plantillas: Plantilla[];
  /** Tres pasos de práctica: básico, intermedio y avanzado. */
  pasos: PasoPractica[];
  generarJefe: (rng: Rng) => Ejercicio;
  jefe: {
    nombre: string;
    emoji: string;
    titulo: string;
    texto: string;
    /** true: se puede corregir y reintentar. false: si falla, se genera un desafío nuevo. */
    reintentable: boolean;
    avisoFallo: string;
  };
  /** Cómo se llama el daño a la caja en este nivel (por defecto, "Caja"). Ej: "Sanción CMF". */
  etiquetaDanio?: string;
  cierre: string;
}

export interface NivelInfo {
  id: string;
  numero: string;
  titulo: string;
  tema: string;
  etapa: string;
  color: 'emerald' | 'sky' | 'violet' | 'amber' | 'rose' | 'indigo' | 'teal';
}
