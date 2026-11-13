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

export function IconoPremio({ premio, tam = 40, apagado = false }: { premio: Premio; tam?: number; apagado?: boolean }) {
  const estilo = apagado ? { filter: 'grayscale(1) brightness(0.35)', opacity: 0.55 } : undefined;
  if (premio.emoji === 'topo')
    return (
      <span style={estilo} className="inline-flex">
        <Topo tam={tam} />
      </span>
    );
  return (
    <span style={{ ...estilo, fontSize: tam * 0.85, lineHeight: 1 }} className="inline-block" aria-hidden>
      {premio.emoji}
    </span>
  );
}
