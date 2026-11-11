# Contabilidad Pro: De la Cuenta T a la CMF y el SII

Juego web para aprender contabilidad chilena. Eres el contador de **Empanadas La Tía SpA**, que crece nivel a nivel: de emprendimiento a sociedad anónima abierta.

**Estado actual:** Niveles 1 a 5 jugables (trivia, práctica y jefe final). El nivel 6 aparece en el mapa como "Próximamente".

| Nivel | Qué se practica | Jefe final |
|---|---|---|
| 1 · Partida doble | Clasificar cuentas, Debe/Haber, Cuenta T, asientos con IVA | Encontrar los 2 asientos malos en el libro de Don Ramiro |
| 2 · Ciclo contable y DTE | Elegir el documento tributario, registrar facturas, boletas y notas de crédito, pagar el IVA (F29), mayorizar, ubicar saldos en el balance | Balance de 8 columnas completo con resultado del ejercicio, para el banco |
| 3 · Estados Financieros | Clasificar cuentas en corriente / no corriente / resultados, calcular margen bruto, resultado operacional y antes de impuesto, armar el Balance General, interpretar | Estado de Resultados + Balance General clasificado para el comité de riesgo |
| 4A · IFRS para PyMEs | Depreciación lineal, ajustes de cierre (deterioro de clientes e inventario, provisiones, devengo, gastos anticipados), estados antes y después de ajustes | Registrar los ajustes que pide la auditora externa y calcular el resultado ajustado |
| 4B · NIIF plenas y CMF | Arrendamientos NIIF 16 (valor presente, interés, depreciación), deterioro NIC 36, ganancia por acción NIC 33, dividendo mínimo legal, hechos esenciales e información privilegiada | Fiscalización de la CMF: encontrar las 3 infracciones entre 6 situaciones (los errores se muestran como "Sanción CMF") |
| 5 · SII y Operación Renta | Clasificar partidas (agregado, deducción, sin ajuste), calcular la RLI y el Impuesto de Primera Categoría, PPM y saldo del F22, asientos tributarios (PPM, impuesto, honorarios con retención, multas) | Operación Renta con la fiscalizadora del SII: revisar 6 partidas y completar el F22 (los errores se muestran como "Multa SII") |

En **Mi empresa** puedes ver el Libro Diario, el Mayor, el Balance de 8 columnas y los Estados Financieros de tu propia empresa, armados con todos los asientos que has registrado bien.

---

## Cómo jugar en tu computador

