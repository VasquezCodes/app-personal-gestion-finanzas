# New Screens & Dashboard Enhancements — Design Spec

> **Status**: Approved (Option A selected 2026-04-23)

## Goal

Add three new sub-screens (HistorialGastos, HistorialGanancias, ReparacionesScreen) and two Dashboard/Inventario/Reportes enhancements (días en lote widget + badge, proyección de ingresos, análisis por marca) using React Router routes with a shared BackHeader component.

## Architecture

**Navigation model (Option A — React Router routes):**
- Sub-screens live at dedicated routes: `/gastos/historial`, `/gastos/reparaciones`, `/reportes/historial`
- `TabBar` reads `useLocation().pathname` and hides itself on sub-screen routes using a `SUB_ROUTES` constant
- `PageTransition` already animates on `location.pathname` change — slide-in is free
- `BackHeader` is a new shared component: back chevron + title + optional right-side action slot
- Back navigation: `navigate(-1)` — no stack management needed

**Data sources:**
- `HistorialGastos`: localStorage key `motorhub_gastos_historial`, type `GastoHistorial[]`
- `HistorialGanancias`: localStorage key `motorhub_ganancias_historial`, type `VentaHistorial[]`
- `ReparacionesScreen`: Supabase join `reparaciones` + `vehiculos` to get brand; existing `repTotals` pattern not reused (fresh Supabase query)
- Dashboard widget + Inventario badge: derived from `useVehiculosStore().vehiculos` using `fecha_compra`
- Proyección: derived from existing `mesesData` computed in Reportes
- Análisis por marca: derived from `vehiculos` store + `repTotals` already fetched in Reportes

---

## Components

### `src/components/ios/BackHeader.tsx` (new)

Replaces the top area of sub-screen pages. Props:
```ts
interface BackHeaderProps {
  title: string
  onBack?: () => void        // defaults to navigate(-1)
  action?: React.ReactNode   // right-side button slot (e.g. export, add)
}
```

Visual: cream background, chevron-left button (40×40, radius 14, `rgba(20,20,19,0.08)` bg), title in ink bold centered, action slot at right. Respects `env(safe-area-inset-top)`.

### `src/components/ios/TabBar.tsx` (modify)

Add `SUB_ROUTES` constant and hide condition:
```ts
const SUB_ROUTES = ['/gastos/historial', '/gastos/reparaciones', '/reportes/historial']
// inside component:
const { pathname } = useLocation()
if (SUB_ROUTES.some(r => pathname.startsWith(r))) return null
```

---

## New Routes in App.tsx

```tsx
<Route path="/gastos/historial" element={<HistorialGastos />} />
<Route path="/gastos/reparaciones" element={<ReparacionesScreen />} />
<Route path="/reportes/historial" element={<HistorialGanancias />} />
```

These sit inside the existing `AppLayout` (inside `AuthGuard`, inside `PageTransition`).

---

## Screen Specs

### 1. HistorialGastos (`src/pages/Gastos/HistorialGastos.tsx`)

**Access**: Gastos page → button "Historial" (replaces old "Ver historial completo" if it exists; pair with Reparaciones button)

**Data model** (localStorage):
```ts
interface GastoHistorial {
  id: string           // crypto.randomUUID()
  descripcion: string
  monto: number
  categoria: CatKey    // reuse from Gastos page: 'alquiler'|'servicios'|'marketing'|'personal'|'otro'
  fecha: string        // ISO date YYYY-MM-DD
}
```

**Layout:**
- `BackHeader` with title "Historial de Gastos" + two right-side icon buttons: Export (↓) and Add (+)
- Hero card: total acumulado (all time), count of entries
- Year filter pills (auto-derived from unique years in data + "Todos")
- Search input (filters by description)
- Grouped list by month (descending): month label + monthly total, then items below
- Each item: category dot + description + date + amount + delete button (✕)

**Add form**: bottom sheet with fields: descripción, monto, categoría (select), fecha (date input). Save stores to localStorage.

**Export**: builds CSV string (`id,descripcion,monto,categoria,fecha`), creates Blob, triggers `<a download>` click. Respects active year filter.

**Delete**: removes entry from localStorage array, updates state.

**Empty state**: centered message "Sin gastos registrados" with suggestion to add one.

---

### 2. HistorialGanancias (`src/pages/Reportes/HistorialGanancias.tsx`)

**Access**: Reportes page → button "Historial"

**Data model** (localStorage):
```ts
interface VentaHistorial {
  id: string
  marca: string
  modelo: string
  anio: number
  ganancia: number
  roi: number          // percentage, e.g. 18.5
  dias: number         // días en lote
  fecha: string        // fecha de venta, ISO date
}
```

