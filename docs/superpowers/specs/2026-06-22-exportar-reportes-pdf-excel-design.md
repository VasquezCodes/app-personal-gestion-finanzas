# Exportar Reportes — PDF y Excel

**Fecha**: 2026-06-22
**Estado**: Aprobado (diseño)
**Página afectada**: `/reportes` (`src/pages/Reportes/index.tsx`)

## Contexto

Hoy el botón de descarga en `/reportes` (ícono download al lado del botón de Historial) exporta un CSV plano con TODOS los vehículos del usuario, sin filtrar por período. El cliente reportó que (a) el ícono no es descubrible — no sabe qué hace, (b) el formato CSV es limitado y (c) el contenido no respeta el período que está viendo.

Necesitamos reemplazar este flujo por una experiencia de exportación clara: un botón etiquetado "Exportar" que abre un bottom sheet donde el usuario elige formato (PDF o Excel) y período (mes actual o año actual), y genera un documento financiero completo del período seleccionado.

## Objetivo

Permitir al dueño del dealership generar un reporte financiero del período (mes o año) en PDF o Excel, descargable desde la página de Reportes.

## No-objetivos

- Personalización del rango de fechas (custom date range) — solo "mes actual" o "año actual" del navegador.
- Charts embebidos en el PDF — solo tablas y números (decisión explícita por simplicidad).
- Estilos custom en Excel (bold, color, borders) — la versión community de SheetJS no los soporta.
- Compartir por email / nube — solo descarga local del archivo.

## UX

### Botón "Exportar" en el header de Reportes