Necesitas [Node.js](https://nodejs.org) 20 o superior.

```bash
npm install
npm run dev
```

Abre la dirección que aparece (por ejemplo `http://localhost:5173`).

Otros comandos:

| Comando | Para qué sirve |
|---|---|
| `npm test` | Revisa que la contabilidad del motor esté correcta (asientos cuadrados, IVA, saldos, etc.) |
| `npm run build` | Genera la versión para publicar, en la carpeta `dist/` |

---

## Cómo publicarlo en internet (gratis)

### Opción A: Netlify, sin instalar nada más

1. Ejecuta `npm run build`.
2. Entra a <https://app.netlify.com/drop>.
3. Arrastra la carpeta `dist/` a la página. Te da un enlace al tiro.

### Opción B: Vercel o Netlify conectados a GitHub (recomendado para ir mejorándolo)

1. Sube este proyecto a un repositorio de GitHub.
2. En Vercel ("Add New → Project") o Netlify ("Add new site → Import from Git"), elige el repositorio.
3. Ambos detectan Vite solos. Si te lo piden, usa: comando de build `npm run build` y carpeta de salida `dist`.

Desde ahí, cada cambio que subas a GitHub se publica automáticamente.

---

## Cómo está organizado

```
src/
  config/tributario.json   ← tasas del año tributario (IVA, Primera Categoría, retención de honorarios). Actualizar cada año.
  content/                 ← TODO el contenido educativo, separado del código
    cuentas.json           ← plan de cuentas con su tipo y descripción
    errores.json           ← catálogo de errores: regla, explicación, cómo corregir y fuente
    logros.ts              ← logros y sus condiciones
    index.ts               ← mapa de niveles
    nivel1/
      preguntas.json       ← banco de preguntas de la trivia (se sortean 5)
      plantillas.json      ← transacciones con montos al azar
      index.ts             ← historia, personajes, ejercicios de la práctica y jefe
    nivel2/
      preguntas.json       ← trivia del ciclo contable y DTE
      situaciones.json     ← "¿qué documento emites?" (para la práctica)
      plantillas.json      ← facturas, boletas, notas de crédito, pago de IVA
      index.ts
    nivel3/
      preguntas.json       ← trivia de estados financieros (NIC 1)
      situaciones.json     ← preguntas de interpretación para la práctica
      index.ts
    nivel5/
      preguntas.json       ← trivia de RLI, gastos rechazados, PPM, F22 y retenciones
      situaciones.json     ← casos tributarios para la práctica
      partidas.json        ← partidas para la RLI (agregado, deducción o sin ajuste) con su artículo de la LIR
      plantillas.json      ← PPM, impuesto a la renta, F22, honorarios, multas
      index.ts
    nivel4b/
      preguntas.json       ← trivia de NIIF plenas, CMF y sociedades anónimas
      situaciones.json     ← hechos esenciales, información privilegiada, dividendos
      afirmaciones.json    ← situaciones para la fiscalización (infracción o correcta)
      plantillas.json      ← arrendamientos NIIF 16, deterioro, dividendos
      index.ts
    nivel4a/
      preguntas.json       ← trivia de NIIF para las PYMES
      situaciones.json     ← provisiones vs contingencias, devengo, inventario
      plantillas.json      ← asientos de ajuste con fórmulas (depreciación, deterioro…)
      index.ts
  engine/                  ← lógica contable pura, con tests (motor.test.ts)
  juego/                   ← ejercicios y el marco común (pistas, XP, auditoría)
  pantallas/               ← mapa, nivel, mi empresa, repaso, logros, ajustes
  estado/                  ← progreso guardado en el navegador y estado de la partida
```

### Agregar o corregir preguntas

Edita `src/content/nivel1/preguntas.json`. Cada pregunta tiene:

```json
{
  "id": "n1-q19",
  "pregunta": "¿…?",
  "opciones": ["A", "B", "C", "D"],
  "correcta": 0,
  "explicacion": "Por qué la correcta es correcta.",
  "fuente": "Norma o artículo"
}
```

`correcta` es la posición de la respuesta correcta, partiendo de 0. Las alternativas se barajan solas en el juego. Después de editar, corre `npm test`: avisa si una pregunta quedó mal formada.

### Agregar una transacción nueva

Edita `src/content/nivel1/plantillas.json`. Ejemplo:

```json
{
  "id": "compra_vehiculo",
  "conIva": true,
  "texto": "Compras una camioneta de reparto por {neto} + IVA y pagas con transferencia.",
  "variables": { "neto": { "min": 8000000, "max": 15000000, "paso": 100000 } },
  "lineas": [
    { "cuenta": "vehiculos", "lado": "debe", "monto": "neto" },
    { "cuenta": "iva_cf", "lado": "debe", "monto": "iva" },
    { "cuenta": "banco", "lado": "haber", "monto": "total" }
  ],
  "pista": "Texto de ayuda."
}
```

- Con `"conIva": true`, el juego calcula solo `iva` y `total` a partir de `neto`.
- Un monto puede ser un porcentaje de otro: `{ "de": "neto", "factor": [0.45, 0.65], "paso": 1000 }`.
- Una línea puede usar sumas o restas: `"total - contado"`.
- Con `"ivaIncluido": true` (boletas), el monto `total` ya trae IVA y el juego separa `neto` e `iva`.
- `"documento": { "tipo": 33, "emisor": "...", "receptor": "..." }` muestra la factura, boleta o nota de crédito junto a la operación.
- Una variable puede ser una fórmula: `{ "formula": "(costo - residual) / (vida * 12)" }` (se redondea al peso).
- En el texto, `{x}` se muestra como dinero, `{x:n}` como número ("8 años") `{x:%}` como porcentaje y `{x:pb}` (puntos base) como tasa: 80 → "0,80%". Las fórmulas aceptan potencias con `^`.
- `npm test` genera cada plantilla 300 veces con montos distintos y comprueba que el asiento siempre cuadre.

### Ajustar la dificultad

Los números del juego (XP por acierto, daño a la caja, preguntas para aprobar, etc.) están en `src/engine/recompensas.ts`.

---

## Guardado

El progreso se guarda solo en el navegador (localStorage). En **Ajustes** puedes descargar un respaldo y cargarlo en otro dispositivo.

## Aviso

Contenido educativo. La normativa tributaria y contable cambia: verifica siempre con las fuentes oficiales (SII, CMF, IFRS Foundation) y, idealmente, que un contador revise el contenido antes de usarlo en clases.
