import { useMemo, useState } from 'react';
import { useProgreso } from '../estado/Progreso';
import { cuenta, ETIQUETA_TIPO, ladoAumento } from '../engine/cuentas';
import { formatoCLP } from '../engine/dinero';
import type { Lado, TipoCuenta } from '../engine/types';
import { AsientoVista } from '../componentes/AsientoVista';
import { CuentaTVista } from '../componentes/CuentaTVista';
import { Opcion, Tarjeta } from '../componentes/ui';
import { PestanasBalance, TablaBalance } from '../componentes/TablaBalance';
import { construirBalance } from '../engine/balance8';
import { construirBG, construirEERR } from '../engine/estados';
import { BalanceGeneralVista, EstadoResultadosVista, seccionesConResultado } from '../componentes/EstadosVista';

interface Mayor {
  cuentaId: string;
  debe: number;
  haber: number;
}

export function MiEmpresa() {
  const { progreso } = useProgreso();
  const [vista, setVista] = useState<'diario' | 'mayor' | 'balance' | 'estados'>('diario');
  const balance = useMemo(() => construirBalance(progreso.libro), [progreso.libro]);

  const mayor = useMemo(() => {
    const m = new Map<string, Mayor>();
    for (const a of progreso.libro)
      for (const l of a.lineas) {
        const x = m.get(l.cuentaId) ?? { cuentaId: l.cuentaId, debe: 0, haber: 0 };
        x[l.lado] += l.monto;
        m.set(l.cuentaId, x);
      }
    return [...m.values()];
  }, [progreso.libro]);

  const saldoPorTipo = (tipo: TipoCuenta) =>
    mayor
      .filter((x) => cuenta(x.cuentaId).tipo === tipo)
      .reduce((s, x) => s + (ladoAumento(tipo) === 'debe' ? x.debe - x.haber : x.haber - x.debe), 0);
  const activo = saldoPorTipo('activo');
  const pasivo = saldoPorTipo('pasivo');
  const patrimonio = saldoPorTipo('patrimonio');
  const resultado = saldoPorTipo('ingreso') - saldoPorTipo('gasto');

  if (progreso.libro.length === 0) {
    return (
      <Tarjeta className="text-center">
        <p className="text-5xl">📒</p>
        <p className="mt-2 font-extrabold">El libro de tu empresa está vacío</p>
        <p className="text-sm text-slate-500">Cada asiento que registres bien en la práctica queda guardado aquí.</p>
      </Tarjeta>
    );
  }

  return (
    <div className="space-y-5">
      <section>
        <h2 className="mb-2 font-extrabold">Ecuación contable de {progreso.empresa.nombre}</h2>
        <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
          <Cifra etiqueta="Activo" valor={activo} />
          <Cifra etiqueta="Pasivo" valor={pasivo} />
          <Cifra etiqueta="Patrimonio" valor={patrimonio} />
          <Cifra etiqueta="Resultado" valor={resultado} />
        </div>
        <p className={`mt-2 rounded-xl p-2 text-center text-sm font-bold ${activo === pasivo + patrimonio + resultado ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
          Activo {formatoCLP(activo)} = Pasivo + Patrimonio + Resultado {formatoCLP(pasivo + patrimonio + resultado)}{' '}
          {activo === pasivo + patrimonio + resultado ? '⚖️' : '⚠️'}
        </p>
      </section>

      <div className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-4">
        <Opcion activa={vista === 'diario'} onClick={() => setVista('diario')}>
          Diario
        </Opcion>
        <Opcion activa={vista === 'mayor'} onClick={() => setVista('mayor')}>
          Mayor
        </Opcion>
        <Opcion activa={vista === 'balance'} onClick={() => setVista('balance')}>
          8 columnas
        </Opcion>
        <Opcion activa={vista === 'estados'} onClick={() => setVista('estados')}>
          Estados
        </Opcion>
      </div>

      {vista === 'estados' ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">Estados financieros armados con todos los asientos de tu empresa.</p>
          <EstadoResultadosVista e={construirEERR(balance.filas)} titulo={`Estado de Resultados · ${progreso.empresa.nombre}`} />
          {(() => {
            const bg = construirBG(balance.filas);
            return <BalanceGeneralVista secciones={seccionesConResultado(bg.secciones, bg.resultado)} titulo={`Balance General · ${progreso.empresa.nombre}`} />;
          })()}
        </div>
      ) : vista === 'balance' ? (
        <div className="space-y-2">
          <p className="text-sm text-slate-500">
            Balance de 8 columnas con todos los asientos de tu empresa. Resultado del período:{' '}
            <b>
              {balance.resultado.tipo === 'utilidad' ? 'utilidad' : 'pérdida'} de {formatoCLP(balance.resultado.monto)}
            </b>
            .
          </p>
          <div className="sm:hidden">
            <PestanasBalance filas={balance.filas} resultado={balance.resultado} />
          </div>
          <div className="hidden sm:block">
            <TablaBalance filas={balance.filas} resultado={balance.resultado} />
          </div>
        </div>
      ) : vista === 'diario' ? (
        <div className="space-y-3">
          {[...progreso.libro]
            .reverse()
            .slice(0, 40)
            .map((a, i) => (
              <Tarjeta key={a.id} className="p-3">
                <p className="text-xs font-extrabold uppercase text-slate-400">
                  Asiento N°{progreso.libro.length - i} {a.fecha && `· ${a.fecha}`}
                </p>
                <p className="mb-2 text-sm">{a.glosa}</p>
                <AsientoVista lineas={a.lineas} />
              </Tarjeta>
            ))}
          {progreso.libro.length > 40 && <p className="text-center text-sm text-slate-400">Se muestran los últimos 40 asientos.</p>}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {mayor.map((x) => {
            const c = cuenta(x.cuentaId);
            const lados: { lado: Lado; monto: number }[] = [
              { lado: 'debe', monto: x.debe },
              { lado: 'haber', monto: x.haber },
            ].filter((m) => m.monto > 0) as { lado: Lado; monto: number }[];
            const saldo = Math.abs(x.debe - x.haber);
            return (
              <Tarjeta key={x.cuentaId} className="p-3">
                <p className="mb-1 text-[11px] font-extrabold uppercase text-slate-400">{ETIQUETA_TIPO[c.tipo]}</p>
                <CuentaTVista titulo={c.nombre} movimientos={lados} />
                <p className="mt-2 text-center text-sm font-extrabold">
                  Saldo {x.debe >= x.haber ? 'deudor' : 'acreedor'}: {formatoCLP(saldo)}
                </p>
              </Tarjeta>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Cifra({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-white p-2">
      <p className="text-xs font-bold text-slate-400">{etiqueta}</p>
      <p className="font-extrabold tabular-nums">{formatoCLP(valor)}</p>
    </div>
  );
}
