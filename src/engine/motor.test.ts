import { describe, expect, it } from 'vitest';
import { crearRng } from './azar';
import { calcularIva, formatoCLP, leerMonto, leerMontoConSigno } from './dinero';
import { compararAsiento, cuadra } from './asientos';
import { evaluar, generarTransaccion } from './plantillas';
import { generarCuentaT, sumasT, validarCuentaT } from './cuentaT';
import { generarLibroConErrores } from './libroConErrores';
import { existeCuenta } from './cuentas';
import { infoError, tiposDeError } from './errores';
import { danioPorErrores, xpPorAcierto } from './recompensas';
import { migrar, nivelDesbloqueado, progresoInicial, registrarActividad, actualizarNivel } from './progreso';
import { CONTENIDO, ORDEN_NIVELES } from '../content';
import type { LineaAsiento } from './types';
import { celdas8, celdasResultado, columnaNatural, cuadraturas, generarMes, naturalezaNormal, sumarCeldas, validarBalance } from './balance8';
import { ejMayorizar, mesConActivoFijo } from './ejercicios';
import { calculoDepreciacion, calculoReexpresion, generarAjustesCierre } from './ajustes';
import { validarCalculo } from './calculos';
import { calculoF22, calculoRLI, generarOperacionRenta, TASA_PRIMERA_CATEGORIA, totalPorTipo, validarOperacionRenta } from './tributario';
import { PARTIDAS } from '../content/nivel5';
import trib from '../config/tributario.json';
import { calculoArrendamiento, calculoDeterioro, calculoDividendoMinimo, calculoGananciaPorAccion, valorPresente } from './ifrs';
import { CUENTAS_BASICAS, ladoAumentoCuenta } from './cuentas';
import { construirBG, construirEERR, SECCIONES_BG, seccionDe, validarBG, validarEERR, type SeccionBG } from './estados';

const plantillasN1 = CONTENIDO.n1.plantillas;

describe('dinero', () => {
  it('formatea en pesos chilenos', () => {
    expect(formatoCLP(1234567)).toBe('$1.234.567');
    expect(formatoCLP(0)).toBe('$0');
    expect(formatoCLP(-5000)).toBe('-$5.000');
  });
  it('lee montos escritos por el usuario', () => {
    expect(leerMonto('$1.234.567')).toBe(1234567);
    expect(leerMonto('')).toBeNull();
  });
  it('calcula IVA 19% redondeado', () => {
    expect(calcularIva(100000)).toBe(19000);
    expect(calcularIva(12345)).toBe(2346);
  });
});

const todasLasPlantillas = [...new Map(Object.values(CONTENIDO).flatMap((c) => c.plantillas.map((p) => [p.id, p] as const))).values()];

describe('plantillas de todos los niveles', () => {
  it('todas usan cuentas que existen', () => {
    for (const p of todasLasPlantillas) for (const l of p.lineas) expect(existeCuenta(l.cuenta), `${p.id}: ${l.cuenta}`).toBe(true);
  });
  it('generan asientos cuadrados y con montos positivos en 300 semillas', () => {
    for (let s = 1; s <= 300; s++) {
      const rng = crearRng(s);
      for (const p of todasLasPlantillas) {
        const t = generarTransaccion(p, rng);
        expect(cuadra(t.asiento.lineas), `${p.id} semilla ${s}`).toBe(true);
        for (const l of t.asiento.lineas) expect(l.monto, `${p.id}`).toBeGreaterThan(0);
        expect(t.texto).not.toMatch(/\{\w+\}/);
      }
    }
  });
  it('evalúa sumas y restas', () => {
    expect(evaluar('total - contado', { total: 100, contado: 30 })).toBe(70);
  });
});

