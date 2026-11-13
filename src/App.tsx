import { useEffect, useState } from 'react';
import { Encabezado } from './componentes/Encabezado';
import { AvisosLogros } from './componentes/Efectos';
import { infoNivel } from './content';
import { Mapa } from './pantallas/Mapa';
import { PantallaNivel } from './pantallas/PantallaNivel';
import { MiEmpresa } from './pantallas/MiEmpresa';
import { Repaso } from './pantallas/Repaso';
import { Logros } from './pantallas/Logros';
import { Ajustes } from './pantallas/Ajustes';
import { Premios } from './pantallas/Premios';
import { Estadisticas } from './pantallas/Estadisticas';
import { seguirCampos } from './lib/campos';

seguirCampos();

export type Ruta =
  | { pantalla: 'mapa' }
  | { pantalla: 'nivel'; id: string }
  | { pantalla: 'empresa' }
  | { pantalla: 'repaso' }
  | { pantalla: 'logros' }
  | { pantalla: 'ajustes' }
  | { pantalla: 'premios' }
  | { pantalla: 'estadisticas' };

const TITULOS: Record<Exclude<Ruta['pantalla'], 'nivel' | 'mapa'>, string> = {
  empresa: 'Mi empresa',
  repaso: 'Repaso',
  logros: 'Logros',
  ajustes: 'Ajustes',
  premios: 'Camino al cielo',
  estadisticas: 'Mis estadísticas',
};

export default function App() {
  const [ruta, setRuta] = useState<Ruta>({ pantalla: 'mapa' });
  const volver = () => setRuta({ pantalla: 'mapa' });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [ruta]);

  const titulo =
    ruta.pantalla === 'mapa' ? undefined : ruta.pantalla === 'nivel' ? `Nivel ${infoNivel(ruta.id).numero}` : TITULOS[ruta.pantalla];

  return (
    <div className="min-h-dvh">
      <Encabezado titulo={titulo} onVolver={ruta.pantalla === 'mapa' ? undefined : volver} onPremios={() => setRuta({ pantalla: 'premios' })} />
      <AvisosLogros />
      <main className="mx-auto max-w-3xl px-4 py-5">
        {ruta.pantalla === 'mapa' && <Mapa ir={setRuta} />}
        {ruta.pantalla === 'nivel' && (
          <PantallaNivel
            key={ruta.id}
            id={ruta.id}
            onSalir={volver}
            onVerEmpresa={() => setRuta({ pantalla: 'empresa' })}
            onVerPremios={() => setRuta({ pantalla: 'premios' })}
          />
        )}
        {ruta.pantalla === 'empresa' && <MiEmpresa />}
        {ruta.pantalla === 'repaso' && <Repaso onSalir={volver} />}
        {ruta.pantalla === 'logros' && <Logros />}
        {ruta.pantalla === 'ajustes' && <Ajustes />}
        {ruta.pantalla === 'premios' && <Premios />}
        {ruta.pantalla === 'estadisticas' && <Estadisticas />}
      </main>
    </div>
  );
}
