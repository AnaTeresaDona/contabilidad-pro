# Hoja de ruta

## Fase 1 — Hecha
- Motor contable con tests: asientos, IVA, Cuenta T, detección y clasificación de errores.
- Guardado con versión y migración, respaldo descargable.
- XP, caja de la empresa (salud), racha diaria, combos, logros, mazo de repaso.
- Pistas y auditoría "¿En qué me equivoqué?" con la regla y la fuente.
- Nivel 1 completo: trivia (18 preguntas), práctica con 4 tipos de ejercicio y 14 transacciones, jefe "El libro de Don Ramiro".
- "Mi empresa": libro diario, libro mayor y ecuación contable con los asientos del jugador.

## Fase 2 — Hecha
- Nivel 2: 18 preguntas de trivia, 8 situaciones de documentos tributarios, 7 operaciones con DTE (factura, boleta con IVA incluido, notas de crédito emitida y recibida, pago de IVA en F29).
- Ejercicios nuevos: elegir el documento, mayorizar, ubicar saldos en columnas, Balance de 8 columnas con cuadratura en vivo (en celular: tarjeta por cuenta y pestañas por pareja de columnas; en escritorio: tabla completa).
- Jefe: la Sra. Marta del banco pide el Balance de 8 columnas de un mes completo.
- "Mi empresa" muestra el Balance de 8 columnas armado con todos los asientos del jugador.

## Fase 3 — Hecha
- Nivel 3: 16 preguntas (NIC 1), 6 preguntas de interpretación, cuentas con grupo corriente / no corriente / operacional.
- Ejercicios: ubicar cuentas en los estados, calcular subtotales del Estado de Resultados (acepta pérdidas), armar el Balance General con cuadratura en vivo.
- Jefe: Don Patricio del comité de riesgo pide ambos estados del mismo mes.
- "Mi empresa" muestra el Estado de Resultados y el Balance General de la empresa del jugador.
- Simplificación conocida: el préstamo bancario se presenta completo como no corriente (sin separar la porción corriente).

## Fase 4A — Hecha
- Nivel 4A: 16 preguntas (NIIF para las PYMES, Secciones 2, 10, 11, 13, 17 y 21), 6 situaciones, 7 asientos de ajuste con fórmulas.
- Cuentas complementarias (Depreciación acumulada, Estimación de incobrables) con su explicación propia en la auditoría.
- Ejercicio de cálculo genérico (sirve también para RLI y ratios): depreciación lineal y reexpresión antes/después de ajustes.
- Jefe: la auditora externa pide registrar 3 ajustes de cierre y el resultado ajustado.
- Simplificación conocida: las remuneraciones se registran sin descuentos previsionales.

## Próximas fases (una por iteración)
1. **Nivel 4B — Full IFRS y CMF:** la empresa se abre a la bolsa; errores generan "Sanciones CMF".
2. **Nivel 5 — SII y Operación Renta:** RLI, agregados, deducciones, gastos rechazados Art. 21 LIR. Tasas desde `config/tributario.json`.
3. **Nivel 6 — Análisis financiero (CFO):** análisis vertical y horizontal; ratios por familia con cálculo e interpretación:
   - Liquidez: razón corriente, prueba ácida, capital de trabajo.
   - Endeudamiento y solvencia: deuda/patrimonio, deuda/activos, cobertura de intereses.
   - Rentabilidad: margen bruto, operacional y neto, ROA, ROE.
   - Actividad y eficiencia: rotación de inventario, de cuentas por cobrar y de activos; días de cobro y de pago; ciclo de conversión de caja.
   - Flujo de efectivo NIC 7 y la crisis de liquidez como jefe final.

## Más adelante — Modo Empresa (simulación en el tiempo)
Idea: después de la historia, la empresa sigue viva y el tiempo avanza en meses y años de juego.

- **Calendario de juego:** cada mes trae operaciones normales; cada cierre de año pide Balance, Estado de Resultados y Operación Renta de verdad, con los datos acumulados.
- **Crecimiento:** comprar terrenos, abrir sucursales, comprar camiones, contratar personal, pedir créditos, emitir acciones.
- **Eventos inesperados** (cartas de evento), cada uno con su tratamiento contable:
  - Se quema el horno → baja de activo fijo, pérdida, cobro del seguro.
  - "La plata no cuadra" → conciliación bancaria, faltante de caja, posible fraude interno.
  - Cliente grande que no paga → deterioro de cuentas por cobrar (incobrables).
  - Inflación alta → efectos en precios, inventario y reajustes.
  - Fiscalización del SII → revisar documentos y gastos rechazados.
  - Inspección de la CMF → hechos esenciales, auditoría externa.
- **Decisiones con consecuencias:** ¿financiar con deuda o con capital? ¿vender al crédito o al contado? Los ratios cambian y el directorio reacciona.
- **Base técnica ya preparada:** el libro de la empresa (`progreso.libro`) persiste entre niveles; los eventos podrían ser plantillas como las de `plantillas.json`.

## Otras ideas
- Desafío diario con la misma semilla para todos.
- Modo contrarreloj ("cierre de mes en 90 segundos").
- Arrastrar y soltar cuentas en la Cuenta T (además de tocar).
- Sonidos opcionales.
- Modo profesor: exportar resultados de un curso.
