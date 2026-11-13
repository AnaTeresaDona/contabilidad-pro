/** Convierte números dichos en voz alta ("un millón doscientos mil", "1,5", "doce mil") a número. */

const UNIDADES: Record<string, number> = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18,
  diecinueve: 19, veinte: 20, veintiun: 21, veintiuno: 21, veintiuna: 21, veintidos: 22, veintitres: 23,
  veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
  cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300,
  cuatrocientos: 400, cuatrocientas: 400, quinientos: 500, quinientas: 500, seiscientos: 600, seiscientas: 600,
  setecientos: 700, setecientas: 700, ochocientos: 800, ochocientas: 800, novecientos: 900, novecientas: 900,
};

export function normalizarHabla(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[¿?¡!"«»]/g, ' ')
    .trim();
}

/** Lee un número escrito con cifras: "1.250.000", "1250000", "0,75", "1.5". */
function cifra(t: string): number | null {
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) return Number(t.replace(/\./g, ''));
  if (/^\d{1,3}(\.\d{3})+,\d+$/.test(t)) return Number(t.replace(/\./g, '').replace(',', '.'));
  if (/^\d+,\d+$/.test(t)) return Number(t.replace(',', '.'));
  if (/^\d+(\.\d+)?$/.test(t)) return Number(t);
  return null;
}

/** Interpreta la parte entera de una lista de palabras/cifras. Devuelve null si no hay ningún número. */
function entero(tokens: string[]): { valor: number; ceros: number } | null {
  let millones = 0;
  let miles = 0;
  let actual = 0;
  let hay = false;
  let ceros = 0;
  let previoCifra = false;
  for (const t of tokens) {
    const c = cifra(t);
    if (c !== null) {
      // "1 250 000": grupos de tres cifras seguidos se pegan.
      if (previoCifra && /^\d{3}$/.test(t)) actual = actual * 1000 + c;
      else actual += c;
      if (c === 0 && !hay) ceros++;
      hay = true;
      previoCifra = true;
      continue;
    }
    previoCifra = false;
    if (t in UNIDADES) {
      if (UNIDADES[t] === 0 && actual === 0) ceros++;
      actual += UNIDADES[t];
      hay = true;
    } else if (t === 'mil') {
      miles += (actual || 1) * 1000;
      actual = 0;
      hay = true;
    } else if (t === 'millon' || t === 'millones') {
      millones += (miles + actual || 1) * 1_000_000;
      miles = 0;
      actual = 0;
      hay = true;
    }
  }
  return hay ? { valor: millones + miles + actual, ceros } : null;
}

export function numeroDesdeTexto(texto: string): number | null {
  let s = normalizarHabla(texto)
    .replace(/\$/g, ' ')
    .replace(/%/g, ' ')
    .replace(/(\d)\s*(mil|millon|millones)\b/g, '$1 $2');
  const negativo = /^(menos|negativo)\b/.test(s);
  if (negativo) s = s.replace(/^(menos|negativo)\s*/, '');
  const [izq, der] = s.split(/\s+(?:coma|punto)\s+/);
  const ti = izq.split(/\s+/).filter(Boolean);
  const e = entero(ti);
  if (!e) return null;
  let valor = e.valor;
  if (der !== undefined) {
    const d = entero(der.split(/\s+/).filter(Boolean));
    if (d) {
      const digitos = String(d.valor);
      valor += Number(`0.${'0'.repeat(d.ceros > 0 && d.valor !== 0 ? d.ceros : 0)}${digitos}`);
    }
  }
  return negativo ? -valor : valor;
}