Reemplazar el botón cuadrado actual (líneas 381-389 de [src/pages/Reportes/index.tsx](src/pages/Reportes/index.tsx#L381)) por una pill con texto + ícono:

```
[ ⌃ Exportar ]
```

- Altura 38px (igual al actual)
- Padding horizontal 14px
- Background `var(--ink)`, texto `var(--bg)` (cream sobre ink)
- Ícono download Lucide tamaño 13px, gap 6px con el texto
- Conserva la posición al lado del botón de Historial
- Box shadow igual al actual: `0 4px 12px rgba(20,20,19,0.18)`

### Bottom sheet "Exportar reporte"

Estructura visual (estilo iOS, drag handle, slide-up animation):

```
┌──────────────────────────────────────┐
│       ━━━━ (drag handle)             │
│                                      │
│  Exportar reporte           [ ✕ ]    │
│                                      │
│  FORMATO                             │
│  ┌──────────┐  ┌──────────┐          │
│  │  📄 PDF  │  │ 📊 Excel │          │
│  │     ✓    │  │          │          │
│  └──────────┘  └──────────┘          │
│                                      │
│  PERÍODO                             │
│  ┌──────────────┐  ┌──────────────┐  │
│  │ Junio 2026   │  │ Año 2026     │  │
│  │      ✓       │  │              │  │
│  └──────────────┘  └──────────────┘  │
│                                      │
│  ╔══════════════════════════════╗    │
│  ║   Exportar PDF · Junio 2026  ║    │
│  ╚══════════════════════════════╝    │
└──────────────────────────────────────┘
```

**Defaults**:
- Formato: PDF
- Período: alineado con el navegador del Reportes. Si el usuario está en modo Mes viendo "Junio 2026", el sheet pre-selecciona "Junio 2026". Si está en modo Año viendo "2026", pre-selecciona "Año 2026". El otro chip sigue disponible para cambiar sin volver atrás.

**Labels dinámicos**:
- Chip de mes: `${MESES_LARGOS[mesActual]} ${anioActual}` (e.g. "Junio 2026")
- Chip de año: `Año ${anioActual}`
- Botón submit: `Exportar ${formato} · ${chip seleccionado}` (e.g. "Exportar PDF · Junio 2026")

**Estados**:
- Mientras se genera: texto del botón cambia a "Generando…", disabled, cursor default
- Éxito: descarga del archivo, sheet se cierra
- Error: `window.alert('No se pudo generar: ${mensaje}')`, sheet permanece abierto

## Layout del PDF

**Formato**: A4 vertical. 1-3 páginas según volumen de datos (autoflow de jsPDF-autotable).
**Librería**: `jspdf` + `jspdf-autotable`.
**Sin charts** — solo tablas y números.

### Estructura

1. **Header** (barra ink full-width, ~18mm de alto)
   - Izquierda: "MOTORHUB" en cream bold, debajo "Reporte financiero" cream/60%
   - Derecha: período en bold (e.g. "Junio 2026"), debajo "Generado 22/06/2026" en small

2. **Hero KPI "Ganancia neta"**
   - Número grande (32pt)
   - Verde (`#4A7A5A`) si positivo, rojo (`#A04848`) si negativo
   - Prefijo `+$` o `−$`
   - Centrado, sobre fondo cream sutil

3. **4 KPIs secundarios** (grid 4 columnas, fondo gris muy claro)
   - Ventas (count de vehículos vendidos en el período)
   - Ingresos (suma de `precio_venta` de vendidos)
   - Inversión (suma de `precio_compra + gastos_adicionales` de vehículos comprados en el período)
   - Gastos generales (suma de `monto` de gastos en el período)
   - Cada tile: label uppercase 7pt + valor 13pt bold

4. **Tabla "Ganancia por marca"**
   - Columnas: Marca | Unidades | Ingresos | Costo total | Ganancia | ROI %
   - Ordenada por ganancia descendente
   - Pérdidas en rojo (no se excluyen como en el pie chart on-screen)
   - Última fila "TOTAL" en bold con fondo ink

5. **Tabla "Vehículos vendidos"**
   - Columnas: Marca/Modelo/Año | Fecha venta | Compra | Reparaciones | Venta | Ganancia | ROI %
   - Ganancia coloreada (verde/rojo)
   - Vacío → render literal: "Sin ventas en el período"

6. **Tabla "Gastos generales"**
   - Columnas: Fecha | Categoría (capitalizada) | Descripción | Monto
   - Vacío → "Sin gastos generales en el período"

7. **Tabla "Reparaciones del período"**
   - Todas las reparaciones con `fecha` en el período (independiente de si el vehículo está vendido o no — es un movimiento de caja)
   - Columnas: Fecha | Vehículo (Marca Modelo) | Categoría | Descripción | Proveedor | Costo
   - Vacío → "Sin reparaciones registradas"

8. **Footer** (en cada página)
   - "MotorHub · Pág. X/Y" centrado, ink/40%

### Filename

- Mes: `motorhub-reporte-junio-2026.pdf` (nombre del mes en lowercase)
- Año: `motorhub-reporte-2026.pdf`

## Layout del Excel

**Formato**: `.xlsx` con 5 sheets.
**Librería**: `xlsx` (SheetJS, ya instalada en `package.json`).
**Sin estilos custom** — solo formatos numéricos nativos (currency, percentage, date) y column widths.

### Sheets

**Sheet 1 — "Resumen"** (layout vertical key/value)

| A | B |
|---|---|
| Reporte | MotorHub |
| Período | Junio 2026 |
| Generado | 22/06/2026 |
| | |
| INDICADOR | VALOR |
| Ganancia neta | $28,450 |
| Ventas | 12 |
| Ingresos | $185,000 |
| Inversión | $148,000 |
| Gastos generales | $8,500 |
| ROI promedio | 19.2% |

**Sheet 2 — "Por marca"**

| Marca | Unidades | Ingresos | Costo total | Ganancia | ROI % |
|---|---|---|---|---|---|
| Ford | 4 | $72,000 | $58,000 | $14,000 | 24.1% |
| … | | | | | |
| TOTAL | 12 | $185,000 | $148,000 | $28,450 | 19.2% |

**Sheet 3 — "Vehículos vendidos"**

| Marca | Modelo | Año | Fecha venta | Precio compra | Gastos adic. | Reparaciones | Precio venta | Ganancia | ROI % |

**Sheet 4 — "Gastos generales"**

| Fecha | Categoría | Descripción | Monto | Recurrente | Notas |
|---|---|---|---|---|---|
| 05/06/2026 | Alquiler | Local Junio | $1,800 | Sí | |
| … | | | | | |
| TOTAL | | | $8,500 | | |

**Sheet 5 — "Reparaciones"**

| Fecha | Vehículo | Categoría | Descripción | Proveedor | Costo |
|---|---|---|---|---|---|
| 03/06/2026 | Ford Focus 2020 | Mecánica | Cambio de aceite | Taller Pérez | $120 |
| … | | | | | |
| TOTAL | | | | | $2,340 |

### Detalles técnicos

- **Currency format**: aplicar `z: '"$"#,##0'` a celdas monetarias → Excel las muestra como `$1,800` y permite operar matemáticamente
- **Percentage format**: `z: '0.0"%"'` para ROI
- **Date format**: `z: 'dd/mm/yyyy'` para celdas de fecha (guardadas como `Date` reales, no strings)
- **Column widths**: ajustar con `worksheet['!cols']` para que las descripciones largas no aparezcan cortadas
- **Sheets vacíos**: si no hay vendidos/gastos/reparaciones en el período, la sheet existe igual con header pero sin filas (más simple que omitir hojas condicionalmente)

### Filename

- Mes: `motorhub-reporte-junio-2026.xlsx`
- Año: `motorhub-reporte-2026.xlsx`

## Arquitectura de código

### Archivos nuevos

```
src/
├── components/shared/
│   └── ExportarReporteSheet.tsx     ← bottom sheet (formato + período + submit)
└── lib/reportes/
    ├── buildReporteData.ts          ← query Supabase + agregaciones (compartido)
    ├── exportPdf.ts                 ← genera PDF (chunk lazy)
    └── exportExcel.ts               ← genera Excel (chunk lazy)
```

### Archivos modificados

- `src/pages/Reportes/index.tsx` — reemplazar botón ícono por pill "Exportar", agregar state `exportOpen`, renderizar sheet, eliminar `handleExport` viejo (líneas 329-345)
- `package.json` — agregar `jspdf` y `jspdf-autotable` como dependencies

### Separación de responsabilidades

**`buildReporteData.ts`** — única fuente de verdad de los datos del reporte:

```ts
interface ReporteData {
  periodo: {
    tipo: 'mes' | 'anio'
    label: string       // "Junio 2026" o "Año 2026"
    key: string         // "2026-06" o "2026"
    filenameSlug: string // "junio-2026" o "2026"
  }
  generadoEn: string    // ISO string
  kpis: {
    gananciaNeta: number
    ventas: number
    ingresos: number
    inversion: number
    gastosGenerales: number
    roiPromedio: number  // ponderado: ganancia_total / costo_total * 100
  }
  porMarca: Array<{
    marca: string
    unidades: number
    ingresos: number
    costo: number
    ganancia: number
    roi: number
  }>
  vendidos: Array<{
    marca: string
    modelo: string
    anio: number
    fechaVenta: string
    precioCompra: number
    gastosAdic: number
    reparaciones: number  // suma de costos de reparaciones de ese vehículo (histórico completo)
    precioVenta: number
    ganancia: number
    roi: number
  }>
  gastos: GastoGeneral[]  // filtrados por período
  reparaciones: Array<Reparacion & {
    vehiculo: { marca: string; modelo: string; anio: number }
  }>  // filtradas por fecha de reparación dentro del período
}

export async function buildReporteData(
  tipo: 'mes' | 'anio',
  anio: number,
  mes: number | null  // null si tipo === 'anio'; 0-indexed (Date.getMonth())
): Promise<ReporteData>
```

Hace 3 queries en paralelo a Supabase, filtradas por período en el SQL:
- `vehiculos` (necesarios para vendidos del período + inversión del período + agregación por marca; trae todos los del usuario porque la inversión cuenta `fecha_compra` y los vendidos cuentan `fecha_venta`)
- `gastos_generales` con `.like('fecha', '2026-06%')` (mes) o `.like('fecha', '2026%')` (año)
- `reparaciones` con join a `vehiculos(marca, modelo, anio)`, filtrado por `fecha` con el mismo patrón

RLS de Supabase ya garantiza per-user isolation (no hay que pasar `user_id` explícito).

**`exportPdf.ts`** — función pura `exportPdf(data: ReporteData): void`. Construye el PDF con jsPDF + autoTable y dispara `doc.save(filename)`.

**`exportExcel.ts`** — función pura `exportExcel(data: ReporteData): void`. Construye el workbook con SheetJS y dispara `XLSX.writeFile(wb, filename)`.

Ninguna de las dos toca Supabase ni state de la app. Solo consumen `ReporteData`.

### Lazy loading

Las libs pesadas se cargan solo cuando el usuario toca "Exportar":

```ts
async function handleExportar() {
  setLoading(true)
  try {
    const data = await buildReporteData(periodo, anioActual, periodo === 'mes' ? mesActual : null)
    if (formato === 'pdf') {
      const { exportPdf } = await import('../../lib/reportes/exportPdf')
      exportPdf(data)
    } else {
      const { exportExcel } = await import('../../lib/reportes/exportExcel')
      exportExcel(data)
    }
    onClose()
  } catch (e) {
    window.alert(`No se pudo generar: ${e instanceof Error ? e.message : String(e)}`)
  } finally {
    setLoading(false)
  }
}
```

Vite genera chunks separados automáticamente para cada `import()` dinámico. El bundle inicial de `/reportes` no incluye `jspdf`, `jspdf-autotable` ni `xlsx`.

### State del sheet

```ts
// En ExportarReporteSheet.tsx
const [formato, setFormato] = useState<'pdf' | 'excel'>('pdf')
const [periodo, setPeriodo] = useState<'mes' | 'anio'>(props.defaultPeriodo)
const [loading, setLoading] = useState(false)
```

Props:
```ts
interface Props {
  defaultPeriodo: 'mes' | 'anio'
  mesActual: number  // 0-indexed
  anioActual: number
  onClose: () => void
}
```

## Manejo de errores

- **Error de query Supabase**: `buildReporteData` re-throws. El handler en el sheet lo captura y muestra `window.alert(...)`. El sheet permanece abierto para que el usuario pueda reintentar.
- **Error en jsPDF / SheetJS**: idem.
- **Sin datos en el período**: NO es error. El reporte se genera igual con secciones vacías ("Sin ventas en el período", etc.).

## Testing

Manual:
1. Cargar `/reportes` con datos del usuario actual
2. Tocar "Exportar" → bottom sheet aparece con defaults correctos (formato PDF, período = vista actual)
3. Cambiar a Excel → cambiar a Año → tocar submit → archivo se descarga
4. Verificar filename (`motorhub-reporte-2026.xlsx`)
5. Abrir XLSX en Excel/LibreOffice → verificar 5 sheets, formato currency en columnas monetarias, totales correctos
6. Repetir con PDF → verificar 1-3 páginas, header correcto, tablas legibles, footer con paginación
7. Probar con usuario que no tenga ventas en el mes seleccionado → reporte se genera con "Sin ventas en el período"
8. Verificar que el bundle inicial de `/reportes` NO incluye `jspdf` ni `xlsx` (chunk separado en `dist/assets/`)

## Decisiones explícitas

- **No charts en PDF**: simplicidad, sin overhead de capturar charts a imagen.
- **Sin estilos custom en Excel**: SheetJS community no soporta bold/color/borders. El usuario puede aplicar formato localmente si quiere.
- **Pérdidas SÍ van en PDF**: a diferencia del pie chart on-screen que excluye marcas en pérdida, la tabla "Ganancia por marca" del PDF las incluye coloreadas en rojo. El reporte debe ser completo.
- **Reparaciones por fecha de reparación, no por venta**: la sección "Reparaciones del período" filtra por `Reparacion.fecha`, no por la venta del vehículo. Refleja el flujo de caja real del período.
- **Reparaciones en columna del vehículo vendido**: la columna "Reparaciones" de la tabla "Vehículos vendidos" muestra TODO el histórico de reparaciones del vehículo (no solo las del período), porque eso compone su `costo_total` y por lo tanto su ganancia real.
- **Período solo "Mes" o "Año"**: sin custom date range. YAGNI para v1.
- **CSV viejo se elimina completo**: no se mantiene como opción.
