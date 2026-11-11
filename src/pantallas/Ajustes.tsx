import { useRef, useState } from 'react';
import { useProgreso } from '../estado/Progreso';
import { migrar, progresoInicial } from '../engine/progreso';
import trib from '../config/tributario.json';
import { Boton, Tarjeta } from '../componentes/ui';

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