describe('compararAsiento', () => {
  const p = plantillasN1.find((x) => x.id === 'compra_merc_contado')!;
  const t = generarTransaccion(p, crearRng(7));
  const esperado = t.asiento.lineas;

  it('acepta la respuesta correcta en cualquier orden', () => {
    expect(compararAsiento(esperado, [...esperado].reverse(), t.valores).correcto).toBe(true);
  });
  it('detecta un lado invertido', () => {
    const r = compararAsiento(esperado, esperado.map((l) => (l.cuentaId === 'banco' ? { ...l, lado: 'debe' as const } : l)), t.valores);
    expect(r.errores.map((e) => e.tipo)).toEqual(expect.arrayContaining(['lado_invertido', 'descuadre']));
  });
  it('detecta IVA Débito usado en una compra', () => {
    const r = compararAsiento(esperado, esperado.map((l) => (l.cuentaId === 'iva_cf' ? { ...l, cuentaId: 'iva_df' } : l)), t.valores);
    expect(r.errores.map((e) => e.tipo)).toEqual(['cuenta_confundida']);
  });
  it('detecta el IVA olvidado (neto en vez de total)', () => {
    const resp: LineaAsiento[] = [
      { cuentaId: 'mercaderias', lado: 'debe', monto: t.valores.neto },
      { cuentaId: 'banco', lado: 'haber', monto: t.valores.neto },
    ];
    const tipos = compararAsiento(esperado, resp, t.valores).errores.map((e) => e.tipo);
    expect(tipos).toEqual(expect.arrayContaining(['falta_cuenta', 'iva_mal_aplicado']));
  });
  it('detecta una cuenta que sobra', () => {
    const r = compararAsiento(esperado, [...esperado, { cuentaId: 'publicidad', lado: 'debe', monto: 1000 }, { cuentaId: 'caja', lado: 'haber', monto: 1000 }], t.valores);
    expect(r.errores.filter((e) => e.tipo === 'cuenta_incorrecta')).toHaveLength(2);
  });
  it('rechaza un asiento vacío', () => {
    expect(compararAsiento(esperado, []).errores[0].tipo).toBe('asiento_vacio');
  });
});

describe('cuenta T', () => {
  it('el saldo generado coincide con los movimientos y nunca es negativo', () => {
    for (let s = 1; s <= 200; s++) {
      const ej = generarCuentaT(crearRng(s));
      const { debe, haber } = sumasT(ej.movimientos);
      expect(Math.abs(debe - haber)).toBe(ej.saldo);
      expect(ej.saldo).toBeGreaterThan(0);
      expect(debe > 0 && haber > 0).toBe(true);
      expect(validarCuentaT(ej, ej.saldo, ej.naturaleza).correcto).toBe(true);
    }
  });
  it('detecta saldo y naturaleza incorrectos', () => {
    const ej = generarCuentaT(crearRng(3));
    const otra = ej.naturaleza === 'deudor' ? 'acreedor' : 'deudor';
    expect(validarCuentaT(ej, ej.saldo + 1, otra).errores.map((e) => e.tipo)).toEqual(['saldo_incorrecto', 'naturaleza_saldo']);
  });
});

describe('libro con errores (jefe)', () => {
  it('tiene exactamente 2 asientos corruptos y estos difieren del correcto', () => {
    for (let s = 1; s <= 200; s++) {
      const libro = generarLibroConErrores(crearRng(s), plantillasN1);
      expect(libro).toHaveLength(5);
      const corruptos = libro.filter((e) => e.corrupto);
      expect(corruptos).toHaveLength(2);
      for (const e of corruptos) {
        expect(compararAsiento(e.trans.asiento.lineas, e.mostrado, e.trans.valores).correcto).toBe(false);
        expect(e.explicacion).toBeTruthy();
      }
    }
  });
});

describe('IVA incluido (boletas)', () => {
  it('separa neto e IVA desde el total', () => {
    const p = todasLasPlantillas.find((x) => x.id === 'boleta_ventas_dia')!;
    for (let s = 1; s <= 100; s++) {
      const v = generarTransaccion(p, crearRng(s)).valores;
      expect(v.neto + v.iva).toBe(v.total);
      expect(Math.abs(v.iva - calcularIva(v.neto))).toBeLessThanOrEqual(1);
    }
  });
});