**Layout:**
- `BackHeader` with title "Historial de Ganancias" + Export + Add buttons
- Hero card: ganancia total + ROI promedio (weighted by ganancia) + sparkline of last 6 months' summed ganancia
- Year filter pills + search by marca/modelo
- Grouped by month (descending): month label + monthly ganancia total + ROI promedio del mes
- Each item: marca+modelo+año + fecha + ROI badge + ganancia amount + delete button

**Sparkline**: simple SVG polyline from last 6 months of data. White stroke on dark hero background. Skip months with no data (value = 0, still plotted as point).

**Add form**: bottom sheet fields: marca, modelo, año (number), ganancia (number), ROI % (number), días (number), fecha.

**Export**: CSV `id,marca,modelo,anio,ganancia,roi,dias,fecha`.

---

### 3. ReparacionesScreen (`src/pages/Gastos/Reparaciones.tsx`)

**Access**: Gastos page → button "Reparaciones"

**Data source**: Supabase query on mount:
```ts
supabase.from('reparaciones')
  .select('id, descripcion, costo, fecha, vehiculo_id, vehiculos(marca)')
  .order('fecha', { ascending: false })
```

**Repair category mapping** (derived from `descripcion` keyword matching OR a separate `tipo` field if available — use `descripcion` heuristic if no `tipo` column exists):
- Since the DB table has no `tipo` column, we categorize by description keywords:
  - `mecanica/motor/freno/aceite/transmision` → Mecánica
  - `pintura/carroceria/chapa/golpe` → Carrocería/Pintura
  - `electrico/bateria/alternador/faro` → Eléctrica
  - `interior/tapizado/asiento` → Interior
  - `goma/neumatico/llanta/rueda` → Gomas
  - default → Otros

**Layout:**
- `BackHeader` title "Reparaciones"
- Hero card: total gastado en reparaciones (all records), count
- Toggle pills: "Por tipo" | "Por marca"
- **Por tipo view**: ranked list of categories. Each row: tipo label + total + bar proportional to max. Tapping a row expands to show per-brand breakdown within that tipo (brand name + amount).
- **Por marca view**: ranked list of marcas. Each row: marca + total + bar. Tapping expands to per-tipo breakdown within that marca.

**Expansion**: single accordion — tapping a row toggles it open; tapping another closes the previous.

---

## Dashboard Enhancement: "Autos sin vender" Widget

**Location**: `src/pages/Dashboard/index.tsx` — new section between existing KPI cards and the chart, or below the chart, whichever fits the visual flow. Only renders when ≥1 vehicle has ≥30 days in lot.

**Logic**:
```ts
function diasEnLote(v: Vehiculo): number {
  if (v.estado === 'vendido') return 0
  return Math.floor((Date.now() - new Date(v.fecha_compra).getTime()) / 86_400_000)
}

function alertaNivel(dias: number): 'verde' | 'amarillo' | 'rojo' {
  if (dias < 30) return 'verde'
  if (dias < 60) return 'amarillo'
  return 'rojo'
}
```

Color map: `{ verde: '#7AAB8E', amarillo: '#B89870', rojo: '#C07070' }`

**Widget card**: title "Autos en lote" + subtitle "Requieren atención" (only shown when ≥1 at amarillo/rojo). Lists top 3 by days (most urgent first). Each row: marca+modelo + days badge (colored pill). Tapping navigates to `/vehiculo/:id`.

---

## Inventario Enhancement: Días en Lote Badge

**Location**: `src/pages/Inventario/VehiculoCard.tsx` — badge in the top-right corner of each non-sold vehicle card.

Same `diasEnLote` and color logic as Dashboard widget. Badge: pill with colored background (10% opacity of the color), colored text, e.g. "45 d". Only rendered when `v.estado !== 'vendido'`.

---

## Reportes Enhancement: Proyección del Próximo Mes

**Location**: `src/pages/Reportes/index.tsx` — new section after the existing bar chart.

**Logic** (derived from existing `mesesData`):
```ts
// Use months with ganancia > 0 for trend
const conDatos = mesesData.filter(m => m.ganancia > 0)
const avg = conDatos.length ? conDatos.reduce((a,m) => a + m.ganancia, 0) / conDatos.length : 0
// Linear growth from last 3 months vs first 3 months
const recientes = mesesData.slice(-3).filter(m => m.ganancia > 0)
const anteriores = mesesData.slice(0, 3).filter(m => m.ganancia > 0)
const avgRec = recientes.length ? recientes.reduce((a,m)=>a+m.ganancia,0)/recientes.length : avg
const avgAnt = anteriores.length ? anteriores.reduce((a,m)=>a+m.ganancia,0)/anteriores.length : avg
const crecimiento = avgAnt > 0 ? (avgRec - avgAnt) / avgAnt : 0
const proyeccion = avg * (1 + crecimiento * 0.6)  // dampened
const min = proyeccion * 0.82
const max = proyeccion * 1.18
const tendencia = crecimiento > 0.05 ? 'alza' : crecimiento < -0.05 ? 'baja' : 'estable'
```

