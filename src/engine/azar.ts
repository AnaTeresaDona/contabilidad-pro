/** Generador aleatorio con semilla (mulberry32): la misma semilla produce los mismos ejercicios. */
export type Rng = () => number;

export function crearRng(semilla: number): Rng {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function semillaAleatoria(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

/** Entero entre min y max (incluidos), en múltiplos de `paso` desde min. */
export function entero(rng: Rng, min: number, max: number, paso = 1): number {
  const pasos = Math.floor((max - min) / paso);
  return min + paso * Math.floor(rng() * (pasos + 1));
}

export function elegir<T>(rng: Rng, lista: readonly T[]): T {
  return lista[Math.floor(rng() * lista.length)];
}

export function barajar<T>(rng: Rng, lista: readonly T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

export function elegirVarios<T>(rng: Rng, lista: readonly T[], n: number): T[] {
  return barajar(rng, lista).slice(0, n);
}
