import n1 from './n1.json';
import n2 from './n2.json';
import n3 from './n3.json';
import n4a from './n4a.json';
import n4b from './n4b.json';
import n5 from './n5.json';
import n6 from './n6.json';
import n7 from './n7.json';
import n8 from './n8.json';
import n9 from './n9.json';
import type { PreguntaConcepto } from '../../engine/conceptos';

/**
 * Preguntas de repaso de conceptos por nivel. Cada una trae la respuesta completa,
 * dos correctas pero incompletas y dos incorrectas.
 */
export const CONCEPTOS: Record<string, PreguntaConcepto[]> = { n1, n2, n3, n4a, n4b, n5, n6, n7, n8, n9 };
