import { useEffect, useRef, useState } from 'react';
import { useProgreso } from '../estado/Progreso';
import { migrar, progresoInicial } from '../engine/progreso';
import trib from '../config/tributario.json';
import { Boton, Tarjeta } from '../componentes/ui';
import { callar, hablar, lecturaDisponible, reconocimientoDisponible } from '../lib/voz';
import { useHablando } from '../componentes/BarraVoz';

export function Ajustes() {
  const { progreso, actualizar, reemplazar } = useProgreso();
  const [nombre, setNombre] = useState(progreso.empresa.nombre);
  const [mensaje, setMensaje] = useState('');
  const archivo = useRef<HTMLInputElement>(null);

  const exportar = () => {
    const blob = new Blob([JSON.stringify(progreso, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contabilidad-pro-progreso-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMensaje('Respaldo descargado.');
  };

  const importar = async (f: File) => {
    try {
      const datos = migrar(JSON.parse(await f.text()));
      if (window.confirm(`¿Reemplazar tu progreso actual por el del archivo (${datos.xp} XP)?`)) {
        reemplazar(datos);
        setNombre(datos.empresa.nombre);
        setMensaje('Progreso importado.');
      }
    } catch {
      setMensaje('Ese archivo no es un respaldo válido.');
    }
  };

  return (
    <div className="space-y-4">
      <Tarjeta>
        <label className="block">
          <span className="mb-1 block font-extrabold">Nombre de tu empresa</span>
          <div className="flex gap-2">
            <input
              value={nombre}
              maxLength={40}
              onChange={(e) => setNombre(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border-2 border-slate-200 px-3 py-2 font-bold outline-none focus:border-sky-400"
            />
            <Boton
              disabled={!nombre.trim() || nombre === progreso.empresa.nombre}
              onClick={() => {
                actualizar((p) => ({ ...p, empresa: { nombre: nombre.trim() } }));
                setMensaje('Nombre guardado.');
              }}
            >
              Guardar
            </Boton>
          </div>
        </label>
      </Tarjeta>

      <AjustesVoz />
      <Instalar />

      <Tarjeta className="space-y-3">
        <div>
          <p className="font-extrabold">Tu progreso</p>
          <p className="text-sm text-slate-500">
            Se guarda solo en este navegador. Descarga un respaldo para pasarlo a otro dispositivo.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Boton variante="secundario" onClick={exportar}>
            ⬇️ Descargar respaldo
          </Boton>
          <Boton variante="secundario" onClick={() => archivo.current?.click()}>
            ⬆️ Cargar respaldo
          </Boton>
        </div>
        <input
          ref={archivo}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importar(f);
            e.target.value = '';
          }}
        />
        <Boton
          variante="peligro"
          className="w-full"
          onClick={() => {
            if (window.confirm('¿Borrar todo tu progreso? No se puede deshacer.')) {
              reemplazar(progresoInicial());
              setNombre(progresoInicial().empresa.nombre);
              setMensaje('Progreso reiniciado.');
            }
          }}
        >
          Reiniciar progreso
        </Boton>
        {mensaje && <p className="text-center text-sm font-bold text-emerald-600" role="status">{mensaje}</p>}
      </Tarjeta>

      <Tarjeta className="text-sm text-slate-500">
        <p className="font-extrabold text-slate-700">Sobre el contenido</p>
        <p className="mt-1">
          Parámetros tributarios del año tributario {trib.anioTributario} (IVA {trib.tasaIva * 100}%). Contenido educativo: verifica siempre la
          normativa vigente del SII, la CMF y las IFRS antes de aplicarla en la práctica.
        </p>
      </Tarjeta>
    </div>
  );
}

function AjustesVoz() {
  const { progreso, actualizar } = useProgreso();
  const pref = progreso.preferencias;
  const cambiar = (c: Partial<typeof pref>) => actualizar((p) => ({ ...p, preferencias: { ...p.preferencias, ...c } }));
  const leer = lecturaDisponible();
  const oir = reconocimientoDisponible();
  const hablando = useHablando();
  return (
    <Tarjeta className="space-y-3">
      <div>
        <p className="font-extrabold">🔊 Voz</p>
        <p className="text-sm text-slate-500">
          En cada ejercicio tienes «🔊 Escuchar» (tócalo otra vez para silenciar) y «🎤 Responder hablando». Puedes decir la alternativa («la segunda», o parte de su texto), un número
          («un millón doscientos mil»), «Caja al Debe», o comandos como «comprobar», «continuar» y «pista».
        </p>
      </div>
      {leer ? (
        <>
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm font-bold">Leer cada ejercicio automáticamente</span>
            <input type="checkbox" className="h-6 w-6 accent-emerald-500" checked={pref.leerAuto} onChange={(e) => cambiar({ leerAuto: e.target.checked })} />
          </label>
          <label className="block">
            <span className="flex justify-between text-sm font-bold">
              <span>Velocidad de la voz</span>
              <span>{pref.velocidadVoz.toFixed(1).replace('.', ',')}×</span>
            </span>
            <input
              type="range"
              min={0.7}
              max={1.4}
              step={0.1}
              value={pref.velocidadVoz}
              onChange={(e) => cambiar({ velocidadVoz: Number(e.target.value) })}
              className="w-full accent-emerald-500"
            />
          </label>
          <Boton variante="secundario" className="w-full" onClick={() => (hablando ? callar() : hablar('Hola. Soy la Tía Rosa. El IVA es el diecinueve por ciento del neto.', pref.velocidadVoz))}>
            {hablando ? '🔇 Silenciar' : '🔊 Probar la voz'}
          </Boton>
        </>
      ) : (
        <p className="text-sm font-bold text-amber-700">Este navegador no puede leer en voz alta.</p>
      )}
      {!oir && (
        <p className="text-sm font-bold text-amber-700">
          Este navegador no permite responder hablando. En el celular funciona con Chrome (Android) o Safari (iPhone, con Siri activado).
        </p>
      )}
    </Tarjeta>
  );
}

interface EventoInstalar extends Event {
  prompt: () => Promise<void>;
}

function Instalar() {
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const instalada = typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches;
  const iphone = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    const f = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalar);
    };
    window.addEventListener('beforeinstallprompt', f);
    return () => window.removeEventListener('beforeinstallprompt', f);
  }, []);

  return (
    <Tarjeta className="space-y-2">
      <div className="flex items-center gap-3">
        <img src="/icono.svg" alt="" className="h-12 w-12" />
        <div>
          <p className="font-extrabold">📲 El juego en tu celular</p>
          <p className="text-sm text-slate-500">Agrégalo a tu pantalla de inicio: se abre como una app, con su ícono de empanada.</p>
        </div>
      </div>
      {instalada ? (
        <p className="text-sm font-bold text-emerald-700">✓ Ya lo estás usando como app.</p>
      ) : evento ? (
        <Boton className="w-full" onClick={() => evento.prompt().then(() => setEvento(null))}>
          Instalar Contabilidad Pro
        </Boton>
      ) : iphone ? (
        <p className="text-sm">
          En Safari, toca <b>Compartir</b> (el cuadrado con la flecha) y luego <b>«Agregar a inicio»</b>.
        </p>
      ) : (
        <p className="text-sm">
          En Chrome, abre el menú <b>⋮</b> y elige <b>«Agregar a la pantalla principal»</b> o <b>«Instalar app»</b>.
        </p>
      )}
    </Tarjeta>
  );
}
