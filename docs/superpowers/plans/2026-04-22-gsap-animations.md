# GSAP Animations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add GSAP-powered animations (KPI counters, list staggers, bar chart growth, hero entrance, page transitions) to make the PWA feel like a native iOS premium app.

**Architecture:** Install `gsap` + `@gsap/react`, register plugins globally in `main.tsx`, create four reusable hooks (`useCountUp`, `useStaggerIn`, `useBarGrow`, `useHeroEntrance`) and one component (`PageTransition`). Each hook uses `useGSAP` with `revertOnUpdate: true` for correct React cleanup. All hooks respect `prefers-reduced-motion`.

**Tech Stack:** GSAP 3, @gsap/react, React 18, React Router v6, TypeScript, Vite

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `package.json` / install | Add gsap + @gsap/react deps |
| Modify | `src/main.tsx` | Register `useGSAP` plugin + set `gsap.defaults` |
| Create | `src/hooks/animations/useCountUp.ts` | Animates number 0→value, returns formatted string |
| Create | `src/hooks/animations/useStaggerIn.ts` | Staggers direct children of a container ref |
| Create | `src/hooks/animations/useBarGrow.ts` | Grows `[data-bar]` elements from scaleY:0 |
| Create | `src/hooks/animations/useHeroEntrance.ts` | One-shot entrance for hero card |
| Create | `src/components/ios/PageTransition.tsx` | Slide-in wrapper keyed to route changes |
| Modify | `src/pages/Dashboard/index.tsx` | Add `data-bar`, refs, wire all 3 hooks |
| Modify | `src/pages/Inventario/index.tsx` | Wire `useStaggerIn` to vehicle list |
| Modify | `src/pages/Gastos/index.tsx` | Wire `useStaggerIn` to expense list |
| Modify | `src/pages/Reportes/index.tsx` | Wire `useCountUp` + `useStaggerIn` |
| Modify | `src/App.tsx` | Wrap `<Routes>` with `<PageTransition>` |

---

## Task 1: Install GSAP

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install packages**

```bash
cd d:/app-personal-gestion-finanzas && npm install gsap @gsap/react
```

Expected output: `added 2 packages` (or similar). No errors.

- [ ] **Step 2: Verify TypeScript types are available**

```bash
cd d:/app-personal-gestion-finanzas && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors about missing gsap types (they ship with the package).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install gsap and @gsap/react"
```

---

## Task 2: Configure GSAP in main.tsx

**Files:**
- Modify: `src/main.tsx`

- [ ] **Step 1: Read current main.tsx**

```bash
cat src/main.tsx
```

- [ ] **Step 2: Add GSAP registration at the top of main.tsx**

Find the existing imports block and add after the last import:

```ts
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)
gsap.defaults({ ease: 'power2.out', duration: 0.4 })
```

The full top of `src/main.tsx` should look like:

```ts
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)
gsap.defaults({ ease: 'power2.out', duration: 0.4 })
```

(Keep whatever other imports already exist in the file — only add the gsap lines.)

- [ ] **Step 3: Verify build**

```bash
cd d:/app-personal-gestion-finanzas && npm run build 2>&1 | tail -6
```

Expected: `✓ built in ...ms` — no errors.

- [ ] **Step 4: Commit**

```bash
git add src/main.tsx
git commit -m "feat: register gsap plugins and set defaults"
```

---

## Task 3: Create useCountUp hook

**Files:**
- Create: `src/hooks/animations/useCountUp.ts`

- [ ] **Step 1: Create the hooks directory and file**

```bash
mkdir -p d:/app-personal-gestion-finanzas/src/hooks/animations
```

- [ ] **Step 2: Write the hook**

Create `src/hooks/animations/useCountUp.ts`:

```ts
import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

export function useCountUp(target: number, ready: boolean): string {
  const [displayed, setDisplayed] = useState(0)
  const valRef = useRef({ current: 0 })
  const tweenRef = useRef<gsap.core.Tween | null>(null)

  useEffect(() => {
    if (!ready) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      valRef.current.current = target
      setDisplayed(target)
      return
    }

    tweenRef.current?.kill()
    tweenRef.current = gsap.to(valRef.current, {
      current: target,
      duration: 0.9,
      ease: 'power2.out',
      onUpdate: () => setDisplayed(Math.round(valRef.current.current)),
      onComplete: () => { valRef.current.current = target },
    })

    return () => { tweenRef.current?.kill() }
  }, [target, ready])

  return `$${displayed.toLocaleString('es-AR')}`
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd d:/app-personal-gestion-finanzas && npx tsc --noEmit 2>&1 | grep useCountUp
```

Expected: no output (no errors).

- [ ] **Step 4: Commit**

```bash
git add src/hooks/animations/useCountUp.ts
git commit -m "feat: add useCountUp animation hook"
```