describe('Balance de 8 columnas', () => {
  const plantillasN2 = CONTENIDO.n2.plantillas;

  it('genera meses coherentes y todas las parejas de columnas cuadran', () => {
    for (let s = 1; s <= 200; s++) {
      const { asientos, balance } = generarMes(crearRng(s), plantillasN2, 4);
      expect(asientos.length).toBe(7);
      const filas = balance.filas.map(celdas8);
      const totales = sumarCeldas([...filas, celdasResultado(balance.resultado)]);
      expect(cuadraturas(totales), `semilla ${s}`).toEqual([true, true, true, true]);
      for (const f of balance.filas) expect(f.naturaleza).toBe(naturalezaNormal(f.cuentaId));
    }
  });

  it('acepta la respuesta correcta y detecta errores de saldo, columna y resultado', () => {
    const { balance } = generarMes(crearRng(5), plantillasN2, 4);
    const correcta = balance.filas.map((f) => ({ cuentaId: f.cuentaId, saldo: f.saldo, naturaleza: f.naturaleza, destino: f.destino }));
    expect(validarBalance(balance, correcta, balance.resultado).correcto).toBe(true);

    const mala = correcta.map((r, i) => (i === 0 ? { ...r, saldo: r.saldo + 1, destino: 'resultados' as const } : r));
    const otro = { tipo: balance.resultado.tipo, monto: balance.resultado.monto + 1000 };
    expect(validarBalance(balance, mala, otro).errores.map((e) => e.tipo)).toEqual(['saldo_incorrecto', 'destino_balance', 'resultado_ejercicio']);
  });

  it('el capital va a la columna Pasivo y los gastos a Pérdidas', () => {
    expect(columnaNatural('capital')).toBe('pasivo');
    expect(columnaNatural('costo_ventas')).toBe('perdida');
    expect(columnaNatural('ventas')).toBe('ganancia');
    expect(columnaNatural('banco')).toBe('activo');
  });

  it('mayorizar elige una cuenta con movimientos en ambos lados', () => {
    for (let s = 1; s <= 100; s++) {
      const ej = ejMayorizar(crearRng(s), plantillasN2);
      if (ej.tipo !== 'mayorizar') throw new Error();
      const { debe, haber } = sumasT(ej.datos.datos.movimientos);
      expect(Math.abs(debe - haber)).toBe(ej.datos.datos.saldo);
    }
  });

  it('cada nivel genera su práctica y su jefe sin errores', () => {
    for (const c of Object.values(CONTENIDO))
      for (let s = 1; s <= 50; s++) {
        expect(c.generarPractica(crearRng(s)).length).toBeGreaterThan(0);
        expect(c.generarJefe(crearRng(s))).toBeTruthy();
      }
  });
});

describe('Estados financieros', () => {
  const plantillasN3 = CONTENIDO.n3.plantillas;

  it('el resultado del Estado de Resultados coincide con el del Balance de 8 columnas y el Balance General cuadra', () => {
    for (let s = 1; s <= 200; s++) {
      const { balance } = mesConActivoFijo(crearRng(s), plantillasN3, 4);
      const e = construirEERR(balance.filas);
      const signo = balance.resultado.tipo === 'utilidad' ? 1 : -1;
      expect(e.resultadoAntesImpuesto, `semilla ${s}`).toBe(signo * balance.resultado.monto);
      const bg = construirBG(balance.filas);
      expect(bg.totales.totalActivos, `semilla ${s}`).toBe(bg.totales.totalPasivoPatrimonio);
      expect(bg.secciones.activo_no_corriente.length).toBeGreaterThan(0);
    }
  });

  it('valida subtotales y secciones', () => {
    const { balance } = mesConActivoFijo(crearRng(9), plantillasN3, 4);
    const e = construirEERR(balance.filas);
    expect(validarEERR(e, { margenBruto: e.margenBruto, resultadoOperacional: e.resultadoOperacional, resultadoAntesImpuesto: e.resultadoAntesImpuesto }).correcto).toBe(true);
    expect(validarEERR(e, { margenBruto: e.margenBruto + 1, resultadoOperacional: null, resultadoAntesImpuesto: e.resultadoAntesImpuesto }).errores).toHaveLength(2);

    const bg = construirBG(balance.filas);
    const resp: Record<string, SeccionBG | null> = { resultado: 'patrimonio' };
    for (const s of SECCIONES_BG) for (const l of bg.secciones[s]) resp[l.cuentaId] = s;
    expect(validarBG(bg, resp).correcto).toBe(true);
    const fijo = bg.secciones.activo_no_corriente[0].cuentaId;
    expect(validarBG(bg, { ...resp, [fijo]: 'activo_corriente', resultado: 'pasivo_corriente' }).errores).toHaveLength(2);
  });

  it('clasifica secciones según tipo y grupo', () => {
    expect(seccionDe('maquinarias')).toBe('activo_no_corriente');
    expect(seccionDe('iva_cf')).toBe('activo_corriente');
    expect(seccionDe('prestamo_bancario')).toBe('pasivo_no_corriente');
    expect(seccionDe('capital')).toBe('patrimonio');
    expect(seccionDe('intereses')).toBe('resultados');
  });
});

