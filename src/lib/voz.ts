import { normalizarHabla, numeroDesdeTexto } from '../engine/numerosHablados';
import { camposDe, escribirEnCampo, marcarCampo, textoNumero, ultimoCampoUsable } from './campos';

// ───────────── Leer en voz alta ─────────────

export function lecturaDisponible(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function vozEspanol(): SpeechSynthesisVoice | undefined {
  const voces = window.speechSynthesis.getVoices();
  for (const pref of ['es-CL', 'es-419', 'es-US', 'es-MX', 'es-AR', 'es-ES'])
    {
      const v = voces.find((x) => x.lang.replace('_', '-') === pref);
      if (v) return v;
    }
  return voces.find((x) => x.lang.toLowerCase().startsWith('es'));
}

/** Prepara un texto de la pantalla para que suene natural. */
export function textoParaVoz(texto: string): string {
  return texto
    .replace(/\p{Extended_Pictographic}|️|‍/gu, ' ')
    .replace(/\$\s?(-?[\d.]+(?:,\d+)?)/g, '$1 pesos')
    .replace(/−/g, ' menos ')
    .replace(/(\d),(\d)/g, '$1 coma $2')
    .replace(/\s*\n+\s*/g, '. ')
    .replace(/\.\s*\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function hablar(texto: string, velocidad = 1, alTerminar?: () => void): void {
  if (!lecturaDisponible()) return;
  const s = window.speechSynthesis;
  s.cancel();
  const u = new SpeechSynthesisUtterance(textoParaVoz(texto));
  u.lang = 'es-CL';
  const v = vozEspanol();
  if (v) u.voice = v;
  u.rate = velocidad;
  if (alTerminar) {
    u.onend = alTerminar;
    u.onerror = alTerminar;
  }
  s.speak(u);
}

export function callar(): void {
  if (lecturaDisponible()) window.speechSynthesis.cancel();
}

// ───────────── Responder hablando ─────────────

interface Reconocedor {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function claseReconocedor(): (new () => Reconocedor) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: new () => Reconocedor; webkitSpeechRecognition?: new () => Reconocedor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function reconocimientoDisponible(): boolean {
  return claseReconocedor() !== null;
}

/** Escucha una frase. Devuelve una función para cancelar. */
export function escuchar(alOir: (alternativas: string[]) => void, alFallar: (motivo: string) => void, alTerminar: () => void): () => void {
  const C = claseReconocedor();
  if (!C) {
    alFallar('Este navegador no permite responder hablando. Prueba con Chrome.');
    alTerminar();
    return () => {};
  }
  callar();
  const r = new C();
  r.lang = 'es-CL';
  r.interimResults = false;
  r.maxAlternatives = 3;
  r.continuous = false;
  r.onresult = (e) => {
    const res = e.results[0];
    const alts: string[] = [];
    for (let i = 0; i < res.length; i++) alts.push(res[i].transcript);
    alOir(alts);
  };
  r.onerror = (e) =>
    alFallar(
      e.error === 'not-allowed' || e.error === 'service-not-allowed'
        ? 'Necesito permiso para usar el micrófono. Revísalo en el candado de la barra de direcciones.'
        : e.error === 'no-speech'
          ? 'No escuché nada. Toca el micrófono y habla.'
          : 'No pude escuchar bien. Intenta de nuevo.',
    );
  r.onend = alTerminar;
  try {
    r.start();
  } catch {
    alFallar('El micrófono está ocupado. Intenta de nuevo.');
    alTerminar();
  }
  return () => r.stop();
}

// ───────────── Interpretar la respuesta en la pantalla ─────────────

const VACIAS = new Set(['el', 'la', 'los', 'las', 'de', 'del', 'al', 'a', 'en', 'y', 'e', 'o', 'un', 'una', 'que', 'es', 'por', 'con', 'se', 'lo', 'su', 'opcion', 'cuenta', 'va', 'van']);

function palabras(s: string): string[] {
  return normalizarHabla(s)
    .split(/[^a-z0-9ñ]+/)
    .filter((w) => w.length > 0 && !VACIAS.has(w));
}

function visible(el: HTMLElement): boolean {
  return el.offsetParent !== null || el.getClientRects().length > 0;
}

function botonesActivos(raiz: ParentNode): HTMLButtonElement[] {
  return [...raiz.querySelectorAll('button')].filter((b) => !b.disabled && visible(b) && !b.closest('[data-herramienta]'));
}

const COMANDOS: { re: RegExp; botones: RegExp; dice: string }[] = [
  { re: /^(comprobar|comprueba|compruebalo|revisar|revisa|listo|confirmar|presentar|enviar|entregar)$/, botones: /^(comprobar|presentar|entregar)/, dice: 'Comprobar' },
  { re: /^(continuar|continua|siguiente|seguir|sigue|avanzar)$/, botones: /^continuar/, dice: 'Continuar' },
  { re: /^(reintentar|reintenta|otra vez|de nuevo|intentar de nuevo)$/, botones: /^(reintentar|intentar de nuevo)/, dice: 'Reintentar' },
  { re: /^(pista|ayuda|dame una pista)$/, botones: /pista/, dice: 'Pista' },
  { re: /^(en que me equivoque|que hice mal|auditoria)$/, botones: /en que me equivoque/, dice: '¿En qué me equivoqué?' },
];

const ORDINALES: Record<string, number> = {
  primera: 0, primero: 0, uno: 0, '1': 0, a: 0,
  segunda: 1, segundo: 1, dos: 1, '2': 1, b: 1,
  tercera: 2, tercero: 2, tres: 2, '3': 2, c: 2,
  cuarta: 3, cuarto: 3, cuatro: 3, '4': 3, d: 3,
  quinta: 4, quinto: 4, cinco: 4, '5': 4, e: 4,
};

/** Texto que identifica la fila de un botón (por ejemplo, el nombre de la cuenta junto a Debe/Haber). */
function etiquetaFila(b: HTMLElement, contenedor: HTMLElement): string {
  let a = b.parentElement;
  while (a && a !== contenedor) {
    const copia = a.cloneNode(true) as HTMLElement;
    copia.querySelectorAll('button').forEach((x) => x.remove());
    const t = (copia.textContent ?? '').trim();
    if (t) return t;
    a = a.parentElement;
  }
  return '';
}

function interseccion(a: string[], b: Set<string>): number {
  return a.filter((w) => b.has(w)).length;
}

export interface RespuestaVoz {
  ok: boolean;
  mensaje: string;
}

function elegirBoton(frase: string, contenedor: HTMLElement): HTMLButtonElement | 'ambiguo' | null {
  const botones = botonesActivos(contenedor).filter((b) => !/^(comprobar|presentar|entregar)/.test(normalizarHabla(b.textContent ?? '')));
  if (botones.length === 0) return null;
  const filas = botones.map((b) => etiquetaFila(b, contenedor));
  const unaSolaFila = new Set(filas).size === 1;
  const dichas = new Set(palabras(frase));
  const norm = normalizarHabla(frase).replace(/^(la |el )?(opcion |alternativa )?/, '').trim();

  if (unaSolaFila && norm in ORDINALES && ORDINALES[norm] < botones.length) return botones[ORDINALES[norm]];

  let mejor: { b: HTMLButtonElement; total: number } | null = null;
  let empate = false;
  botones.forEach((b, i) => {
    const pb = palabras(b.textContent ?? '');
    if (pb.length === 0) return;
    const enBoton = interseccion(pb, dichas) / pb.length;
    if (enBoton < (pb.length > 3 ? 0.4 : 0.5)) return;
    const pf = palabras(filas[i]);
    const enFila = unaSolaFila || pf.length === 0 ? 0 : interseccion(pf, dichas) / pf.length;
    const total = enBoton * 2 + enFila;
    if (!mejor || total > mejor.total + 0.001) {
      mejor = { b, total };
      empate = false;
    } else if (Math.abs(total - mejor.total) <= 0.001) empate = true;
  });
  if (!mejor) return null;
  return empate ? 'ambiguo' : (mejor as { b: HTMLButtonElement }).b;
}

/** Aplica lo que dijo el jugador: un comando, un número en un campo o la elección de una alternativa. */
export function aplicarVoz(alternativas: string[], contenedor: HTMLElement): RespuestaVoz {
  const dicho = alternativas[0] ?? '';
  const norm = normalizarHabla(dicho).replace(/[.,;]+$/, '');

  // 1. Comandos cortos ("comprobar", "continuar", "pista").
  for (const c of COMANDOS) {
    if (c.re.test(norm)) {
      const b = botonesActivos(document).find((x) => c.botones.test(normalizarHabla(x.textContent ?? '').replace(/^[^a-z]+/, '')));
      if (b) {
        b.click();
        return { ok: true, mensaje: `Toqué «${c.dice}».` };
      }
      return { ok: false, mensaje: `Ahora no hay un botón «${c.dice}».` };
    }
  }

  // 2. Números: se escriben en el campo elegido y se pasa al siguiente.
  const campos = camposDe(contenedor);
  if (campos.length > 0) {
    for (const alt of alternativas) {
      const n = numeroDesdeTexto(alt);
      if (n === null) continue;
      const elegido = ultimoCampoUsable();
      const objetivo = elegido && contenedor.contains(elegido) ? elegido : (campos.find((c) => !c.value) ?? campos[0]);
      const conDecimales = (objetivo.placeholder ?? '').includes(',');
      const texto = textoNumero(conDecimales ? n : Math.round(n));
      escribirEnCampo(objetivo, texto);
      const siguiente = campos.slice(campos.indexOf(objetivo) + 1).find((c) => !c.value) ?? null;
      campos.forEach((c) => (c.style.outline = ''));
      if (siguiente) {
        siguiente.style.outline = '3px solid #f59e0b';
        siguiente.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      marcarCampo(siguiente);
      const nombre = objetivo.getAttribute('aria-label');
      return { ok: true, mensaje: `Escribí ${texto}${nombre ? ` en «${nombre}»` : ''}.` };
    }
  }

  // 3. Alternativas o botones por fila ("caja al debe", "la segunda").
  const segmentos = [dicho, ...dicho.split(/,|;|\by luego\b|\by después\b|\s+y\s+(?=[a-záéíóúñ ]+\s(?:al|a la|en|como|es)\s)/i)].map((s) => s.trim()).filter(Boolean);
  const tocados: string[] = [];
  const unicos = [...new Set(segmentos)];
  for (const seg of unicos) {
    const r = elegirBoton(seg, contenedor);
    if (r === 'ambiguo') {
      if (seg === dicho && unicos.length > 1) continue;
      return { ok: false, mensaje: 'Hay varias filas con esa opción. Di también el nombre, por ejemplo: «Caja al Debe».' };
    }
    if (r) {
      r.click();
      tocados.push((r.textContent ?? '').trim());
      if (seg === dicho) break;
    }
  }
  if (tocados.length) return { ok: true, mensaje: `Elegí: ${tocados.join(' · ')}.` };

  if (campos.length > 0) return { ok: false, mensaje: `Escuché «${dicho}», pero no entendí un número. Prueba con «un millón doscientos mil».` };
  return { ok: false, mensaje: `Escuché «${dicho}», pero no encontré esa opción. Di parte del texto de la alternativa o «la primera», «la segunda»…` };
}