---

## Task 4: Create useStaggerIn hook

**Files:**
- Create: `src/hooks/animations/useStaggerIn.ts`

- [ ] **Step 1: Write the hook**

Create `src/hooks/animations/useStaggerIn.ts`:

```ts
import { type RefObject } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

export function useStaggerIn(
  containerRef: RefObject<HTMLDivElement>,
  deps: unknown[],
) {
  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const children = containerRef.current?.querySelectorAll(':scope > *')
      if (!children?.length) return

      gsap.from(children, {
        y: 20,
        autoAlpha: 0,
        stagger: 0.06,
        duration: 0.4,
        ease: 'power2.out',
        clearProps: 'all',
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    { scope: containerRef, dependencies: deps, revertOnUpdate: true },
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd d:/app-personal-gestion-finanzas && npx tsc --noEmit 2>&1 | grep useStaggerIn
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/animations/useStaggerIn.ts
git commit -m "feat: add useStaggerIn animation hook"
```

---

## Task 5: Create useBarGrow hook

**Files:**
- Create: `src/hooks/animations/useBarGrow.ts`

- [ ] **Step 1: Write the hook**

Create `src/hooks/animations/useBarGrow.ts`:

```ts
import { type RefObject } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

export function useBarGrow(
  containerRef: RefObject<HTMLDivElement>,
  deps: unknown[],
) {
  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const bars = containerRef.current?.querySelectorAll('[data-bar]')
      if (!bars?.length) return

      gsap.from(bars, {
        scaleY: 0,
        transformOrigin: 'bottom',
        stagger: 0.04,
        duration: 0.5,
        ease: 'power2.out',
        clearProps: 'scaleY,transform',
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    { scope: containerRef, dependencies: deps, revertOnUpdate: true },
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd d:/app-personal-gestion-finanzas && npx tsc --noEmit 2>&1 | grep useBarGrow
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/animations/useBarGrow.ts
git commit -m "feat: add useBarGrow animation hook"
```

---

## Task 6: Create useHeroEntrance hook

**Files:**
- Create: `src/hooks/animations/useHeroEntrance.ts`

- [ ] **Step 1: Write the hook**

Create `src/hooks/animations/useHeroEntrance.ts`:

```ts
import { type RefObject } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

export function useHeroEntrance(ref: RefObject<HTMLDivElement>) {
  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      gsap.from(ref.current, {
        scale: 0.97,
        autoAlpha: 0,
        y: 12,
        duration: 0.45,
        ease: 'power2.out',
        clearProps: 'all',
      })
    },
    { scope: ref },
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd d:/app-personal-gestion-finanzas && npx tsc --noEmit 2>&1 | grep useHeroEntrance
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/animations/useHeroEntrance.ts
git commit -m "feat: add useHeroEntrance animation hook"
```

---

## Task 7: Create PageTransition component

**Files:**
- Create: `src/components/ios/PageTransition.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/ios/PageTransition.tsx`:

```tsx
import { useRef, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

export function PageTransition({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      gsap.from(containerRef.current, {
        x: 18,
        autoAlpha: 0,
        duration: 0.3,
        ease: 'power2.out',
        clearProps: 'all',
      })
    },
    {
      scope: containerRef,
      dependencies: [location.pathname],
      revertOnUpdate: true,
    },
  )

  return (
    <div ref={containerRef} style={{ height: '100%', overflow: 'hidden' }}>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd d:/app-personal-gestion-finanzas && npx tsc --noEmit 2>&1 | grep PageTransition
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/components/ios/PageTransition.tsx
git commit -m "feat: add PageTransition component with GSAP slide-in"
```

---

## Task 8: Wire PageTransition in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add import and wrap Routes in AppLayout**

In `src/App.tsx`, add the import:

```ts
import { PageTransition } from './components/ios/PageTransition'
```

Replace the `AppLayout` function body — wrap `<Routes>` with `<PageTransition>`:

```tsx
function AppLayout() {
  return (
    <div
      style={{
        height: '100svh',
        overflow: 'hidden',
        fontFamily: 'var(--font-primary)',
        color: 'var(--ink)',
      }}
    >
      <PageTransition>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventario" element={<Inventario />} />
          <Route path="/vehiculo/:id" element={<VehiculoDetalle />} />
          <Route path="/reparaciones" element={<Reparaciones />} />
          <Route path="/gastos" element={<Gastos />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/configuracion" element={<Configuracion />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PageTransition>
      <TabBar />
    </div>
  )
}
```

- [ ] **Step 2: Build and verify**

```bash
cd d:/app-personal-gestion-finanzas && npm run build 2>&1 | tail -6
```

