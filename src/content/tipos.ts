import type { Rng } from '../engine/azar';
import type { Ejercicio, Pregunta } from '../engine/ejercicios';
import type { Plantilla } from '../engine/plantillas';

export interface ContenidoNivel {
  intro: { personaje: string; emoji: string; texto: string };
  preguntas: Pregunta[];
  plantillas: Plantilla[];
  generarPractica: (rng: Rng) => Ejercicio[];
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
