/** Recuerda el último campo de texto que tocó el jugador, para que la calculadora y la voz escriban en él. */

let ultimoCampo: HTMLInputElement | null = null;
let iniciado = false;

export function seguirCampos(): void {
  if (iniciado || typeof document === 'undefined') return;
  iniciado = true;
  const recordar = (e: Event) => {
    const t = e.target;
    if (t instanceof HTMLInputElement && !t.closest('[data-herramienta]') && t.type !== 'file' && t.type !== 'checkbox' && t.type !== 'range') ultimoCampo = t;
  };
  document.addEventListener('focusin', recordar);
  document.addEventListener('pointerdown', recordar, true);
}

/** El campo donde escribir: el último tocado o, si no hay, el primer campo vacío del ejercicio. */
export function campoDestino(): HTMLInputElement | null {
  const u = ultimoCampoUsable();
  if (u) return u;
  const main = document.querySelector('main');
  if (!main) return null;
  const campos = camposDe(main as HTMLElement).filter((c) => c.type !== 'range');
  return campos.find((c) => !c.value) ?? null;
}

export function campoUsable(el: HTMLInputElement | null): el is HTMLInputElement {
  return !!el && el.isConnected && !el.disabled && !el.readOnly;
}

export function ultimoCampoUsable(): HTMLInputElement | null {
  return campoUsable(ultimoCampo) ? ultimoCampo : null;
}

export function marcarCampo(el: HTMLInputElement | null): void {
  ultimoCampo = el;
}

/** Escribe un valor en un campo controlado por React (dispara el evento "input"). */
export function escribirEnCampo(el: HTMLInputElement, texto: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(el, texto);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Texto de un número como lo escribiría el jugador: miles con punto y decimales con coma. */
export function textoNumero(n: number, decimales = 4): string {
  const negativo = n < 0;
  const abs = Math.abs(n);
  const entero = Math.trunc(Math.round(abs * 10 ** decimales) / 10 ** decimales);
  const resto = Math.round((abs - entero) * 10 ** decimales);
  const miles = entero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const dec = resto > 0 ? ',' + resto.toString().padStart(decimales, '0').replace(/0+$/, '') : '';
  return `${negativo ? '-' : ''}${miles}${dec}`;
}

/** Campos de texto habilitados dentro de un contenedor, en orden. */
export function camposDe(contenedor: HTMLElement): HTMLInputElement[] {
  return [...contenedor.querySelectorAll('input')].filter((i) => campoUsable(i) && i.type !== 'checkbox' && i.type !== 'radio');
}
