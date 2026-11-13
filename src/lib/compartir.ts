/** Arma el texto y la imagen para compartir el avance en redes sociales. */

export interface DatosCompartir {
  /** Frase principal, por ejemplo: "¡Superé el Paso 3 del Nivel 2!". */
  titulo: string;
  /** Detalles: estrellas, premio, racha… */
  lineas: string[];
  /** Emoji grande de la imagen (el premio actual, un trofeo…). */
  emoji: string;
}

export function urlJuego(): string {
  return typeof window === 'undefined' ? '' : `${window.location.origin}/`;
}

export function textoCompartir(d: DatosCompartir): string {
  return `${d.emoji} ${d.titulo}\n${d.lineas.join('\n')}\n\nEstoy aprendiendo contabilidad jugando con Contabilidad Pro 🥟 ${urlJuego()}`;
}

function envolver(ctx: CanvasRenderingContext2D, texto: string, ancho: number): string[] {
  const palabras = texto.split(' ');
  const lineas: string[] = [];
  let actual = '';
  for (const p of palabras) {
    const prueba = actual ? `${actual} ${p}` : p;
    if (ctx.measureText(prueba).width > ancho && actual) {
      lineas.push(actual);
      actual = p;
    } else actual = prueba;
  }
  if (actual) lineas.push(actual);
  return lineas;
}

/** Imagen cuadrada (1080×1080) lista para Instagram, WhatsApp o Facebook. */
export async function imagenCompartir(d: DatosCompartir): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 1080;
  c.height = 1080;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  const fondo = ctx.createLinearGradient(0, 0, 0, 1080);
  fondo.addColorStop(0, '#1e1b4b');
  fondo.addColorStop(0.55, '#4338ca');
  fondo.addColorStop(1, '#0ea5e9');
  ctx.fillStyle = fondo;
  ctx.fillRect(0, 0, 1080, 1080);

  // Estrellas de fondo (siempre las mismas, para que la imagen sea estable).
  let semilla = 7;
  const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 70; i++) {
    ctx.beginPath();
    ctx.arc(azar() * 1080, azar() * 560, azar() * 2.6 + 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  const fuente = (peso: number, tam: number) => `${peso} ${tam}px Nunito, "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#fde68a';
  ctx.font = fuente(900, 42);
  ctx.fillText('🥟 CONTABILIDAD PRO', 540, 90);

  ctx.font = `260px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.fillText(d.emoji, 540, 330);

  ctx.fillStyle = '#ffffff';
  ctx.font = fuente(900, 64);
  let y = 560;
  for (const l of envolver(ctx, d.titulo, 920).slice(0, 3)) {
    ctx.fillText(l, 540, y);
    y += 76;
  }

  ctx.font = fuente(700, 40);
  ctx.fillStyle = '#e0e7ff';
  y += 14;
  for (const linea of d.lineas.slice(0, 4)) {
    for (const l of envolver(ctx, linea, 940).slice(0, 2)) {
      ctx.fillText(l, 540, y);
      y += 52;
    }
  }

  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(0, 980, 1080, 100);
  ctx.fillStyle = '#ffffff';
  ctx.font = fuente(800, 34);
  ctx.fillText(`Aprende contabilidad jugando · ${window.location.host}`, 540, 1030);

  return new Promise((ok) => c.toBlob((b) => ok(b), 'image/png'));
}

/** Usa el menú de compartir del celular (WhatsApp, Instagram, Facebook…). Devuelve false si no está disponible. */
export async function compartirNativo(d: DatosCompartir, imagen: Blob | null): Promise<'compartido' | 'cancelado' | 'no_disponible'> {
  if (typeof navigator === 'undefined' || !navigator.share) return 'no_disponible';
  const texto = textoCompartir(d);
  try {
    if (imagen) {
      const archivo = new File([imagen], 'mi-avance-contabilidad-pro.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [archivo] })) {
        await navigator.share({ files: [archivo], text: texto, title: 'Contabilidad Pro' });
        return 'compartido';
      }
    }
    await navigator.share({ text: texto, title: 'Contabilidad Pro', url: urlJuego() });
    return 'compartido';
  } catch (e) {
    return (e as Error)?.name === 'AbortError' ? 'cancelado' : 'no_disponible';
  }
}

/** Enlaces para compartir directo en cada red (se abren en una pestaña nueva). */
export function enlacesRedes(d: DatosCompartir): { red: string; emoji: string; url: string }[] {
  const texto = encodeURIComponent(textoCompartir(d));
  const url = encodeURIComponent(urlJuego());
  return [
    { red: 'WhatsApp', emoji: '💬', url: `https://wa.me/?text=${texto}` },
    { red: 'Facebook', emoji: '📘', url: `https://www.facebook.com/sharer/sharer.php?u=${url}` },
    { red: 'X', emoji: '✖️', url: `https://twitter.com/intent/tweet?text=${texto}` },
    { red: 'LinkedIn', emoji: '💼', url: `https://www.linkedin.com/sharing/share-offsite/?url=${url}` },
    { red: 'Telegram', emoji: '✈️', url: `https://t.me/share/url?url=${url}&text=${encodeURIComponent(`${d.emoji} ${d.titulo}`)}` },
  ];
}

/** Datos para compartir con el premio actual, las chispas y la racha del jugador. */
export function datosAvance(
  p: { chispas: number; racha: number },
  titulo: string,
  lineas: string[],
  premio: { emoji: string; nombre: string },
  emoji?: string,
): DatosCompartir {
  const emojiPremio = premio.emoji === 'topo' ? '🐾' : premio.emoji;
  return {
    titulo,
    emoji: emoji ?? emojiPremio,
    lineas: [
      ...lineas,
      `Mi premio: ${emojiPremio} ${premio.nombre} · ${p.chispas.toLocaleString('es-CL')} chispas de saber ✨`,
      ...(p.racha > 1 ? [`Racha: ${p.racha} días seguidos 🔥`] : []),
    ],
  };
}
