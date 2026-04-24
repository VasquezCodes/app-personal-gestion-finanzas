# New Screens & Dashboard Enhancements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three new sub-screens (HistorialGastos, HistorialGanancias, ReparacionesScreen) and enhance Dashboard, Inventario, and Reportes with días en lote widget/badge, proyección mensual, and análisis por marca.

**Architecture:** Sub-screens use React Router v6 routes (`/gastos/historial`, `/gastos/reparaciones`, `/reportes/historial`); the TabBar hides on these routes via `useLocation`; a shared `BackHeader` component provides navigation back. HistorialGastos and HistorialGanancias persist in localStorage; ReparacionesScreen queries Supabase; Dashboard/Inventario/Reportes enhancements derive data from existing Zustand store.

**Tech Stack:** React 18 + TypeScript + Vite, React Router v6, Zustand, Supabase, Framer Motion (existing), inline styles matching design system (cream `#F3F0EE`, ink `#141413`, radius-999 pills, radius-40 hero cards)

---

## File Map

| File | Action |
|------|--------|
| `src/types/index.ts` | Modify — add GastoHistorial, VentaHistorial |
| `src/lib/utils.ts` | Modify — add diasEnLote, alertaLote |
| `src/components/ios/BackHeader.tsx` | Create |
| `src/components/ios/TabBar.tsx` | Modify — hide on sub-routes |
| `src/App.tsx` | Modify — add 3 routes |
| `src/pages/Gastos/HistorialGastos.tsx` | Create |
| `src/pages/Reportes/HistorialGanancias.tsx` | Create |
| `src/pages/Gastos/Reparaciones.tsx` | Create |
| `src/pages/Gastos/index.tsx` | Modify — add 2 nav buttons |
| `src/pages/Reportes/index.tsx` | Modify — add Historial button + Proyección section + Análisis por marca section |
| `src/pages/Dashboard/index.tsx` | Modify — add "Autos sin vender" widget |
| `src/pages/Inventario/VehiculoCard.tsx` | Modify — add días en lote badge |

---

## Task 1: Foundation — Types and Utilities

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/lib/utils.ts`

- [ ] **Step 1: Add new types to `src/types/index.ts`**

Append to the end of the file (after the last export):

```typescript
// ---- HISTORIAL LOCAL ----

export interface GastoHistorial {
  id: string
  descripcion: string
  monto: number
  categoria: 'alquiler' | 'servicios' | 'marketing' | 'personal' | 'otro'
  fecha: string  // ISO date YYYY-MM-DD
}

export interface VentaHistorial {
  id: string
  marca: string
  modelo: string
  anio: number
  ganancia: number
  roi: number    // percentage e.g. 18.5
  dias: number   // días en lote
  fecha: string  // fecha de venta, ISO date YYYY-MM-DD
}
```

- [ ] **Step 2: Add diasEnLote and alertaLote to `src/lib/utils.ts`**

Append to the end of `src/lib/utils.ts`:

```typescript
// ---- DÍAS EN LOTE ----

/**
 * Días transcurridos desde fecha_compra hasta hoy
 */
export function diasEnLote(fechaCompra: string): number {
  return Math.floor((Date.now() - new Date(fechaCompra + 'T00:00:00').getTime()) / 86_400_000)
}

/**
 * Nivel de alerta semáforo para días en lote
 */