describe('Ajustes de cierre (Nivel 4A)', () => {
  it('evalúa fórmulas con multiplicación, división y paréntesis', () => {
    expect(evaluar('(costo - residual) / (vida * 12)', { costo: 6_000_000, residual: 600_000, vida: 6 })).toBe(75_000);
    expect(evaluar('saldo * pct / 100', { saldo: 2_000_000, pct: 10 })).toBe(200_000);
    expect(() => evaluar('costo +', { costo: 1 })).toThrow();
  });

  it('muestra números y porcentajes sin signo peso', () => {
    const p = CONTENIDO.n4a.plantillas.find((x) => x.id === 'ajuste_deterioro_clientes')!;
    const t = generarTransaccion(p, crearRng(3));
    expect(t.texto).toMatch(new RegExp(`el ${t.valores.pct}% no se cobrará`));
  });

  it('las cuentas complementarias aumentan por el lado contrario de su tipo', () => {
    expect(ladoAumentoCuenta('dep_acumulada')).toBe('haber');
    expect(ladoAumentoCuenta('estimacion_incobrables')).toBe('haber');
    expect(CUENTAS_BASICAS.some((c) => c.avanzada)).toBe(false);
  });

  it('la depreciación calculada coincide con la fórmula y se valida', () => {
    for (let s = 1; s <= 100; s++) {
      const ej = calculoDepreciacion(crearRng(s));
      const resp = Object.fromEntries(ej.preguntas.map((p) => [p.id, p.valor]));
      expect(validarCalculo(ej, resp).correcto).toBe(true);
      expect(validarCalculo(ej, { ...resp, anual: resp.anual + 1 }).errores).toHaveLength(1);
      expect(resp.libro).toBeGreaterThan(0);
    }
  });

  it('la reexpresión mantiene Activo = Pasivo + Patrimonio después de ajustar', () => {
    for (let s = 1; s <= 100; s++) {
      const rng = crearRng(s);
      const ej = calculoReexpresion(rng, CONTENIDO.n3.plantillas);
      const v = Object.fromEntries(ej.preguntas.map((p) => [p.id, p.valor]));
      const dato = (txt: string) => leerMontoConSigno(ej.datos.find((d) => d.etiqueta.startsWith(txt))!.valor)!;
      const patrimonioSinResultado = dato('Total activos') - dato('Total pasivos') - dato('Resultado');
      expect(v.activos).toBe(v.pasivos + patrimonioSinResultado + v.resultado);
    }
  });

  it('el jefe calcula el resultado ajustado restando los gastos de los ajustes', () => {
    for (let s = 1; s <= 100; s++) {
      const d = generarAjustesCierre(crearRng(s), CONTENIDO.n3.plantillas, CONTENIDO.n4a.plantillas, 3);
      const gastos = d.ajustes.flatMap((t) => t.asiento.lineas).filter((l) => l.lado === 'debe').reduce((a, l) => a + l.monto, 0);
      expect(d.resultadoAjustado).toBe(d.resultadoPrevio - gastos);
    }
  });
});

