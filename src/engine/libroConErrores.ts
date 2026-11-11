import type { LineaAsiento } from './types';
import { cuenta, opuesto, PARES_CONFUSOS } from './cuentas';
import { elegir, elegirVarios, type Rng } from './azar';
import { calcularIva, formatoCLP } from './dinero';
import { generarTransaccion, type Plantilla, type Transaccion } from './plantillas';
import { explicarLado } from './asientos';

export interface EntradaLibro {
  trans: Transaccion;
  mostrado: LineaAsiento[];
  corrupto: boolean;
  tipoError?: string;
  explicacion?: string;
}

type Corrupcion = 'invertido' | 'confundida' | 'iva';

function corromper(t: Transaccion, rng: Rng): Omit<EntradaLibro, 'trans' | 'corrupto'> {
  const lineas = t.asiento.lineas;
  const confundibles = lineas.filter((l) => {
    const par = PARES_CONFUSOS[l.cuentaId];
    return par && !lineas.some((x) => x.cuentaId === par);
  });
  const opciones: Corrupcion[] = ['invertido'];
  if (confundibles.length) opciones.push('confundida', 'confundida');
  if (t.conIva) opciones.push('iva', 'iva');

  switch (elegir(rng, opciones)) {
    case 'confundida': {
      const original = elegir(rng, confundibles);
      const par = PARES_CONFUSOS[original.cuentaId];
      const c = cuenta(original.cuentaId);
      return {
        mostrado: lineas.map((l) => (l === original ? { ...l, cuentaId: par } : l)),
        tipoError: 'cuenta_confundida',
        explicacion: `Se usó ${cuenta(par).nombre} en vez de ${c.nombre}. ${c.nombre}: ${c.descripcion} El asiento cuadra, pero la cuenta es otra: por eso es un error difícil de ver.`,
      };
    }
    case 'iva': {
      const v = t.valores;
      const ivaMalo = calcularIva(v.total);
      return {
        mostrado: lineas.map((l) =>
          l.monto === v.iva && (l.cuentaId === 'iva_cf' || l.cuentaId === 'iva_df') ? { ...l, monto: ivaMalo } : l,
        ),
        tipoError: 'iva_mal_aplicado',
        explicacion: `El IVA se calculó sobre el total (${formatoCLP(v.total)}) en vez del neto (${formatoCLP(v.neto)}): quedó ${formatoCLP(ivaMalo)} cuando debía ser ${formatoCLP(v.iva)}. Por eso el asiento no cuadra.`,
      };
    }
    default: {
      const primera = cuenta(lineas[0].cuentaId);
      return {
        mostrado: lineas.map((l) => ({ ...l, lado: opuesto(l.lado) })),
        tipoError: 'lado_invertido',
        explicacion: `Todo el asiento está al revés (Debe y Haber cambiados). Cuadra, pero dice lo contrario de lo que pasó. Por ejemplo: ${explicarLado(primera, lineas[0].lado)}`,
      };
    }
  }
}

/** Genera un libro diario de `n` asientos donde exactamente `nErrores` tienen errores. */
export function generarLibroConErrores(rng: Rng, plantillas: Plantilla[], n = 5, nErrores = 2): EntradaLibro[] {
  const trans = elegirVarios(rng, plantillas, n).map((p) => generarTransaccion(p, rng));
  const conError = new Set(elegirVarios(rng, [...Array(n).keys()], nErrores));
  return trans.map((t, i) =>
    conError.has(i) ? { trans: t, corrupto: true, ...corromper(t, rng) } : { trans: t, mostrado: t.asiento.lineas, corrupto: false },
  );
}
