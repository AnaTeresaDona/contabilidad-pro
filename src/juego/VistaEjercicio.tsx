import { calcularIva, formatoCLP } from '../engine/dinero';
import type { Ejercicio } from '../engine/ejercicios';
import { PreguntaVista } from './ejercicios/PreguntaVista';
import { EjClasificar } from './ejercicios/EjClasificar';
import { EjDebeHaber } from './ejercicios/EjDebeHaber';
import { EjCompletar } from './ejercicios/EjCompletar';
import { EjCuentaT } from './ejercicios/EjCuentaT';
import { EjJefe } from './ejercicios/EjJefe';
import { EjMayorizar } from './ejercicios/EjMayorizar';
import { EjColumna8 } from './ejercicios/EjColumna8';
import { EjBalance8 } from './ejercicios/EjBalance8';
import { EjBalanceGeneral, EjEstadoResultados, EjEstadosCompletos, EjSecciones } from './ejercicios/EjEstados';
import { EjCalculo } from './ejercicios/EjCalculo';
import { EjAjustesCierre } from './ejercicios/EjAjustesCierre';
import { EjFiscalizacion } from './ejercicios/EjFiscalizacion';
import { EjClasificarPartidas, EjOperacionRenta } from './ejercicios/EjPartidas';
import { EjClasificarOpciones } from './ejercicios/EjClasificarOpciones';
import { EjCrisis } from './ejercicios/EjCrisis';
import type { ApiEjercicio } from './MarcoEjercicio';

export function pistaDe(ej: Ejercicio): string {
  switch (ej.tipo) {
    case 'clasificar':
      return 'Activo: lo que la empresa tiene o le deben. Pasivo: lo que debe. Patrimonio: lo de los dueños. Ingreso: lo que gana por su actividad. Gasto: lo que consume para funcionar.';
    case 'cuentaT':
      return 'Suma cada lado por separado y resta el menor al mayor. El saldo toma el nombre del lado mayor: Debe → deudor, Haber → acreedor.';
    case 'debeHaber':
      return ej.trans.pista;
    case 'completar': {
      const v = ej.trans.valores;
      return ej.trans.conIva
        ? `${ej.trans.pista} Neto ${formatoCLP(v.neto)}, IVA ${formatoCLP(v.iva ?? calcularIva(v.neto))}, total ${formatoCLP(v.total)}.`
        : ej.trans.pista;
    }
    case 'pregunta':
      return /documento|emit|factura|boleta|nota de/i.test(ej.pregunta.pregunta)
        ? 'Piensa quién es el comprador (¿consumidor final o empresa?) y si la operación crea, aumenta, rebaja o solo traslada.'
        : `Esta pregunta se basa en: ${ej.pregunta.fuente}. Descarta primero las alternativas que claramente no corresponden y repasa ese tema en los apuntes.`;
    case 'mayorizar':
      return 'Recorre los asientos uno por uno: cada vez que aparezca la cuenta, anota su monto en el mismo lado (Debe o Haber) de la Cuenta T. Después suma cada lado y resta.';
    case 'columna8':
      return 'Activo → Activo. Pasivo y Patrimonio → Pasivo. Gastos → Pérdidas. Ingresos → Ganancias.';
    case 'balance8':
      return 'Saldo = lado mayor − lado menor. Activo, Pasivo y Patrimonio van a Inventario; Ingresos y Gastos a Resultados. Resultado = Ganancias − Pérdidas.';
    case 'libroErrores':
      return 'Revisa cada asiento: ¿cuadra? ¿las cuentas son las de la operación? ¿cada una está en su lado? ¿el IVA es 19% del neto?';
    case 'secciones':
      return 'Activos y pasivos: ¿se cobran, usan o pagan en menos de 12 meses (corriente) o en más (no corriente)? Ingresos y gastos van al Estado de Resultados.';
    case 'eerr':
      return 'Margen bruto = Ventas − Costo de ventas. Resultado operacional = Margen bruto − gastos de administración y ventas. Antes de impuesto = Resultado operacional + otros ingresos − gastos financieros.';
    case 'bg':
    case 'estados':
      return 'Caja, banco, clientes, mercaderías e IVA crédito son corrientes; los activos fijos, no corrientes. El préstamo bancario va como no corriente. El resultado del ejercicio va en Patrimonio.';
    case 'calculo':
      return ej.datos.pista;
    case 'ajustesCierre':
      return 'Cada ajuste es un gasto contra una cuenta de balance: depreciación → Depreciación acumulada; deterioro → Estimación de incobrables o Mercaderías; provisión → Provisiones; devengo → Remuneraciones por pagar; anticipo → Arriendo pagado por anticipado. Resultado ajustado = resultado anterior − gastos de los ajustes.';
    case 'fiscalizacion':
      return 'Busca: arriendos largos registrados solo como gasto (NIIF 16), hechos esenciales informados tarde, dividendos bajo el 30% sin unanimidad, investigación capitalizada, uso de información privilegiada, activos deteriorados sin ajustar o estados anuales sin auditoría.';
    case 'clasificarPartidas':
    case 'operacionRenta':
      return 'Agregados: multas fiscales, provisiones y estimaciones no pagadas, deterioros contables, gastos sin respaldo o personales. Deducciones: dividendos de S.A. chilenas, mayor depreciación acelerada, provisiones de años anteriores pagadas este año. Gastos necesarios y acreditados: sin ajuste. RLI = resultado + agregados − deducciones; impuesto = RLI × 27%; saldo = impuesto − PPM.';
    case 'clasificarOpciones':
      return ej.datos.pista ?? 'Liquidez: ¿puedo pagar lo que vence pronto? Endeudamiento: ¿cuánto debo? Rentabilidad: ¿cuánto gano? Actividad: ¿qué tan rápido cobro, vendo y pago?';
    case 'decision':
      return ej.datos.calculo.pista;
    case 'crisis':
      return 'Razón corriente = activo corriente ÷ pasivo corriente. Días de cobro = clientes ÷ ventas × 365. Flujo operacional = utilidad + depreciación − aumento de clientes − aumento de inventario + aumento de proveedores.';
  }
}

