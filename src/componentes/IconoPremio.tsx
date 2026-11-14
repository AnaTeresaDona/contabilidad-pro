import type { Premio } from '../content/premios';

/** El topo no tiene emoji: se dibuja. */
function Topo({ tam }: { tam: number }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 64 64" aria-hidden>
      <ellipse cx="32" cy="40" rx="22" ry="18" fill="#5b4636" />
      <ellipse cx="32" cy="46" rx="13" ry="10" fill="#8a6f5a" />
      <circle cx="23" cy="33" r="3" fill="#1c1917" />
      <circle cx="41" cy="33" r="3" fill="#1c1917" />
      <circle cx="24" cy="32" r="1" fill="#fff" />
      <circle cx="42" cy="32" r="1" fill="#fff" />
      <ellipse cx="32" cy="40" rx="5" ry="4" fill="#f9a8d4" />
      <path d="M12 54c-4 1-6 4-5 6h12c0-3-3-6-7-6zM52 54c4 1 6 4 5 6H45c0-3 3-6 7-6z" fill="#f9a8d4" />
      <path d="M22 14c2-5 18-5 20 0l-3 6H25z" fill="#b45309" />
      <rect x="20" y="19" width="24" height="3" rx="1.5" fill="#92400e" />
    </svg>
  );
}

/**
 * Copihue (Lapageria rosea), la flor nacional de Chile: una campana alargada, rojo carmín,
 * de pétalos gruesos y cerosos con pintitas claras, que cuelga de una enredadera.
 */
function Copihue({ tam }: { tam: number }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 64 64" aria-hidden>
      <path d="M4 10C14 4 26 4 31 10c2 3 2 7 1 11" stroke="#3f6212" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M9 9c2-6 12-8 17-5-3 5-11 7-17 5z" fill="#4d7c0f" />
      <path d="M11 8.5c4-1 9-3 13-4" stroke="#65a30d" strokeWidth="0.8" fill="none" />
      <path d="M29 19c1 2 5 2 6 0l-1 4h-4z" fill="#65a30d" />
      <path d="M29 21C24 30 20 42 17 56c4-3 7-4 9-4 2 2 4 5 6 8 2-3 4-6 6-8 2 0 5 1 9 4-3-14-7-26-12-35z" fill="#be123c" />
      <path d="M32 21c3 8 6 20 6 31l-6 8z" fill="#9f1239" opacity="0.55" />
      <path d="M29 22c-3 7-6 18-7 29l2-1c1-10 3-20 5-28z" fill="#fb7185" opacity="0.6" />
      <path d="M32 22v36M28 24l-3 27M36 24l3 27" stroke="#881337" strokeWidth="0.6" opacity="0.5" fill="none" />
      <g fill="#fecdd3">
        <circle cx="27" cy="36" r="0.7" />
        <circle cx="30" cy="44" r="0.7" />
        <circle cx="35" cy="33" r="0.6" />
        <circle cx="37" cy="45" r="0.7" />
        <circle cx="25" cy="47" r="0.6" />
        <circle cx="33" cy="50" r="0.6" />
      </g>
      <path d="M31 56l-1 6M33 56l1 6M32 56v6" stroke="#fef9c3" strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
}

const DIBUJOS: Record<string, (p: { tam: number }) => JSX.Element> = { topo: Topo, copihue: Copihue };

export function IconoPremio({ premio, tam = 40, apagado = false }: { premio: Premio; tam?: number; apagado?: boolean }) {
  const estilo = apagado ? { filter: 'grayscale(1) brightness(0.35)', opacity: 0.55 } : undefined;
  const Dibujo = DIBUJOS[premio.emoji];
  if (Dibujo)
    return (
      <span style={estilo} className="inline-flex">
        <Dibujo tam={tam} />
      </span>
    );
  return (
    <span style={{ ...estilo, fontSize: tam * 0.85, lineHeight: 1 }} className="inline-block" aria-hidden>
      {premio.emoji}
    </span>
  );
}