describe('NIIF plenas y CMF (Nivel 4B)', () => {
  it('evalúa potencias y el valor presente de un arriendo', () => {
    expect(evaluar('2 ^ 3 ^ 2', {})).toBe(512);
    expect(evaluar('(1 + i) ^ (0 - n)', { i: 1, n: 2 })).toBe(0.25);
    expect(Math.round(valorPresente(1_000_000, 12, 0.01))).toBe(11_255_077);
  });

  it('los cálculos NIIF se validan con sus propias respuestas', () => {
    for (const gen of [calculoArrendamiento, calculoDeterioro, calculoGananciaPorAccion, calculoDividendoMinimo])
      for (let s = 1; s <= 60; s++) {
        const ej = gen(crearRng(s));
        const resp = Object.fromEntries(ej.preguntas.map((p) => [p.id, p.valor]));
        expect(validarCalculo(ej, resp).correcto, `${ej.titulo} semilla ${s}`).toBe(true);
      }
  });

  it('el pasivo inicial del arriendo es la cuota por el factor mostrado', () => {
    const ej = calculoArrendamiento(crearRng(4));
    const cuota = leerMonto(ej.datos[0].valor)!;
    const factor = Number(ej.datos[3].valor.replace(',', '.'));
    expect(ej.preguntas[0].valor).toBe(Math.round(cuota * factor));
  });

  it('el deterioro nunca es negativo y usa el mayor valor recuperable', () => {
    for (let s = 1; s <= 100; s++) {
      const ej = calculoDeterioro(crearRng(s));
      const [libro, vrcv, vu] = ej.datos.map((d) => leerMonto(d.valor)!);
      const recuperable = ej.preguntas[0].valor;
      expect(recuperable).toBe(Math.max(vrcv, vu));
      expect(ej.preguntas[1].valor).toBe(Math.max(0, libro - recuperable));
    }
  });

  it('la ganancia por acción acepta 2 decimales de tolerancia', () => {
    const ej = calculoGananciaPorAccion(crearRng(8));
    const gpa = ej.preguntas[1].valor;
    const base = { promedio: ej.preguntas[0].valor };
    expect(validarCalculo(ej, { ...base, gpa: gpa + 0.004 }).correcto).toBe(true);
    expect(validarCalculo(ej, { ...base, gpa: gpa + 0.02 }).correcto).toBe(false);
  });

  it('la fiscalización trae 3 infracciones y 3 situaciones correctas', () => {
    const banco = CONTENIDO.n4b;
    for (let s = 1; s <= 50; s++) {
      const ej = banco.generarJefe(crearRng(s));
      if (ej.tipo !== 'fiscalizacion') throw new Error('tipo inesperado');
      expect(ej.afirmaciones).toHaveLength(6);
      expect(ej.afirmaciones.filter((a) => a.infraccion)).toHaveLength(3);
    }
  });
});

describe('Tributación y Operación Renta (Nivel 5)', () => {
  const partidas = PARTIDAS;

  it('la RLI es el resultado más agregados menos deducciones, y el saldo descuenta los PPM', () => {
    for (let s = 1; s <= 100; s++) {
      const d = generarOperacionRenta(crearRng(s), partidas, { agregados: 3, deducciones: 2, sinAjuste: 1 });
      expect(d.partidas).toHaveLength(6);
      expect(d.rli).toBe(d.resultadoContable + totalPorTipo(d.partidas, 'agregado') - totalPorTipo(d.partidas, 'deduccion'));
      expect(d.rli).toBeGreaterThan(0);
      expect(d.impuesto).toBe(Math.round(d.rli * TASA_PRIMERA_CATEGORIA));
      expect(d.saldo).toBe(d.impuesto - d.ppm);
      const resp = Object.fromEntries(d.partidas.map((p) => [p.id, p.tipo]));
      expect(validarOperacionRenta(d, { clasificacion: resp, rli: d.rli, impuesto: d.impuesto, saldo: d.saldo }).correcto).toBe(true);
    }
  });

  it('detecta partidas mal clasificadas y cálculos errados', () => {
    const d = generarOperacionRenta(crearRng(2), partidas, { agregados: 3, deducciones: 2, sinAjuste: 1 });
    const resp = Object.fromEntries(d.partidas.map((p) => [p.id, p.tipo]));
    const agregado = d.partidas.find((p) => p.tipo === 'agregado')!;
    const r = validarOperacionRenta(d, { clasificacion: { ...resp, [agregado.id]: 'deduccion' }, rli: d.rli + 1, impuesto: d.impuesto, saldo: d.saldo });
    expect(r.errores.map((e) => e.tipo)).toEqual(['clasificacion_tributaria', 'calculo_incorrecto']);
  });

  it('los cálculos de RLI y F22 se validan con sus respuestas', () => {
    for (let s = 1; s <= 50; s++)
      for (const ej of [calculoRLI(crearRng(s), partidas), calculoF22(crearRng(s))]) {
        const resp = Object.fromEntries(ej.preguntas.map((p) => [p.id, p.valor]));
        expect(validarCalculo(ej, resp).correcto).toBe(true);
      }
  });

  it('las tasas escritas en las plantillas coinciden con la configuración tributaria', () => {
    const p = CONTENIDO.n5.plantillas;
    const impuesto = generarTransaccion(p.find((x) => x.id === 'provision_impuesto')!, crearRng(1)).valores;
    expect(impuesto.impuesto).toBe(Math.round(impuesto.rli * TASA_PRIMERA_CATEGORIA));
    const hon = generarTransaccion(p.find((x) => x.id === 'pago_honorarios')!, crearRng(1)).valores;
    expect(hon.retencion).toBe(Math.round(hon.bruto * trib.tasaRetencionHonorarios));
  });

  it('el impuesto a la renta se presenta después del resultado antes de impuesto', () => {
    const e = construirEERR([
      { cuentaId: 'ventas', debe: 0, haber: 1_000_000 },
      { cuentaId: 'impuesto_renta', debe: 270_000, haber: 0 },
    ]);
    expect(e.resultadoAntesImpuesto).toBe(1_000_000);
    expect(e.resultadoEjercicio).toBe(730_000);
    expect(e.gastosOperacionales).toHaveLength(0);
  });
});