export function VistaEjercicio({ ej, api }: { ej: Ejercicio; api: ApiEjercicio }) {
  switch (ej.tipo) {
    case 'pregunta':
      return <PreguntaVista pregunta={ej.pregunta} api={api} />;
    case 'mayorizar':
      return <EjMayorizar datos={ej.datos} api={api} />;
    case 'columna8':
      return <EjColumna8 cuentas={ej.cuentas} api={api} />;
    case 'balance8':
      return <EjBalance8 asientos={ej.asientos} balance={ej.balance} api={api} />;
    case 'libroErrores':
      return <EjJefe libro={ej.libro} api={api} />;
    case 'secciones':
      return <EjSecciones cuentas={ej.cuentas} api={api} />;
    case 'eerr':
      return <EjEstadoResultados balance={ej.balance} api={api} />;
    case 'bg':
      return <EjBalanceGeneral balance={ej.balance} api={api} />;
    case 'estados':
      return <EjEstadosCompletos asientos={ej.asientos} balance={ej.balance} api={api} />;
    case 'calculo':
      return <EjCalculo datos={ej.datos} api={api} />;
    case 'ajustesCierre':
      return <EjAjustesCierre datos={ej.datos} api={api} />;
    case 'fiscalizacion':
      return <EjFiscalizacion afirmaciones={ej.afirmaciones} api={api} />;
    case 'clasificarPartidas':
      return <EjClasificarPartidas partidas={ej.partidas} api={api} />;
    case 'operacionRenta':
      return <EjOperacionRenta datos={ej.datos} api={api} />;
    case 'clasificarOpciones':
      return <EjClasificarOpciones datos={ej.datos} api={api} />;
    case 'crisis':
    case 'decision':
      return <EjCrisis datos={ej.datos} api={api} />;
    case 'clasificar':
      return <EjClasificar cuentas={ej.cuentas} api={api} />;
    case 'debeHaber':
      return <EjDebeHaber trans={ej.trans} orden={ej.orden} api={api} />;
    case 'completar':
      return <EjCompletar trans={ej.trans} opciones={ej.opciones} api={api} />;
    case 'cuentaT':
      return <EjCuentaT datos={ej.datos} api={api} />;
  }
}