Expected: `✓ built in ...ms`

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wrap AppLayout routes with PageTransition"
```

---

## Task 9: Wire Dashboard — hero, counter, bar chart

**Files:**
- Modify: `src/pages/Dashboard/index.tsx`

- [ ] **Step 1: Add imports at the top of Dashboard/index.tsx**

Add after the existing imports:

```ts
import { useRef } from 'react'  // already imported — skip if present, just add useRef to existing import
import { useCountUp } from '../../hooks/animations/useCountUp'
import { useHeroEntrance } from '../../hooks/animations/useHeroEntrance'
import { useBarGrow } from '../../hooks/animations/useBarGrow'
```

(The file already imports `useEffect, useMemo, useState` from `'react'` — add `useRef` to that same import.)

- [ ] **Step 2: Add refs and wire hooks inside the Dashboard component**

Inside the `export default function Dashboard()` body, after the existing state declarations, add:

```ts
const heroRef = useRef<HTMLDivElement>(null)
const chartRef = useRef<HTMLDivElement>(null)

useHeroEntrance(heroRef)
useBarGrow(chartRef, [chartMode, chartData])
const gananciaMesDisplay = useCountUp(gananciaMes, auxReady)
```

- [ ] **Step 3: Attach heroRef to the hero card div**

Find this line in the JSX (the hero card outer div):

```tsx
<div style={{
  background: accentBg,
  borderRadius: 'var(--r-hero)',
  padding: '22px 22px 24px',
  position: 'relative', overflow: 'hidden',
}}>
```

Add `ref={heroRef}`:

```tsx
<div ref={heroRef} style={{
  background: accentBg,
  borderRadius: 'var(--r-hero)',
  padding: '22px 22px 24px',
  position: 'relative', overflow: 'hidden',
}}>
```

- [ ] **Step 4: Replace the static ganancia display with the animated counter**

Find:

```tsx
{loading || !auxReady ? '—' : fmtShort(gananciaMes)}
```

Replace with:

```tsx
{loading || !auxReady ? '—' : gananciaMesDisplay}
```

- [ ] **Step 5: Attach chartRef to the BarChart container and add data-bar to bar divs**

In the `BarChart` call site in the JSX, wrap it with a ref div:

```tsx
<div ref={chartRef}>
  <BarChart
    data={chartData}
    color="rgba(20,20,19,0.85)"
    height={96}
    onSelect={(i) => setSelectedBar(selectedBar === i ? null : i)}
    selected={selectedBar}
  />
</div>
```

Inside the `BarChart` component definition (top of the file), find the inner bar div:

```tsx
<div style={{
  width: '100%', height: h, borderRadius: 7, transition: 'all .18s',
  background: isSel ? '#141413' : isFuture ? 'rgba(20,20,19,0.10)' : isMax ? color : 'rgba(20,20,19,0.26)',
  outline: isSel ? '2px solid rgba(20,20,19,0.45)' : 'none',
  outlineOffset: 2,
}} />
```

Add `data-bar=""`:

```tsx
<div
  data-bar=""
  style={{
    width: '100%', height: h, borderRadius: 7, transition: 'all .18s',
    background: isSel ? '#141413' : isFuture ? 'rgba(20,20,19,0.10)' : isMax ? color : 'rgba(20,20,19,0.26)',
    outline: isSel ? '2px solid rgba(20,20,19,0.45)' : 'none',
    outlineOffset: 2,
  }}
