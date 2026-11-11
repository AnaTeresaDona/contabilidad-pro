import type { Cuenta, ErrorDetectado, Lado, LineaAsiento, ResultadoValidacion } from './types';
import { cuenta, ETIQUETA_LADO, ETIQUETA_TIPO, ladoAumento, opuesto, PARES_CONFUSOS } from './cuentas';
import { formatoCLP } from './dinero';

export function sumas(lineas: LineaAsiento[]): { debe: number; haber: number } {
  let debe = 0;
  let haber = 0;
  for (const l of lineas) {
    if (l.lado === 'debe') debe += l.monto;
    else haber += l.monto;
  }
  return { debe, haber };
}

export function cuadra(lineas: LineaAsiento[]): boolean {
  const s = sumas(lineas);
  return s.debe > 0 && s.debe === s.haber;
}

/** Explica por qué una cuenta va a un lado, según si aumenta o disminuye. */
export function explicarLado(c: Cuenta, ladoCorrecto: Lado): string {
  const verbo = ladoAumento(c.tipo) === ladoCorrecto ? 'aumenta' : 'disminuye';
  const tipo = ETIQUETA_TIPO[c.tipo];
  return `${c.nombre} (${tipo}) ${verbo} en esta operación, y las cuentas de ${tipo} ${verbo}n por el ${ETIQUETA_LADO[ladoCorrecto]}.`;
}

function agrupar(lineas: LineaAsiento[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const l of lineas) {
    const clave = `${l.cuentaId}|${l.lado}`;
    m.set(clave, (m.get(clave) ?? 0) + l.monto);
  }
  return m;
}

/**
 * Compara el asiento del jugador con el correcto y devuelve cada error encontrado,
 * clasificado según content/errores.json.
 */
export function compararAsiento(
  esperado: LineaAsiento[],
  respuesta: LineaAsiento[],
  valores?: Record<string, number>,
): ResultadoValidacion {
  const errores: ErrorDetectado[] = [];
  const validas = respuesta.filter((l) => l.cuentaId && l.monto > 0);
  if (validas.length === 0) {
    return { correcto: false, errores: [{ tipo: 'asiento_vacio', detalle: 'No registraste ninguna línea con cuenta y monto.' }] };
  }

  const esp = agrupar(esperado);
  const resp = agrupar(validas);
  const cuentasEsp = new Set(esperado.map((l) => l.cuentaId));
  const cuentasResp = new Set(validas.map((l) => l.cuentaId));

  for (const [clave, monto] of esp) {
    const [cid, lado] = clave.split('|') as [string, Lado];
    const c = cuenta(cid);
    const montoResp = resp.get(clave);
    if (montoResp !== undefined) {
      if (montoResp !== monto) {
        const relacionadoIva =
          valores?.iva !== undefined && [valores.neto, valores.total, valores.iva].includes(montoResp);
        errores.push(
          relacionadoIva
            ? {
                tipo: 'iva_mal_aplicado',
                detalle: `En ${c.nombre} pusiste ${formatoCLP(montoResp)}, pero corresponde ${formatoCLP(monto)}. Recuerda: neto ${formatoCLP(valores!.neto)} + IVA ${formatoCLP(valores!.iva)} = total ${formatoCLP(valores!.total)}.`,
              }
            : { tipo: 'monto_incorrecto', detalle: `En ${c.nombre} pusiste ${formatoCLP(montoResp)}, pero corresponde ${formatoCLP(monto)}.` },
        );
      }
    } else if (resp.has(`${cid}|${opuesto(lado)}`)) {
      errores.push({ tipo: 'lado_invertido', detalle: `Pusiste ${c.nombre} al ${ETIQUETA_LADO[opuesto(lado)]}. ${explicarLado(c, lado)}` });
    } else {
      const par = PARES_CONFUSOS[cid];
      if (par && cuentasResp.has(par) && !cuentasEsp.has(par)) {
        errores.push({
          tipo: 'cuenta_confundida',
          detalle: `Usaste ${cuenta(par).nombre} donde correspondía ${c.nombre}. ${c.nombre}: ${c.descripcion} ${cuenta(par).nombre}: ${cuenta(par).descripcion}`,
        });
      } else {
        errores.push({ tipo: 'falta_cuenta', detalle: `Falta ${c.nombre} al ${ETIQUETA_LADO[lado]} por ${formatoCLP(monto)}. ${c.descripcion}` });
      }
    }
  }

  const reportadas = new Set<string>();
  for (const clave of resp.keys()) {
    const cid = clave.split('|')[0];
    if (cuentasEsp.has(cid) || reportadas.has(cid)) continue;
    reportadas.add(cid);
    const par = PARES_CONFUSOS[cid];
    if (par && cuentasEsp.has(par) && !cuentasResp.has(par)) continue; // ya se explicó como cuenta confundida
    const c = cuenta(cid);
    errores.push({ tipo: 'cuenta_incorrecta', detalle: `${c.nombre} no participa en esta operación. ${c.nombre}: ${c.descripcion}` });
  }

  // El descuadre va al final: suele ser consecuencia de los errores anteriores, que explican mejor la causa.
  const s = sumas(validas);
  if (s.debe !== s.haber) {
    errores.push({
      tipo: 'descuadre',
      detalle: `Tu Debe suma ${formatoCLP(s.debe)} y tu Haber suma ${formatoCLP(s.haber)}: hay una diferencia de ${formatoCLP(Math.abs(s.debe - s.haber))}.`,
    });
  }

  return { correcto: errores.length === 0, errores };
}
