import { describe, expect, it } from 'vitest';
import { crearRng } from './azar';
import { calcularIva, formatoCLP, leerMonto } from './dinero';
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
import { ejMayorizar } from './ejercicios';

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
    const usados = ['descuadre', 'lado_invertido', 'cuenta_confundida', 'falta_cuenta', 'cuenta_incorrecta', 'monto_incorrecto', 'iva_mal_aplicado', 'asiento_vacio', 'clasificacion', 'saldo_incorrecto', 'naturaleza_saldo', 'error_no_detectado', 'falso_positivo', 'trivia', 'destino_balance', 'resultado_ejercicio'];
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