/>
```

- [ ] **Step 6: Build and verify**

```bash
cd d:/app-personal-gestion-finanzas && npm run build 2>&1 | tail -6
```

Expected: `✓ built in ...ms`

- [ ] **Step 7: Commit**

```bash
git add src/pages/Dashboard/index.tsx
git commit -m "feat: wire GSAP hero entrance, counter, and bar chart animations in Dashboard"
```

---

## Task 10: Wire Inventario — stagger list

**Files:**
- Modify: `src/pages/Inventario/index.tsx`

- [ ] **Step 1: Add imports**

Add to the existing imports in `src/pages/Inventario/index.tsx`:

```ts
import { useRef } from 'react'  // add useRef to existing react import
import { useStaggerIn } from '../../hooks/animations/useStaggerIn'
```

- [ ] **Step 2: Add ref and wire hook inside Inventario component**

Inside `export default function Inventario()`, after the existing state declarations:

```ts
const listRef = useRef<HTMLDivElement>(null)
useStaggerIn(listRef, [vehiculosFiltrados.length, filtro, busqueda])
```

- [ ] **Step 3: Attach listRef to the vehicle list container**

Find the vehicle list container div (the one that wraps `vehiculosFiltrados.map(...)`):

```tsx
<div style={{ padding: '12px 22px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
```

Add `ref={listRef}`:

```tsx
<div ref={listRef} style={{ padding: '12px 22px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
```

- [ ] **Step 4: Build and verify**

```bash
cd d:/app-personal-gestion-finanzas && npm run build 2>&1 | tail -6
```

Expected: `✓ built in ...ms`

- [ ] **Step 5: Commit**

```bash
git add src/pages/Inventario/index.tsx
git commit -m "feat: wire useStaggerIn to Inventario vehicle list"
```

---

## Task 11: Wire Gastos — stagger list

**Files:**
- Modify: `src/pages/Gastos/index.tsx`

- [ ] **Step 1: Add imports**

```ts
import { useRef } from 'react'  // add useRef to existing react import
import { useStaggerIn } from '../../hooks/animations/useStaggerIn'
```

- [ ] **Step 2: Add ref and hook inside Gastos component**

Inside `export default function Gastos()`, after the existing state declarations:

```ts
const listRef = useRef<HTMLDivElement>(null)
useStaggerIn(listRef, [gastosFiltrados.length, filtro, periodo])
```

- [ ] **Step 3: Attach listRef to the expense list container**

Find:

```tsx
<div style={{ padding: '12px 22px 0', display: 'flex', flexDirection: 'column', gap: 9 }}>
```

Add `ref={listRef}`:

```tsx
<div ref={listRef} style={{ padding: '12px 22px 0', display: 'flex', flexDirection: 'column', gap: 9 }}>
```

- [ ] **Step 4: Build and verify**

```bash
cd d:/app-personal-gestion-finanzas && npm run build 2>&1 | tail -6
```

Expected: `✓ built in ...ms`

- [ ] **Step 5: Commit**

```bash
git add src/pages/Gastos/index.tsx
git commit -m "feat: wire useStaggerIn to Gastos expense list"
```

---

## Task 12: Wire Reportes — counter + stagger list

**Files:**
- Modify: `src/pages/Reportes/index.tsx`

- [ ] **Step 1: Add imports**

```ts
import { useRef } from 'react'  // add useRef to existing react import
import { useCountUp } from '../../hooks/animations/useCountUp'
import { useStaggerIn } from '../../hooks/animations/useStaggerIn'
```

- [ ] **Step 2: Add refs and wire hooks inside Reportes component**

Inside `export default function Reportes()`, after the existing state declarations:

```ts
const topListRef = useRef<HTMLDivElement>(null)
useStaggerIn(topListRef, [topVehiculos.length, periodo])
const totalGananciaDisplay = useCountUp(totalGanancia, auxReady)
const margenDisplay = auxReady ? `${margen}%` : '—'
```

- [ ] **Step 3: Replace static KPI values with animated ones**

Find the KPI cards definition:

```tsx
{ label: 'Ganancia total', value: auxReady ? fmtN(totalGanancia) : '—', sub: auxReady ? `${totalVentas} ventas` : '···', dark: true },
{ label: 'Margen neto', value: auxReady ? `${margen}%` : '—', sub: 'sobre ingresos', color: '#7AAB8E', dark: false },
```

Replace with:

```tsx
{ label: 'Ganancia total', value: auxReady ? totalGananciaDisplay : '—', sub: auxReady ? `${totalVentas} ventas` : '···', dark: true },
{ label: 'Margen neto', value: margenDisplay, sub: 'sobre ingresos', color: '#7AAB8E', dark: false },
```

- [ ] **Step 4: Attach topListRef to the top vehicles list container**

Find:

```tsx
<div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
  {topVehiculos.map((v, i) => (
```

Add `ref={topListRef}`:

```tsx
<div ref={topListRef} style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
  {topVehiculos.map((v, i) => (
```

- [ ] **Step 5: Build and verify**

```bash
cd d:/app-personal-gestion-finanzas && npm run build 2>&1 | tail -6
```

Expected: `✓ built in ...ms`

- [ ] **Step 6: Commit**

```bash
git add src/pages/Reportes/index.tsx
git commit -m "feat: wire useCountUp and useStaggerIn to Reportes"
```

---

## Task 13: Final verification

- [ ] **Step 1: Full build**

```bash
cd d:/app-personal-gestion-finanzas && npm run build 2>&1 | tail -10
```

Expected: `✓ built in ...ms` with no TypeScript errors.

- [ ] **Step 2: Type check**

```bash
cd d:/app-personal-gestion-finanzas && npx tsc --noEmit
```

Expected: no output (zero errors).

- [ ] **Step 3: Dev server smoke test**

```bash
cd d:/app-personal-gestion-finanzas && npm run dev
```

Open the app and verify:
- Navigating between tabs slides in from the right
- Dashboard hero card fades + scales in on first load
- KPI number counts up from 0 to final value
- Bar chart bars grow from bottom on load and when toggling Semana/Año
- Vehicle cards in Inventario stagger in from below
- Expense rows in Gastos stagger in from below
- Top vehicles in Reportes stagger in from below
- `prefers-reduced-motion: reduce` disables all animations (test via DevTools → Rendering → Emulate prefers-reduced-motion)
