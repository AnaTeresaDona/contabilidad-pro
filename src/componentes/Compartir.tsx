import { useEffect, useState } from 'react';
import { Boton } from './ui';
import { Modal } from './Efectos';
import { compartirNativo, enlacesRedes, imagenCompartir, textoCompartir, type DatosCompartir } from '../lib/compartir';

/** Botón "Compartir mi avance": abre una vista previa con la imagen y las redes. */
export function BotonCompartir({ datos, className = '', variante = 'secundario' }: { datos: DatosCompartir; className?: string; variante?: 'primario' | 'secundario' }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <Boton variante={variante} className={className} onClick={() => setAbierto(true)}>
        📤 Compartir mi avance
      </Boton>
      {abierto && <PanelCompartir datos={datos} onCerrar={() => setAbierto(false)} />}
    </>
  );
}

function PanelCompartir({ datos, onCerrar }: { datos: DatosCompartir; onCerrar: () => void }) {
  const [imagen, setImagen] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [aviso, setAviso] = useState('');
  const nativo = typeof navigator !== 'undefined' && !!navigator.share;
  const clave = JSON.stringify(datos);

  useEffect(() => {
    let vivo = true;
    let u: string | null = null;
    imagenCompartir(datos).then((b) => {
      if (!vivo || !b) return;
      u = URL.createObjectURL(b);
      setImagen(b);
      setUrl(u);
    });
    return () => {
      vivo = false;
      if (u) URL.revokeObjectURL(u);
    };
    // La imagen solo cambia si cambia el contenido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  const compartir = async () => {
    const r = await compartirNativo(datos, imagen);
    if (r === 'no_disponible') setAviso('Tu navegador no tiene el menú de compartir. Usa los botones de abajo.');
    if (r === 'compartido') setAviso('¡Compartido! 🎉');
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(textoCompartir(datos));
      setAviso('Texto copiado. Pégalo donde quieras.');
    } catch {
      setAviso('No se pudo copiar el texto.');
    }
  };

  return (
    <Modal onCerrar={onCerrar}>
      <h2 className="mb-1 text-xl font-extrabold">📤 Compartir mi avance</h2>
      <p className="mb-3 text-sm text-slate-500">Tú eliges dónde y con quién. No se publica nada sin que lo confirmes en la red social.</p>
      {url ? (
        <img src={url} alt={datos.titulo} className="mx-auto mb-3 w-full max-w-xs rounded-2xl shadow" />
      ) : (
        <div className="mx-auto mb-3 flex aspect-square w-full max-w-xs items-center justify-center rounded-2xl bg-indigo-100 text-6xl">{datos.emoji}</div>
      )}
      <div className="grid gap-2">
        {nativo && <Boton onClick={compartir}>📲 Compartir… (Instagram, WhatsApp y más)</Boton>}
        <div className="grid grid-cols-3 gap-2">
          {enlacesRedes(datos).map((r) => (
            <a
              key={r.red}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border-2 border-b-4 border-slate-200 bg-white px-2 py-2 text-center text-xs font-extrabold text-slate-700 hover:bg-slate-50"
            >
              <span className="block text-lg">{r.emoji}</span>
              {r.red}
            </a>
          ))}
          {url && (
            <a
              href={url}
              download="mi-avance-contabilidad-pro.png"
              className="rounded-xl border-2 border-b-4 border-slate-200 bg-white px-2 py-2 text-center text-xs font-extrabold text-slate-700 hover:bg-slate-50"
            >
              <span className="block text-lg">🖼️</span>
              Imagen
            </a>
          )}
        </div>
        <Boton variante="secundario" onClick={copiar}>
          📋 Copiar el texto
        </Boton>
        {aviso && <p className="text-center text-sm font-bold text-emerald-700">{aviso}</p>}
        <p className="text-xs text-slate-400">Para Instagram o TikTok: descarga la imagen y súbela como historia o publicación.</p>
        <Boton variante="fantasma" onClick={onCerrar}>
          Cerrar
        </Boton>
      </div>
    </Modal>
  );
}