**Visual**: card with title "Próximo mes (est.)" + trend indicator arrow. Shows min/proyectado/max in three columns. Small bar chart: last 3 months solid bars + 1 dashed projection bar.

---

## Reportes Enhancement: Análisis por Marca

**Location**: `src/pages/Reportes/index.tsx` — new section after Proyección.

**Logic** (derived from `vehiculos` + `repTotals`, only `estado === 'vendido'`):
```ts
type Metrica = 'ganancia' | 'roi' | 'unidades' | 'dias'
// per brand:
//   ganancia: sum of (precio_venta - costoVehiculo)
//   roi: avg of (ganancia_bruta / costoVehiculo * 100) per vehicle
//   unidades: count of sold vehicles
//   dias: avg of Math.floor((fecha_venta - fecha_compra) / 86400000)
```

**Visual**:
- 4 metric pills: Ganancia / ROI % / Unidades / Días
- Selected pill → ink background, others dim
- Ranked list of brands: brand name + metric value + horizontal bar proportional to max
- Bar color: unique stable color per brand (derive from brand name hash or hardcoded map for top 5)
- Summary chips at bottom: "Mejor ROI: [marca] [value]%" + "Más rápida: [marca] [value]d"

---

## Gastos Page Modifications

Add two quick-access buttons below the period selector (or below the hero card):

```tsx
// Two side-by-side buttons
<button onClick={() => navigate('/gastos/reparaciones')}>Reparaciones</button>
<button onClick={() => navigate('/gastos/historial')}>Historial</button>
```

Button style: pill, `rgba(20,20,19,0.07)` bg, ink text, 12px bold — matches existing period selector pills but wider.

---

## Reportes Page Modifications

Add one quick-access button in the header area:

```tsx
<button onClick={() => navigate('/reportes/historial')}>Historial</button>
```

---

## Type Additions (`src/types/index.ts`)

```ts
export interface GastoHistorial {
  id: string
  descripcion: string
  monto: number
  categoria: 'alquiler' | 'servicios' | 'marketing' | 'personal' | 'otro'
  fecha: string
}

export interface VentaHistorial {
  id: string
  marca: string
  modelo: string
  anio: number
  ganancia: number
  roi: number
  dias: number
  fecha: string
}
```

---

## Utility Helpers (`src/lib/utils.ts`)

Add (do not duplicate if already present):
```ts
export function diasEnLote(fechaCompra: string): number {
  return Math.floor((Date.now() - new Date(fechaCompra).getTime()) / 86_400_000)
}

export function alertaLote(dias: number): { color: string; bg: string; nivel: 'verde' | 'amarillo' | 'rojo' } {
  if (dias < 30) return { color: '#7AAB8E', bg: 'rgba(122,171,142,0.12)', nivel: 'verde' }
  if (dias < 60) return { color: '#B89870', bg: 'rgba(184,152,112,0.12)', nivel: 'amarillo' }
  return { color: '#C07070', bg: 'rgba(192,112,112,0.12)', nivel: 'rojo' }
}
```

---

## File Map

| File | Action | Notes |
|------|--------|-------|
| `src/types/index.ts` | Modify | Add GastoHistorial, VentaHistorial |
| `src/lib/utils.ts` | Modify | Add diasEnLote, alertaLote |
| `src/components/ios/BackHeader.tsx` | Create | New shared component |
| `src/components/ios/TabBar.tsx` | Modify | Hide on SUB_ROUTES |
| `src/App.tsx` | Modify | Add 3 new routes |
| `src/pages/Gastos/HistorialGastos.tsx` | Create | localStorage CRUD |
| `src/pages/Gastos/Reparaciones.tsx` | Create | Supabase, tipo/marca toggle |
| `src/pages/Reportes/HistorialGanancias.tsx` | Create | localStorage CRUD + sparkline |
| `src/pages/Dashboard/index.tsx` | Modify | Autos sin vender widget |
| `src/pages/Inventario/VehiculoCard.tsx` | Modify | Días en lote badge |
| `src/pages/Gastos/index.tsx` | Modify | Add Reparaciones + Historial buttons |
| `src/pages/Reportes/index.tsx` | Modify | Add Proyección + Análisis por marca + Historial button |

---

## Design Constraints

- All new UI follows the Mastercard-inspired design system: cream `#F3F0EE` background, ink `#141413` text, radius 20px (buttons) / 40px (hero cards) / 999px (pills)
- No new color palette — reuse existing `catConfig` colors and the semaphore colors above
- Bottom sheets for add forms (same pattern as `AddGastoSheet` in Gastos)
- Loading states: skeleton divs with `animation: pulse` for lists
- Empty states: centered message with muted text
- All monetary values formatted with `Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD' })`
- Dates displayed with `toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })`