export function alertaLote(dias: number): {
  color: string
  bg: string
  nivel: 'verde' | 'amarillo' | 'rojo'
} {
  if (dias < 30) return { color: '#7AAB8E', bg: 'rgba(122,171,142,0.12)', nivel: 'verde' }
  if (dias < 60) return { color: '#B89870', bg: 'rgba(184,152,112,0.12)', nivel: 'amarillo' }
  return { color: '#C07070', bg: 'rgba(192,112,112,0.12)', nivel: 'rojo' }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npm run build`
Expected: exits 0 with no TS errors

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/lib/utils.ts
git commit -m "feat: add GastoHistorial, VentaHistorial types and diasEnLote/alertaLote utils"
```

---

## Task 2: Navigation Shell — BackHeader + TabBar + App Routes

**Files:**
- Create: `src/components/ios/BackHeader.tsx`
- Modify: `src/components/ios/TabBar.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create `src/components/ios/BackHeader.tsx`**

```typescript
import { type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

interface BackHeaderProps {
  title: string
  onBack?: () => void
  action?: ReactNode
}

export function BackHeader({ title, onBack, action }: BackHeaderProps) {
  const navigate = useNavigate()
  const handleBack = onBack ?? (() => navigate(-1))

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: 'calc(env(safe-area-inset-top) + 12px) 22px 14px',
      gap: 12,
      background: 'transparent',
    }}>
      <button
        onClick={handleBack}
        style={{
          width: 40, height: 40, borderRadius: 14, border: 'none', cursor: 'pointer',
          background: 'rgba(20,20,19,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
          <path d="M15 18l-6-6 6-6" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div style={{
        flex: 1,
        fontSize: 18, fontWeight: 800, color: 'var(--ink)',
        letterSpacing: '-0.5px', fontFamily: 'var(--font)',
      }}>
        {title}
      </div>

      {action && (
        <div style={{ flexShrink: 0 }}>
          {action}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Modify `src/components/ios/TabBar.tsx` to hide on sub-routes**

Open `src/components/ios/TabBar.tsx`. The file currently starts with:
```typescript
import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
```

Change those two lines to:
```typescript
import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'

const SUB_ROUTES = ['/gastos/historial', '/gastos/reparaciones', '/reportes/historial']
```

Then find the `export function TabBar()` line and change its opening to add the hide logic:

Find:
```typescript
export function TabBar() {
  return (
```

Replace with:
```typescript
export function TabBar() {
  const { pathname } = useLocation()
  if (SUB_ROUTES.some((r) => pathname.startsWith(r))) return null

  return (
```

- [ ] **Step 3: Add 3 new routes to `src/App.tsx`**

Open `src/App.tsx`. Add imports after the existing page imports (after `import Configuracion from './pages/Configuracion'`):

```typescript
import HistorialGastos from './pages/Gastos/HistorialGastos'
import HistorialGanancias from './pages/Reportes/HistorialGanancias'
import ReparacionesGastos from './pages/Gastos/Reparaciones'
```

Then find inside `AppLayout` the Routes section. After the existing `/gastos` route line:
```tsx
<Route path="/gastos" element={<Gastos />} />
```

Add immediately after it:
```tsx
<Route path="/gastos/historial" element={<HistorialGastos />} />
<Route path="/gastos/reparaciones" element={<ReparacionesGastos />} />
<Route path="/reportes/historial" element={<HistorialGanancias />} />
```

- [ ] **Step 4: Verify build (the new screen files don't exist yet — expect import errors)**

Note: The build WILL fail because `HistorialGastos`, `HistorialGanancias`, and `ReparacionesGastos` don't exist yet. That's expected. Create stub files to unblock:

Create `src/pages/Gastos/HistorialGastos.tsx`:
```typescript
export default function HistorialGastos() {
  return <div>Historial Gastos — coming soon</div>
}
```

Create `src/pages/Reportes/HistorialGanancias.tsx`:
```typescript
export default function HistorialGanancias() {
  return <div>Historial Ganancias — coming soon</div>
}
```

Create `src/pages/Gastos/Reparaciones.tsx`:
```typescript
export default function ReparacionesGastos() {
  return <div>Reparaciones — coming soon</div>
}
```

Run: `npm run build`
Expected: exits 0

- [ ] **Step 5: Commit**

```bash
git add src/components/ios/BackHeader.tsx src/components/ios/TabBar.tsx src/App.tsx src/pages/Gastos/HistorialGastos.tsx src/pages/Reportes/HistorialGanancias.tsx src/pages/Gastos/Reparaciones.tsx
git commit -m "feat: add BackHeader component, sub-route TabBar hide, and 3 new routes"
```

---

## Task 3: HistorialGastos Screen

**Files:**
- Modify: `src/pages/Gastos/HistorialGastos.tsx` (replace stub)

The screen persists data in `localStorage` under key `motorhub_gastos_historial`. It groups entries by month, supports year filter, text search, add via bottom sheet, delete, and CSV export.

- [ ] **Step 1: Write complete `src/pages/Gastos/HistorialGastos.tsx`**

```typescript
import { useState, useEffect, useMemo } from 'react'
import { BackHeader } from '../../components/ios/BackHeader'
import type { GastoHistorial } from '../../types'

const LS_KEY = 'motorhub_gastos_historial'

type CatKey = GastoHistorial['categoria']

const catConfig: Record<CatKey, { label: string; color: string; bg: string }> = {
  alquiler:  { label: 'Alquiler',  color: '#7A96B8', bg: 'rgba(122,150,184,0.12)' },
  servicios: { label: 'Servicios', color: '#7AAB8E', bg: 'rgba(122,171,142,0.12)' },
  marketing: { label: 'Marketing', color: '#B89870', bg: 'rgba(184,152,112,0.12)' },
  personal:  { label: 'Personal',  color: '#A88AB8', bg: 'rgba(168,138,184,0.12)' },
  otro:      { label: 'Otro',      color: '#9A9590', bg: 'rgba(154,149,144,0.12)' },
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

function loadGastos(): GastoHistorial[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') } catch { return [] }
}
function saveGastos(data: GastoHistorial[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(data))
}

export default function HistorialGastos() {
  const [gastos, setGastos] = useState<GastoHistorial[]>(() => loadGastos())
  const [anioFiltro, setAnioFiltro] = useState<string>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)

  const anios = useMemo(() => {
    const set = new Set(gastos.map((g) => g.fecha.slice(0, 4)))
    return Array.from(set).sort((a, b) => b.localeCompare(a))
  }, [gastos])

  const filtrados = useMemo(() => {
    return gastos
      .filter((g) => anioFiltro === 'todos' || g.fecha.startsWith(anioFiltro))
      .filter((g) => !busqueda || g.descripcion.toLowerCase().includes(busqueda.toLowerCase()))
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
  }, [gastos, anioFiltro, busqueda])

  const porMes = useMemo(() => {
    const map = new Map<string, GastoHistorial[]>()
    filtrados.forEach((g) => {
      const key = g.fecha.slice(0, 7)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(g)
    })
    return Array.from(map.entries()).map(([key, items]) => {
      const [y, m] = key.split('-').map(Number)
      const label = new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
        .replace(/^\w/, (c) => c.toUpperCase())
      const total = items.reduce((s, g) => s + g.monto, 0)
      return { key, label, items, total }
    })
  }, [filtrados])

  const totalGeneral = filtrados.reduce((s, g) => s + g.monto, 0)

  function handleDelete(id: string) {
    const next = gastos.filter((g) => g.id !== id)
    setGastos(next)
    saveGastos(next)
  }

  function handleAdd(g: GastoHistorial) {
    const next = [g, ...gastos]
    setGastos(next)
    saveGastos(next)
    setSheetOpen(false)
  }

  function handleExport() {
    const rows = [
      ['ID', 'Descripcion', 'Monto', 'Categoria', 'Fecha'],
      ...filtrados.map((g) => [g.id, `"${g.descripcion}"`, g.monto, g.categoria, g.fecha]),
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'historial_gastos.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const actionButtons = (
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={handleExport} style={iconBtnStyle('#7A96B8')}>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
            stroke="#7A96B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <button onClick={() => setSheetOpen(true)} style={iconBtnStyle('var(--ink)')}>
        <svg width="17" height="17" fill="none" viewBox="0 0 24 24">
          <path d="M12 5v14M5 12h14" stroke="#F3F0EE" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  )

  return (
    <div style={{ height: '100svh', position: 'relative', overflow: 'hidden' }}>
      <div className="scrollable" style={{
        height: '100%',
        background: 'radial-gradient(ellipse 120% 60% at 60% 0%, #EDE8E0 0%, #F3F0EE 55%, #F7F4F0 100%)',
        paddingBottom: 40,
      }}>
        <BackHeader title="Historial de Gastos" action={actionButtons} />

        {/* Hero */}
        <div style={{ padding: '0 22px 0' }}>
          <div style={{
            background: 'var(--surface-deep)', borderRadius: 28,
            padding: '20px 20px', boxShadow: '0 4px 24px rgba(20,20,19,0.14)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(243,240,238,0.4)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 }}>
              Total acumulado
            </div>
            <div style={{ fontSize: 42, fontWeight: 900, color: '#F3F0EE', letterSpacing: '-2px', lineHeight: 1 }}>
              {fmt(totalGeneral)}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(243,240,238,0.4)', marginTop: 6 }}>
              {filtrados.length} movimientos
            </div>
          </div>
        </div>

        {/* Año filter */}
        {anios.length > 0 && (
          <div style={{ padding: '12px 22px 0', display: 'flex', gap: 8, overflowX: 'auto' }} className="scrollbar-none">
            {['todos', ...anios].map((a) => (
              <button key={a} onClick={() => setAnioFiltro(a)} style={{
                padding: '7px 14px', borderRadius: 999, border: 'none', cursor: 'pointer', flexShrink: 0,
                background: anioFiltro === a ? 'var(--ink)' : 'rgba(20,20,19,0.07)',
                color: anioFiltro === a ? '#F3F0EE' : 'var(--ink2)',
                fontSize: 12, fontWeight: 700, fontFamily: 'var(--font)',
              }}>{a === 'todos' ? 'Todos' : a}</button>
            ))}
          </div>
        )}

        {/* Search */}
        <div style={{ padding: '10px 22px 0' }}>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por descripción…"
            style={{
              width: '100%', height: 42, borderRadius: 14,
              border: '1.5px solid rgba(20,20,19,0.10)',
              background: 'rgba(255,255,255,0.8)',
              padding: '0 14px', fontSize: 14, fontFamily: 'var(--font)',
              color: 'var(--ink)', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* List grouped by month */}
        <div style={{ padding: '12px 22px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {porMes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>
              {gastos.length === 0 ? 'Sin gastos registrados' : 'Sin resultados para esta búsqueda'}
            </div>
          ) : (
            porMes.map(({ key, label, items, total }) => (
              <div key={key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)' }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#C07070' }}>{fmt(total)}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.map((g) => {
                    const c = catConfig[g.categoria]
                    const fecha = new Date(g.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
                    return (
                      <div key={g.id} style={{
                        background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)', borderRadius: 18, padding: '13px 16px',
                        display: 'flex', alignItems: 'center', gap: 13,
                        boxShadow: '0 1px 8px rgba(20,20,19,0.04)',
                        border: '0.5px solid rgba(20,20,19,0.06)',
                      }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 13, flexShrink: 0,
                          background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.color }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {g.descripcion}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{fecha} · {c.label}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#C07070' }}>−{fmt(g.monto)}</div>
                          <button
                            onClick={() => handleDelete(g.id)}
                            style={{
                              width: 30, height: 30, borderRadius: 10, border: 'none', cursor: 'pointer',
                              background: 'rgba(192,112,112,0.10)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
                                stroke="#C07070" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {sheetOpen && (
        <AddGastoHistorialSheet onClose={() => setSheetOpen(false)} onSaved={handleAdd} />
      )}
    </div>
  )
}

function iconBtnStyle(bg: string): React.CSSProperties {
  return {
    width: 40, height: 40, borderRadius: 14, border: 'none', cursor: 'pointer',
    background: bg === 'var(--ink)' ? 'var(--ink)' : 'rgba(20,20,19,0.07)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: bg === 'var(--ink)' ? '0 4px 14px rgba(20,20,19,0.18)' : 'none',
  }
}

function AddGastoHistorialSheet({
  onClose, onSaved,
}: { onClose: () => void; onSaved: (g: GastoHistorial) => void }) {
  const [desc, setDesc] = useState('')
  const [monto, setMonto] = useState('')
  const [cat, setCat] = useState<CatKey>('otro')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))

  function handleSave() {
    if (!desc || !monto) return
    onSaved({
      id: crypto.randomUUID(),
      descripcion: desc,
      monto: parseFloat(monto),
      categoria: cat,
      fecha,
    })
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(20,20,19,0.4)', backdropFilter: 'blur(4px)', zIndex: 60 }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'var(--cream)', borderRadius: '28px 28px 0 0',
        zIndex: 70, paddingBottom: 34,
        boxShadow: '0 -8px 40px rgba(20,20,19,0.18)',
        animation: 'slideUp .3s cubic-bezier(.2,.8,.3,1)',
      }}>
        <style>{`@keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(20,20,19,0.18)' }} />
        </div>
        <div style={{ padding: '12px 22px 0' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.5px', marginBottom: 20 }}>Nuevo gasto</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descripción"
              style={inputStyle} />
            <input value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="Monto (USD)" type="number"
              style={inputStyle} />
            <select value={cat} onChange={(e) => setCat(e.target.value as CatKey)} style={inputStyle}>
              {(Object.entries(catConfig) as [CatKey, typeof catConfig[CatKey]][]).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <input value={fecha} onChange={(e) => setFecha(e.target.value)} type="date" style={inputStyle} />
            <button onClick={handleSave} disabled={!desc || !monto}
              style={{
                width: '100%', height: 50, borderRadius: 999, border: 'none', cursor: 'pointer',
                background: !desc || !monto ? 'rgba(20,20,19,0.15)' : 'var(--ink)',
                color: !desc || !monto ? 'var(--muted)' : '#F3F0EE',
                fontSize: 15, fontWeight: 700, fontFamily: 'var(--font)',
              }}>
              Guardar gasto
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 46, borderRadius: 14,
  border: '1.5px solid rgba(20,20,19,0.12)',
  background: 'rgba(255,255,255,0.8)',
  padding: '0 16px', fontSize: 14, fontFamily: 'var(--font)',
  color: 'var(--ink)', outline: 'none', boxSizing: 'border-box',
}
```

- [ ] **Step 2: Build and verify**

Run: `npm run build`
Expected: exits 0 with no TS errors

- [ ] **Step 3: Commit**

```bash
git add src/pages/Gastos/HistorialGastos.tsx
git commit -m "feat: add HistorialGastos screen with localStorage persistence, CSV export, and add/delete"
```

---

## Task 4: HistorialGanancias Screen

**Files:**
- Modify: `src/pages/Reportes/HistorialGanancias.tsx` (replace stub)

The screen persists data in `localStorage` under key `motorhub_ganancias_historial`. It includes a sparkline hero, year filter, search, grouped list, add/delete, CSV export.

- [ ] **Step 1: Write complete `src/pages/Reportes/HistorialGanancias.tsx`**

```typescript
import { useState, useMemo } from 'react'
import { BackHeader } from '../../components/ios/BackHeader'
import type { VentaHistorial } from '../../types'

const LS_KEY = 'motorhub_ganancias_historial'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

function loadVentas(): VentaHistorial[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') } catch { return [] }
}
function saveVentas(data: VentaHistorial[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(data))
}

function Sparkline({ ventas }: { ventas: VentaHistorial[] }) {
  const now = new Date()
  const meses = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const total = ventas.filter((v) => v.fecha.startsWith(key)).reduce((s, v) => s + v.ganancia, 0)
    return total
  })
  const max = Math.max(...meses, 1)
  const W = 120, H = 32
  const pts = meses.map((v, i) => `${(i / 5) * W},${H - (v / max) * H}`)
  return (
    <svg width={W} height={H} style={{ overflow: 'visible' }}>
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke="rgba(243,240,238,0.6)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {meses.map((v, i) => (
        <circle
          key={i}
          cx={(i / 5) * W}
          cy={H - (v / max) * H}
          r="2.5"
          fill={v > 0 ? 'rgba(243,240,238,0.8)' : 'rgba(243,240,238,0.2)'}
        />
      ))}
    </svg>
  )
}

export default function HistorialGanancias() {
  const [ventas, setVentas] = useState<VentaHistorial[]>(() => loadVentas())
  const [anioFiltro, setAnioFiltro] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)

  const anios = useMemo(() => {
    const set = new Set(ventas.map((v) => v.fecha.slice(0, 4)))
    return Array.from(set).sort((a, b) => b.localeCompare(a))
  }, [ventas])

  const filtradas = useMemo(() =>
    ventas
      .filter((v) => anioFiltro === 'todos' || v.fecha.startsWith(anioFiltro))
      .filter((v) => !busqueda || `${v.marca} ${v.modelo}`.toLowerCase().includes(busqueda.toLowerCase()))
      .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [ventas, anioFiltro, busqueda]
  )

  const porMes = useMemo(() => {
    const map = new Map<string, VentaHistorial[]>()
    filtradas.forEach((v) => {
      const key = v.fecha.slice(0, 7)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(v)
    })
    return Array.from(map.entries()).map(([key, items]) => {
      const [y, m] = key.split('-').map(Number)
      const label = new Date(y, m - 1, 1)
        .toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
        .replace(/^\w/, (c) => c.toUpperCase())
      const totalGanancia = items.reduce((s, v) => s + v.ganancia, 0)
      const roiProm = items.length > 0 ? items.reduce((s, v) => s + v.roi, 0) / items.length : 0
      return { key, label, items, totalGanancia, roiProm }
    })
  }, [filtradas])

  const totalGeneral = filtradas.reduce((s, v) => s + v.ganancia, 0)
  const roiGlobal = filtradas.length > 0 ? filtradas.reduce((s, v) => s + v.roi, 0) / filtradas.length : 0

  function handleDelete(id: string) {
    const next = ventas.filter((v) => v.id !== id)
    setVentas(next)
    saveVentas(next)
  }

  function handleAdd(v: VentaHistorial) {
    const next = [v, ...ventas]
    setVentas(next)
    saveVentas(next)
    setSheetOpen(false)
  }

  function handleExport() {
    const rows = [
      ['ID', 'Marca', 'Modelo', 'Anio', 'Ganancia', 'ROI', 'Dias', 'Fecha'],
      ...filtradas.map((v) => [v.id, v.marca, v.modelo, v.anio, v.ganancia, v.roi, v.dias, v.fecha]),
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'historial_ganancias.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const actionButtons = (
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={handleExport} style={iconBtn}>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
            stroke="var(--ink2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <button onClick={() => setSheetOpen(true)} style={{ ...iconBtn, background: 'var(--ink)', boxShadow: '0 4px 14px rgba(20,20,19,0.18)' }}>
        <svg width="17" height="17" fill="none" viewBox="0 0 24 24">
          <path d="M12 5v14M5 12h14" stroke="#F3F0EE" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  )

  return (
    <div style={{ height: '100svh', position: 'relative', overflow: 'hidden' }}>
      <div className="scrollable" style={{
        height: '100%',
        background: 'radial-gradient(ellipse 120% 60% at 60% 0%, #EDE8E0 0%, #F3F0EE 55%, #F7F4F0 100%)',
        paddingBottom: 40,
      }}>
        <BackHeader title="Historial de Ganancias" action={actionButtons} />

        {/* Hero */}
        <div style={{ padding: '0 22px 0' }}>
          <div style={{
            background: 'var(--surface-deep)', borderRadius: 28,
            padding: '20px 20px', boxShadow: '0 4px 24px rgba(20,20,19,0.14)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(243,240,238,0.4)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 }}>
                  Ganancia acumulada
                </div>
                <div style={{ fontSize: 42, fontWeight: 900, color: '#F3F0EE', letterSpacing: '-2px', lineHeight: 1 }}>
                  {fmt(totalGeneral)}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(243,240,238,0.4)', marginTop: 6 }}>
                  ROI prom. {roiGlobal.toFixed(1)}% · {filtradas.length} ventas
                </div>
              </div>
              <div style={{ paddingTop: 6 }}>
                <Sparkline ventas={ventas} />
              </div>
            </div>
          </div>
        </div>

        {/* Year filter */}
        {anios.length > 0 && (
          <div style={{ padding: '12px 22px 0', display: 'flex', gap: 8, overflowX: 'auto' }} className="scrollbar-none">
            {['todos', ...anios].map((a) => (
              <button key={a} onClick={() => setAnioFiltro(a)} style={{
                padding: '7px 14px', borderRadius: 999, border: 'none', cursor: 'pointer', flexShrink: 0,
                background: anioFiltro === a ? 'var(--ink)' : 'rgba(20,20,19,0.07)',
                color: anioFiltro === a ? '#F3F0EE' : 'var(--ink2)',
                fontSize: 12, fontWeight: 700, fontFamily: 'var(--font)',
              }}>{a === 'todos' ? 'Todos' : a}</button>
            ))}
          </div>
        )}

        {/* Search */}
        <div style={{ padding: '10px 22px 0' }}>
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por marca o modelo…"
            style={{
              width: '100%', height: 42, borderRadius: 14,
              border: '1.5px solid rgba(20,20,19,0.10)',
              background: 'rgba(255,255,255,0.8)',
              padding: '0 14px', fontSize: 14, fontFamily: 'var(--font)',
              color: 'var(--ink)', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Grouped list */}
        <div style={{ padding: '12px 22px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {porMes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>
              {ventas.length === 0 ? 'Sin ventas registradas' : 'Sin resultados'}
            </div>
          ) : (
            porMes.map(({ key, label, items, totalGanancia, roiProm }) => (
              <div key={key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)' }}>{label}</div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>ROI {roiProm.toFixed(1)}%</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#7AAB8E' }}>{fmt(totalGanancia)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.map((v) => {
                    const fecha = new Date(v.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
                    return (
                      <div key={v.id} style={{
                        background: 'rgba(255,255,255,0.82)', borderRadius: 18, padding: '13px 16px',
                        display: 'flex', alignItems: 'center', gap: 13,
                        boxShadow: '0 1px 8px rgba(20,20,19,0.04)',
                        border: '0.5px solid rgba(20,20,19,0.06)',
                      }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 13, flexShrink: 0,
                          background: 'rgba(122,171,142,0.12)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 800, color: '#7AAB8E',
                        }}>
                          {v.marca.slice(0, 2).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {v.marca} {v.modelo} {v.anio}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                            {fecha} · {v.dias}d en lote
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: '#7AAB8E' }}>+{fmt(v.ganancia)}</div>
                            <div style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'right' }}>ROI {v.roi.toFixed(1)}%</div>
                          </div>
                          <button onClick={() => handleDelete(v.id)} style={{
                            width: 30, height: 30, borderRadius: 10, border: 'none', cursor: 'pointer',
                            background: 'rgba(192,112,112,0.10)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
                                stroke="#C07070" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {sheetOpen && (
        <AddVentaSheet onClose={() => setSheetOpen(false)} onSaved={handleAdd} />
      )}
    </div>
  )
}

const iconBtn: React.CSSProperties = {
  width: 40, height: 40, borderRadius: 14, border: 'none', cursor: 'pointer',
  background: 'rgba(20,20,19,0.07)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

function AddVentaSheet({ onClose, onSaved }: { onClose: () => void; onSaved: (v: VentaHistorial) => void }) {
  const [marca, setMarca] = useState('')
  const [modelo, setModelo] = useState('')
  const [anio, setAnio] = useState(String(new Date().getFullYear()))
  const [ganancia, setGanancia] = useState('')
  const [roi, setRoi] = useState('')
  const [dias, setDias] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))

  const valid = marca && modelo && ganancia && roi && dias

  function handleSave() {
    if (!valid) return
    onSaved({
      id: crypto.randomUUID(),
      marca, modelo,
      anio: parseInt(anio),
      ganancia: parseFloat(ganancia),
      roi: parseFloat(roi),
      dias: parseInt(dias),
      fecha,
    })
  }

  const inp: React.CSSProperties = {
    width: '100%', height: 46, borderRadius: 14,
    border: '1.5px solid rgba(20,20,19,0.12)',
    background: 'rgba(255,255,255,0.8)',
    padding: '0 16px', fontSize: 14, fontFamily: 'var(--font)',
    color: 'var(--ink)', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(20,20,19,0.4)', backdropFilter: 'blur(4px)', zIndex: 60 }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'var(--cream)', borderRadius: '28px 28px 0 0',
        zIndex: 70, paddingBottom: 34,
        boxShadow: '0 -8px 40px rgba(20,20,19,0.18)',
        animation: 'slideUp .3s cubic-bezier(.2,.8,.3,1)',
      }}>
        <style>{`@keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(20,20,19,0.18)' }} />
        </div>
        <div style={{ padding: '12px 22px 0' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.5px', marginBottom: 20 }}>Registrar venta</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <input value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Marca" style={inp} />
              <input value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="Modelo" style={inp} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input value={anio} onChange={(e) => setAnio(e.target.value)} placeholder="Año" type="number" style={inp} />
              <input value={dias} onChange={(e) => setDias(e.target.value)} placeholder="Días en lote" type="number" style={inp} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input value={ganancia} onChange={(e) => setGanancia(e.target.value)} placeholder="Ganancia ($)" type="number" style={inp} />
              <input value={roi} onChange={(e) => setRoi(e.target.value)} placeholder="ROI (%)" type="number" style={inp} />
            </div>
            <input value={fecha} onChange={(e) => setFecha(e.target.value)} type="date" style={inp} />
            <button onClick={handleSave} disabled={!valid}
              style={{
                width: '100%', height: 50, borderRadius: 999, border: 'none', cursor: 'pointer',
                background: !valid ? 'rgba(20,20,19,0.15)' : 'var(--ink)',
                color: !valid ? 'var(--muted)' : '#F3F0EE',
                fontSize: 15, fontWeight: 700, fontFamily: 'var(--font)',
              }}>
              Guardar venta
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Build and verify**

Run: `npm run build`
Expected: exits 0

- [ ] **Step 3: Commit**

```bash
git add src/pages/Reportes/HistorialGanancias.tsx
git commit -m "feat: add HistorialGanancias screen with sparkline, localStorage persistence, and CSV export"
```

---

## Task 5: ReparacionesScreen (Gastos sub-screen)

**Files:**
- Modify: `src/pages/Gastos/Reparaciones.tsx` (replace stub)

The screen queries Supabase for all reparaciones with vehicle brand info. Displays a por-tipo / por-marca toggle with expandable rows and a cross-breakdown.

Note: The `Reparacion` type already has `categoria: CategoriaReparacion` ('mecanica'|'carroceria'|'electricidad'|'interior'|'neumaticos'|'otro'). The Supabase join `vehiculos(marca)` returns `vehiculos: { marca: string }`.

- [ ] **Step 1: Write complete `src/pages/Gastos/Reparaciones.tsx`**

```typescript
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { BackHeader } from '../../components/ios/BackHeader'
import type { CategoriaReparacion } from '../../types'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const tipoConfig: Record<CategoriaReparacion, { label: string; color: string; bg: string }> = {
  mecanica:     { label: 'Mecánica',         color: '#7A96B8', bg: 'rgba(122,150,184,0.12)' },
  carroceria:   { label: 'Carrocería/Pintura',color: '#B89870', bg: 'rgba(184,152,112,0.12)' },
  electricidad: { label: 'Eléctrica',         color: '#E8D97A', bg: 'rgba(232,217,122,0.12)' },
  interior:     { label: 'Interior',          color: '#A88AB8', bg: 'rgba(168,138,184,0.12)' },
  neumaticos:   { label: 'Gomas',             color: '#7AAB8E', bg: 'rgba(122,171,142,0.12)' },
  otro:         { label: 'Otros',             color: '#9A9590', bg: 'rgba(154,149,144,0.12)' },
}

interface RepRow {
  id: string
  descripcion: string
  costo: number
  fecha: string
  vehiculo_id: string
  categoria: CategoriaReparacion
  vehiculos: { marca: string } | null
}

type Vista = 'tipo' | 'marca'

export default function ReparacionesGastos() {
  const [reps, setReps] = useState<RepRow[]>([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState<Vista>('tipo')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    supabase
      .from('reparaciones')
      .select('id, descripcion, costo, fecha, vehiculo_id, categoria, vehiculos(marca)')
      .order('fecha', { ascending: false })
      .then(({ data }) => {
        setReps((data as RepRow[]) ?? [])
        setLoading(false)
      })
  }, [])

  const totalGeneral = reps.reduce((s, r) => s + r.costo, 0)

  const porTipo = useMemo(() => {
    const map = new Map<CategoriaReparacion, RepRow[]>()
    reps.forEach((r) => {
      if (!map.has(r.categoria)) map.set(r.categoria, [])
      map.get(r.categoria)!.push(r)
    })
    return Array.from(map.entries())
      .map(([cat, items]) => ({
        cat,
        ...tipoConfig[cat],
        total: items.reduce((s, r) => s + r.costo, 0),
        items,
        breakdown: buildMarcaBreakdown(items),
      }))
      .sort((a, b) => b.total - a.total)
  }, [reps])

  const porMarca = useMemo(() => {
    const map = new Map<string, RepRow[]>()
    reps.forEach((r) => {
      const marca = r.vehiculos?.marca ?? 'Sin marca'
      if (!map.has(marca)) map.set(marca, [])
      map.get(marca)!.push(r)
    })
    return Array.from(map.entries())
      .map(([marca, items]) => ({
        marca,
        total: items.reduce((s, r) => s + r.costo, 0),
        items,
        breakdown: buildTipoBreakdown(items),
      }))
      .sort((a, b) => b.total - a.total)
  }, [reps])

  const maxTipo = Math.max(...porTipo.map((t) => t.total), 1)
  const maxMarca = Math.max(...porMarca.map((m) => m.total), 1)

  return (
    <div style={{ height: '100svh', position: 'relative', overflow: 'hidden' }}>
      <div className="scrollable" style={{
        height: '100%',
        background: 'radial-gradient(ellipse 120% 60% at 60% 0%, #EDE8E0 0%, #F3F0EE 55%, #F7F4F0 100%)',
        paddingBottom: 40,
      }}>
        <BackHeader title="Reparaciones" />

        {/* Hero */}
        <div style={{ padding: '0 22px 0' }}>
          <div style={{
            background: 'var(--surface-deep)', borderRadius: 28,
            padding: '20px 20px', boxShadow: '0 4px 24px rgba(20,20,19,0.14)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(243,240,238,0.4)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 }}>
              Total invertido en reparaciones
            </div>
            <div style={{ fontSize: 42, fontWeight: 900, color: '#F3F0EE', letterSpacing: '-2px', lineHeight: 1 }}>
              {loading ? '—' : fmt(totalGeneral)}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(243,240,238,0.4)', marginTop: 6 }}>
              {reps.length} reparaciones registradas
            </div>
            {/* Mini bars */}
            {!loading && porTipo.length > 0 && (
              <div style={{ marginTop: 14, display: 'flex', gap: 3, alignItems: 'flex-end', height: 24 }}>
                {porTipo.map((t) => (
                  <div key={t.cat} style={{
                    flex: t.total, height: Math.max(6, Math.round((t.total / totalGeneral) * 24)),
                    borderRadius: 3, background: t.color, opacity: 0.7,
                  }} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Toggle */}
        <div style={{ padding: '14px 22px 0', display: 'flex', gap: 8 }}>
          {(['tipo', 'marca'] as Vista[]).map((v) => (
            <button key={v} onClick={() => { setVista(v); setExpanded(null) }} style={{
              padding: '8px 20px', borderRadius: 999, border: 'none', cursor: 'pointer',
              background: vista === v ? 'var(--ink)' : 'rgba(20,20,19,0.07)',
              color: vista === v ? '#F3F0EE' : 'var(--ink2)',
              fontSize: 13, fontWeight: 700, fontFamily: 'var(--font)',
            }}>
              {v === 'tipo' ? 'Por tipo' : 'Por marca'}
            </button>
          ))}
        </div>

        {/* List */}
        <div style={{ padding: '12px 22px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} style={{ height: 64, borderRadius: 18, background: 'rgba(20,20,19,0.07)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))
          ) : vista === 'tipo' ? (
            porTipo.map((t) => (
              <TipoRow
                key={t.cat}
                label={t.label}
                color={t.color}
                bg={t.bg}
                total={t.total}
                pct={Math.round((t.total / maxTipo) * 100)}
                breakdown={t.breakdown}
                isOpen={expanded === t.cat}
                onToggle={() => setExpanded(expanded === t.cat ? null : t.cat)}
              />
            ))
          ) : (
            porMarca.map((m) => (
              <MarcaRow
                key={m.marca}
                marca={m.marca}
                total={m.total}
                pct={Math.round((m.total / maxMarca) * 100)}
                breakdown={m.breakdown}
                isOpen={expanded === m.marca}
                onToggle={() => setExpanded(expanded === m.marca ? null : m.marca)}
              />
            ))
          )}
          {!loading && reps.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>
              Sin reparaciones registradas
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function buildMarcaBreakdown(items: RepRow[]) {
  const map = new Map<string, number>()
  items.forEach((r) => {
    const marca = r.vehiculos?.marca ?? 'Sin marca'
    map.set(marca, (map.get(marca) ?? 0) + r.costo)
  })
  return Array.from(map.entries()).map(([marca, total]) => ({ label: marca, total })).sort((a, b) => b.total - a.total)
}

function buildTipoBreakdown(items: RepRow[]) {
  const map = new Map<CategoriaReparacion, number>()
  items.forEach((r) => { map.set(r.categoria, (map.get(r.categoria) ?? 0) + r.costo) })
  return Array.from(map.entries()).map(([cat, total]) => ({ label: tipoConfig[cat].label, total, color: tipoConfig[cat].color })).sort((a, b) => b.total - a.total)
}

function TipoRow({ label, color, bg, total, pct, breakdown, isOpen, onToggle }: {
  label: string; color: string; bg: string; total: number; pct: number
  breakdown: { label: string; total: number }[]
  isOpen: boolean; onToggle: () => void
}) {
  const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
  return (
    <div style={{ background: 'rgba(255,255,255,0.82)', borderRadius: 18, overflow: 'hidden', boxShadow: '0 1px 8px rgba(20,20,19,0.04)', border: '0.5px solid rgba(20,20,19,0.06)' }}>
      <button onClick={onToggle} style={{
        width: '100%', background: 'none', border: 'none', cursor: 'pointer',
        padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{ width: 36, height: 36, borderRadius: 11, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
        </div>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{label}</div>
          <div style={{ height: 4, background: 'rgba(20,20,19,0.06)', borderRadius: 999, marginTop: 5, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999 }} />
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>{fmt(total)}</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{pct}%</div>
        </div>
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s', opacity: 0.4, flexShrink: 0 }}>
          <path d="M6 9l6 6 6-6" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {isOpen && breakdown.length > 0 && (
        <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ height: 1, background: 'rgba(20,20,19,0.06)', marginBottom: 4 }} />
          {breakdown.map((b) => (
            <div key={b.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--ink2)', fontWeight: 600 }}>{b.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{fmt(b.total)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MarcaRow({ marca, total, pct, breakdown, isOpen, onToggle }: {
  marca: string; total: number; pct: number
  breakdown: { label: string; total: number; color: string }[]
  isOpen: boolean; onToggle: () => void
}) {
  const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
  const initial = marca.slice(0, 2).toUpperCase()
  return (
    <div style={{ background: 'rgba(255,255,255,0.82)', borderRadius: 18, overflow: 'hidden', boxShadow: '0 1px 8px rgba(20,20,19,0.04)', border: '0.5px solid rgba(20,20,19,0.06)' }}>
      <button onClick={onToggle} style={{
        width: '100%', background: 'none', border: 'none', cursor: 'pointer',
        padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(20,20,19,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 800, color: 'var(--ink)' }}>
          {initial}
        </div>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{marca}</div>
          <div style={{ height: 4, background: 'rgba(20,20,19,0.06)', borderRadius: 999, marginTop: 5, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--ink)', opacity: 0.4, borderRadius: 999 }} />
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>{fmt(total)}</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{pct}%</div>
        </div>
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s', opacity: 0.4, flexShrink: 0 }}>
          <path d="M6 9l6 6 6-6" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {isOpen && breakdown.length > 0 && (
        <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ height: 1, background: 'rgba(20,20,19,0.06)', marginBottom: 4 }} />
          {breakdown.map((b) => (
            <div key={b.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: b.color }} />
                <span style={{ fontSize: 12, color: 'var(--ink2)', fontWeight: 600 }}>{b.label}</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{fmt(b.total)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Build and verify**

Run: `npm run build`
Expected: exits 0

- [ ] **Step 3: Commit**

```bash
git add src/pages/Gastos/Reparaciones.tsx
git commit -m "feat: add ReparacionesScreen with Supabase data, tipo/marca toggle, and expandable rows"
```

---

## Task 6: Page Entry Points — Gastos + Reportes Buttons

**Files:**
- Modify: `src/pages/Gastos/index.tsx`
- Modify: `src/pages/Reportes/index.tsx`

### Gastos page

- [ ] **Step 1: Add `useNavigate` import to `src/pages/Gastos/index.tsx`**

Find at the top of `src/pages/Gastos/index.tsx`:
```typescript
import { useState, useEffect, useRef } from 'react'
```

Replace with:
```typescript
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
```

- [ ] **Step 2: Add `navigate` inside the Gastos component**

Find in `src/pages/Gastos/index.tsx` inside `export default function Gastos()`:
```typescript
  const listRef = useRef<HTMLDivElement>(null)
```

Add the navigate hook before it:
```typescript
  const navigate = useNavigate()
  const listRef = useRef<HTMLDivElement>(null)
```

- [ ] **Step 3: Add quick-access buttons in Gastos page JSX**

In `src/pages/Gastos/index.tsx`, find the period selector section (just after the `useStaggerIn` area and before `/* Total KPI */`). Specifically find the JSX block:
```tsx
          {/* Período selector */}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
```

After the closing `</div>` of the period selector div (there's only one `</div>` that closes the pill container), add a new div with the two quick-access buttons. The period selector block ends with:
```tsx
            ))}
          </div>
```

Right after that closing `</div>` (still inside the outer `<div style={{ padding: 'calc(...) ...' }}>`) add:
```tsx
          {/* Quick access */}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={() => navigate('/gastos/reparaciones')} style={{
              flex: 1, height: 36, borderRadius: 999, border: 'none', cursor: 'pointer',
              background: 'rgba(20,20,19,0.07)',
              color: 'var(--ink2)', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font)',
            }}>
              🔧 Reparaciones
            </button>
            <button onClick={() => navigate('/gastos/historial')} style={{
              flex: 1, height: 36, borderRadius: 999, border: 'none', cursor: 'pointer',
              background: 'rgba(20,20,19,0.07)',
              color: 'var(--ink2)', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font)',
            }}>
              📋 Historial
            </button>
          </div>
```

### Reportes page

- [ ] **Step 4: Add `useNavigate` import to `src/pages/Reportes/index.tsx`**

Find at the top of `src/pages/Reportes/index.tsx`:
```typescript
import { useEffect, useMemo, useRef, useState } from 'react'
```

Replace with:
```typescript
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
```

- [ ] **Step 5: Add `navigate` hook in Reportes component**

Inside `export default function Reportes()`, find the first `const` declaration and add before it:
```typescript
  const navigate = useNavigate()
```

- [ ] **Step 6: Add Historial button in Reportes header**

In `src/pages/Reportes/index.tsx`, find the existing Export button:
```tsx
            <button
              onClick={handleExport}
              style={{
                height: 40, padding: '0 16px', borderRadius: 14,
```

Replace the header button row `<div style={{ display: 'flex', gap: 10 }}>` area. Find the full div that wraps the export button (it's a single button). The export button is currently alone. Add a second button next to it. Find:

```tsx
            <button
              onClick={handleExport}
              style={{
                height: 40, padding: '0 16px', borderRadius: 14,
                background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(20,20,19,0.18)',
              }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="#F3F0EE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#F3F0EE', fontFamily: 'var(--font)' }}>Exportar</span>
            </button>
```

Replace with:
```tsx
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => navigate('/reportes/historial')}
                style={{
                  height: 40, padding: '0 14px', borderRadius: 14,
                  background: 'rgba(20,20,19,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: 'none', cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink2)', fontFamily: 'var(--font)' }}>Historial</span>
              </button>
              <button
                onClick={handleExport}
                style={{
                  height: 40, padding: '0 16px', borderRadius: 14,
                  background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(20,20,19,0.18)',
                }}
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="#F3F0EE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#F3F0EE', fontFamily: 'var(--font)' }}>Exportar</span>
              </button>
            </div>
```

- [ ] **Step 7: Build and verify**

Run: `npm run build`
Expected: exits 0

- [ ] **Step 8: Commit**

```bash
git add src/pages/Gastos/index.tsx src/pages/Reportes/index.tsx
git commit -m "feat: add Reparaciones + Historial nav buttons to Gastos and Historial button to Reportes"
```

---

## Task 7: Dashboard — "Autos sin vender" Widget

**Files:**
- Modify: `src/pages/Dashboard/index.tsx`

The widget shows vehicles with ≥30 days in lot, sorted by days descending, up to 3. Uses `diasEnLote` and `alertaLote` from utils. Only renders when ≥1 vehicle qualifies.

- [ ] **Step 1: Add imports to `src/pages/Dashboard/index.tsx`**

Find:
```typescript
import { useCountUp } from '../../hooks/animations/useCountUp'
```

Replace with:
```typescript
import { useCountUp } from '../../hooks/animations/useCountUp'
import { diasEnLote, alertaLote } from '../../lib/utils'
```

- [ ] **Step 2: Add `autosSinVender` computed value inside the Dashboard component**

Find inside `export default function Dashboard()`:
```typescript
  const recientes = vehiculos.slice(0, 4)
```

Add before it:
```typescript
  const autosSinVender = useMemo(() =>
    vehiculos
      .filter((v) => v.estado !== 'vendido')
      .map((v) => ({ ...v, dias: diasEnLote(v.fecha_compra) }))
      .filter((v) => v.dias >= 30)
      .sort((a, b) => b.dias - a.dias)
      .slice(0, 3),
    [vehiculos]
  )

  const recientes = vehiculos.slice(0, 4)
```

- [ ] **Step 3: Add the widget JSX to Dashboard**

In the JSX of Dashboard, find the "KPI pills row" section comment:
```tsx
      {/* KPI pills row */}
```

Add the widget BEFORE that comment:
```tsx
      {/* Autos sin vender */}
      {autosSinVender.length > 0 && (
        <div style={{ padding: '14px 20px 0', position: 'relative', zIndex: 1 }}>
          <div style={{
            background: 'rgba(255,255,255,0.85)', borderRadius: 24,
            padding: '16px 16px', boxShadow: '0 2px 16px rgba(20,20,19,0.06)',
            border: '0.5px solid rgba(20,20,19,0.06)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>Autos en lote</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#C07070', background: 'rgba(192,112,112,0.10)', padding: '3px 10px', borderRadius: 999 }}>
                Requieren atención
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {autosSinVender.map((v) => {
                const alerta = alertaLote(v.dias)
                return (
                  <button
                    key={v.id}
                    onClick={() => navigate(`/vehiculo/${v.id}`)}
                    style={{
                      width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 10px', borderRadius: 14,
                      background: alerta.bg,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                      {v.marca} {v.modelo} {v.anio}
                    </span>
                    <span style={{
                      fontSize: 12, fontWeight: 800,
                      color: alerta.color,
                      background: `${alerta.color}18`,
                      padding: '3px 10px', borderRadius: 999,
                    }}>
                      {v.dias}d
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* KPI pills row */}
```

Note: There are two `background` declarations on the button above — remove the first one (the `background: 'none'`). The correct button style is:

```tsx
                    style={{
                      width: '100%', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 10px', borderRadius: 14,
                      background: alerta.bg,
                    }}
```

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Expected: exits 0

- [ ] **Step 5: Commit**

```bash
git add src/pages/Dashboard/index.tsx
git commit -m "feat: add 'Autos sin vender' widget to Dashboard with semaphore coloring"
```

---

## Task 8: Inventario — Días en Lote Badge on VehiculoCard

**Files:**
- Modify: `src/pages/Inventario/VehiculoCard.tsx`

- [ ] **Step 1: Add imports to VehiculoCard**

Find:
```typescript
import { formatearMoneda, formatearFecha, labelPorEstado, colorPorEstado } from '../../lib/utils'
```

Replace with:
```typescript
import { formatearMoneda, formatearFecha, labelPorEstado, colorPorEstado, diasEnLote, alertaLote } from '../../lib/utils'
```

- [ ] **Step 2: Add badge to VehiculoCard JSX**

The card currently has a `<ChevronRight>` at the end. Find the full `<div className="flex-1 min-w-0">` block and the trailing `<ChevronRight>`. We need to add the badge between the flex-1 div and the ChevronRight.

Find:
```tsx
      <ChevronRight size={16} style={{ color: 'var(--neutral-600)', flexShrink: 0 }} />
```

Replace with:
```tsx
      {vehiculo.estado !== 'vendido' && (() => {
        const dias = diasEnLote(vehiculo.fecha_compra)
        const alerta = alertaLote(dias)
        if (dias < 1) return null
        return (
          <span style={{
            fontSize: 11, fontWeight: 800,
            color: alerta.color,
            background: alerta.bg,
            padding: '3px 8px', borderRadius: 999,
            flexShrink: 0,
          }}>
            {dias}d
          </span>
        )
      })()}
      <ChevronRight size={16} style={{ color: 'var(--neutral-600)', flexShrink: 0 }} />
```

- [ ] **Step 3: Build and verify**

Run: `npm run build`
Expected: exits 0

- [ ] **Step 4: Commit**

```bash
git add src/pages/Inventario/VehiculoCard.tsx
git commit -m "feat: add días en lote badge to VehiculoCard with semaphore coloring"
```

---

## Task 9: Reportes — Proyección del Próximo Mes

**Files:**
- Modify: `src/pages/Reportes/index.tsx`

The proyección section is computed from `mesesData` which is already available in the component. It's added as a new card after the existing monthly bar chart card.

- [ ] **Step 1: Add proyección computed values inside Reportes component**

In `src/pages/Reportes/index.tsx`, find:
```typescript
  const topListRef = useRef<HTMLDivElement>(null)
```

Add BEFORE it:
```typescript
  const proyeccion = useMemo(() => {
    const conDatos = mesesData.filter((m) => m.ganancia > 0)
    if (conDatos.length === 0) return null
    const avg = conDatos.reduce((a, m) => a + m.ganancia, 0) / conDatos.length
    const recientes = mesesData.slice(-3).filter((m) => m.ganancia > 0)
    const anteriores = mesesData.slice(0, 3).filter((m) => m.ganancia > 0)
    const avgRec = recientes.length ? recientes.reduce((a, m) => a + m.ganancia, 0) / recientes.length : avg
    const avgAnt = anteriores.length ? anteriores.reduce((a, m) => a + m.ganancia, 0) / anteriores.length : avg
    const crecimiento = avgAnt > 0 ? (avgRec - avgAnt) / avgAnt : 0
    const proy = avg * (1 + crecimiento * 0.6)
    return {
      valor: proy,
      min: proy * 0.82,
      max: proy * 1.18,
      tendencia: crecimiento > 0.05 ? 'alza' : crecimiento < -0.05 ? 'baja' : 'estable',
      icono: crecimiento > 0.05 ? '↑' : crecimiento < -0.05 ? '↓' : '→',
    }
  }, [mesesData])

  const topListRef = useRef<HTMLDivElement>(null)
```

- [ ] **Step 2: Add proyección JSX after the monthly bar chart card**

In the JSX of Reportes, find the comment:
```tsx
        {/* Top vehículos */}
```

Add a new section BEFORE that comment:
```tsx
        {/* Proyección del próximo mes */}
        {proyeccion && (
          <div style={{ padding: '12px 22px 0' }}>
            <div style={{ background: 'rgba(255,255,255,0.8)', borderRadius: 24, padding: '18px 16px', boxShadow: '0 1px 12px rgba(20,20,19,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>Próximo mes (est.)</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 16 }}>{proyeccion.icono}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: proyeccion.tendencia === 'alza' ? '#7AAB8E' : proyeccion.tendencia === 'baja' ? '#C07070' : 'var(--muted)',
                    background: proyeccion.tendencia === 'alza' ? 'rgba(122,171,142,0.12)' : proyeccion.tendencia === 'baja' ? 'rgba(192,112,112,0.10)' : 'rgba(20,20,19,0.06)',
                    padding: '3px 10px', borderRadius: 999,
                  }}>
                    {proyeccion.tendencia === 'alza' ? 'Tendencia alcista' : proyeccion.tendencia === 'baja' ? 'Tendencia a la baja' : 'Tendencia estable'}
                  </span>
                </div>
              </div>

              {/* Mini bar chart: last 3 months + projection */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 70, marginBottom: 16 }}>
                {(() => {
                  const ultimos3 = mesesData.slice(-3)
                  const allVals = [...ultimos3.map((m) => m.ganancia), proyeccion.valor]
                  const maxVal = Math.max(...allVals, 1)
                  return (
                    <>
                      {ultimos3.map((m, i) => {
                        const h = m.ganancia > 0 ? Math.max(8, Math.round((m.ganancia / maxVal) * 60)) : 4
                        return (
                          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                              <div style={{ width: '100%', height: h, borderRadius: 6, background: 'rgba(20,20,19,0.20)' }} />
                            </div>
                            <span style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 500 }}>{m.mes}</span>
                          </div>
                        )
                      })}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                          <div style={{
                            width: '100%',
                            height: Math.max(8, Math.round((proyeccion.valor / maxVal) * 60)),
                            borderRadius: 6,
                            background: 'transparent',
                            border: '2px dashed rgba(20,20,19,0.35)',
                            boxSizing: 'border-box',
                          }} />
                        </div>
                        <span style={{ fontSize: 9, color: 'var(--ink)', fontWeight: 700 }}>Est.</span>
                      </div>
                    </>
                  )
                })()}
              </div>

              {/* Min / Proyectado / Max */}
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { label: 'Mínimo', value: proyeccion.min, color: 'var(--muted)' },
                  { label: 'Proyectado', value: proyeccion.valor, color: 'var(--ink)', bold: true },
                  { label: 'Máximo', value: proyeccion.max, color: '#7AAB8E' },
                ].map((k) => (
                  <div key={k.label} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{k.label}</div>
                    <div style={{ fontSize: 14, fontWeight: k.bold ? 900 : 700, color: k.color, letterSpacing: '-0.5px' }}>
                      {fmtN(k.value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Top vehículos */}
```

- [ ] **Step 3: Build and verify**

Run: `npm run build`
Expected: exits 0

- [ ] **Step 4: Commit**

```bash
git add src/pages/Reportes/index.tsx
git commit -m "feat: add Proyección del próximo mes section to Reportes"
```

---

## Task 10: Reportes — Análisis por Marca

**Files:**
- Modify: `src/pages/Reportes/index.tsx`

The análisis por marca section adds 4 metric pills and a ranked list of brands derived from `vehiculos` + `repTotals` (both already in the component). Added after Top vehículos.

- [ ] **Step 1: Add `metricaMarca` state and `marcasData` computed value**

In `src/pages/Reportes/index.tsx`, find:
```typescript
  const topListRef = useRef<HTMLDivElement>(null)
```

Add BEFORE it:
```typescript
  type MetricaMarca = 'ganancia' | 'roi' | 'unidades' | 'dias'
  const [metricaMarca, setMetricaMarca] = useState<MetricaMarca>('ganancia')

  const marcasData = useMemo(() => {
    const map = new Map<string, { ganancia: number; roi: number[]; unidades: number; dias: number[] }>()
    vehiculos
      .filter((v) => v.estado === 'vendido' && v.precio_venta)
      .forEach((v) => {
        const costo = costoVehiculo(v)
        const gan = v.precio_venta! - costo
        const roi = costo > 0 ? (gan / costo) * 100 : 0
        const dias = v.fecha_venta && v.fecha_compra
          ? Math.floor((new Date(v.fecha_venta).getTime() - new Date(v.fecha_compra + 'T00:00:00').getTime()) / 86_400_000)
          : 0
        if (!map.has(v.marca)) map.set(v.marca, { ganancia: 0, roi: [], unidades: 0, dias: [] })
        const entry = map.get(v.marca)!
        entry.ganancia += gan
        entry.roi.push(roi)
        entry.unidades += 1
        entry.dias.push(dias)
      })
    return Array.from(map.entries()).map(([marca, d]) => ({
      marca,
      ganancia: d.ganancia,
      roi: d.roi.length ? d.roi.reduce((a, b) => a + b, 0) / d.roi.length : 0,
      unidades: d.unidades,
      dias: d.dias.length ? d.dias.reduce((a, b) => a + b, 0) / d.dias.length : 0,
    }))
  }, [vehiculos, repTotals])

  const topListRef = useRef<HTMLDivElement>(null)
```

- [ ] **Step 2: Add análisis por marca JSX after Top vehículos section**

In the JSX of Reportes, find after the closing of the `{/* Top vehículos */}` section. That block ends with `</div>` followed by another `</div>`. After the closing of that Top vehículos card, add:

```tsx
        {/* Análisis por marca */}
        {marcasData.length > 0 && (
          <div style={{ padding: '12px 22px 0' }}>
            <div style={{ background: 'rgba(255,255,255,0.8)', borderRadius: 24, padding: '18px 16px', boxShadow: '0 1px 12px rgba(20,20,19,0.05)' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)', marginBottom: 12 }}>
                Análisis por marca
              </div>

              {/* Metric pills */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto' }} className="scrollbar-none">
                {([
                  { id: 'ganancia', label: 'Ganancia' },
                  { id: 'roi',      label: 'ROI %' },
                  { id: 'unidades', label: 'Unidades' },
                  { id: 'dias',     label: 'Días prom.' },
                ] as { id: MetricaMarca; label: string }[]).map((m) => (
                  <button key={m.id} onClick={() => setMetricaMarca(m.id)} style={{
                    padding: '6px 12px', borderRadius: 999, border: 'none', cursor: 'pointer', flexShrink: 0,
                    background: metricaMarca === m.id ? 'var(--ink)' : 'rgba(20,20,19,0.07)',
                    color: metricaMarca === m.id ? '#F3F0EE' : 'var(--ink2)',
                    fontSize: 11, fontWeight: 700, fontFamily: 'var(--font)',
                  }}>{m.label}</button>
                ))}
              </div>

              {/* Ranked list */}
              {(() => {
                const sorted = [...marcasData].sort((a, b) => b[metricaMarca] - a[metricaMarca])
                const maxVal = Math.max(...sorted.map((m) => m[metricaMarca]), 1)
                const brandColors = ['#7A96B8', '#7AAB8E', '#B89870', '#A88AB8', '#9A9590', '#C07070']
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {sorted.map((m, i) => {
                      const val = m[metricaMarca]
                      const pct = Math.round((val / maxVal) * 100)
                      const color = brandColors[i % brandColors.length]
                      const displayVal = metricaMarca === 'ganancia'
                        ? fmtN(val)
                        : metricaMarca === 'roi'
                        ? `${val.toFixed(1)}%`
                        : metricaMarca === 'dias'
                        ? `${Math.round(val)}d`
                        : `${val}`
                      return (
                        <div key={m.marca}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink2)' }}>{m.marca}</span>
                            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink)' }}>{displayVal}</span>
                          </div>
                          <div style={{ height: 5, background: 'rgba(20,20,19,0.06)', borderRadius: 999 }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999 }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}

              {/* Summary chips */}
              {(() => {
                if (marcasData.length < 2) return null
                const mejorRoi = [...marcasData].sort((a, b) => b.roi - a.roi)[0]
                const masRapida = [...marcasData].filter((m) => m.dias > 0).sort((a, b) => a.dias - b.dias)[0]
                return (
                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <div style={{ flex: 1, background: 'rgba(122,171,142,0.10)', borderRadius: 14, padding: '10px 12px' }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Mejor ROI</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#7AAB8E' }}>{mejorRoi.marca}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{mejorRoi.roi.toFixed(1)}%</div>
                    </div>
                    {masRapida && (
                      <div style={{ flex: 1, background: 'rgba(122,150,184,0.10)', borderRadius: 14, padding: '10px 12px' }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Más rápida</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#7A96B8' }}>{masRapida.marca}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{Math.round(masRapida.dias)}d prom.</div>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        )}
```

- [ ] **Step 3: Build and verify**

Run: `npm run build`
Expected: exits 0

- [ ] **Step 4: Commit**

```bash
git add src/pages/Reportes/index.tsx
git commit -m "feat: add Análisis por marca section to Reportes with 4 metric pills and summary chips"
```

---

## Final Verification

- [ ] **Run full build**

```bash
npm run build
```
Expected: exits 0, no TypeScript errors, no warnings about missing imports

- [ ] **Manual smoke test (npm run dev)**

Check each of these routes renders correctly:
1. `/` — Dashboard shows "Autos sin vender" widget (only if vehicles with ≥30 days exist)
2. `/inventario` — VehiculoCard shows días badge for non-sold vehicles
3. `/gastos` — Reparaciones + Historial buttons visible below period selector
4. `/gastos/historial` — Screen loads, TabBar hidden, BackHeader visible
5. `/gastos/reparaciones` — Screen loads, TabBar hidden, supabase data loads
6. `/reportes` — Historial button + Proyección section + Análisis por marca visible
7. `/reportes/historial` — Screen loads, TabBar hidden, BackHeader visible

- [ ] **Final commit (if any remaining changes)**

```bash
git add -A
git commit -m "chore: final cleanup for new screens feature"
```