describe('contenido', () => {
  it('las preguntas están bien formadas y sin ids repetidos', () => {
    const ids = new Set<string>();
    for (const c of Object.values(CONTENIDO)) {
      expect(c.preguntas.length).toBeGreaterThanOrEqual(15);
      for (const q of c.preguntas) {
        expect(ids.has(q.id)).toBe(false);
        ids.add(q.id);
        expect(q.opciones).toHaveLength(4);
        expect(q.correcta).toBeGreaterThanOrEqual(0);
        expect(q.correcta).toBeLessThan(4);
        expect(q.explicacion && q.fuente).toBeTruthy();
      }
    }
  });
  it('cada tipo de error del motor existe en el catálogo', () => {
    const usados = ['descuadre', 'lado_invertido', 'cuenta_confundida', 'falta_cuenta', 'cuenta_incorrecta', 'monto_incorrecto', 'iva_mal_aplicado', 'asiento_vacio', 'clasificacion', 'saldo_incorrecto', 'naturaleza_saldo', 'error_no_detectado', 'falso_positivo', 'trivia', 'destino_balance', 'resultado_ejercicio', 'seccion_balance', 'subtotal_eerr', 'calculo_incorrecto', 'clasificacion_tributaria'];
    for (const t of usados) expect(tiposDeError()).toContain(t);
    expect(infoError('descuadre').severidad).toBe('grave');
  });
});

describe('recompensas y progreso', () => {
  it('calcula XP con ayuda y combo', () => {
    expect(xpPorAcierto(1, false)).toBe(10);
    expect(xpPorAcierto(1, true)).toBe(5);
    expect(xpPorAcierto(3, false)).toBe(20);
  });
  it('el daño depende del error más grave', () => {
    expect(danioPorErrores([])).toBe(0);
    expect(danioPorErrores(['monto_incorrecto'])).toBe(5);
    expect(danioPorErrores(['monto_incorrecto', 'descuadre'])).toBe(15);
  });
  it('la racha sube con días seguidos y se reinicia si se salta un día', () => {
    let p = registrarActividad(progresoInicial(), '2026-11-08');
    p = registrarActividad(p, '2026-11-09');
    expect(p.racha).toBe(2);
    expect(registrarActividad(p, '2026-11-09').racha).toBe(2);
    expect(registrarActividad(p, '2026-11-12').racha).toBe(1);
  });
  it('migra datos dañados sin romperse', () => {
    expect(migrar(null).xp).toBe(0);
    expect(migrar({ xp: 'hola', hp: 500, repaso: [1, 'n1-q01'] })).toMatchObject({ xp: 0, hp: 100, repaso: ['n1-q01'] });
  });
  it('desbloquea niveles en orden', () => {
    const p = progresoInicial();
    expect(nivelDesbloqueado(p, ORDEN_NIVELES, 'n1')).toBe(true);
    expect(nivelDesbloqueado(p, ORDEN_NIVELES, 'n2')).toBe(false);
    expect(nivelDesbloqueado(actualizarNivel(p, 'n1', { completado: true }), ORDEN_NIVELES, 'n2')).toBe(true);
  });
});
