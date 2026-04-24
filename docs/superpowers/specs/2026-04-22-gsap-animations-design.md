# GSAP Animations — Design Spec
**Date:** 2026-04-22  
**Status:** Approved

## Objetivo

Agregar animaciones con GSAP para que la app PWA de gestión de concesionario se sienta como una app nativa de iOS premium. Intensidad: media (estilo Notion/Linear mobile) — movimientos visibles pero elegantes, no distractivos.

## Alcance

Cinco momentos animados:
1. Contadores KPI (números que suben al cargar)
2. Listas en cascada (stagger de cards al montar)
3. Barras del gráfico (crecen desde 0 al cargar o cambiar modo)
4. Hero card entrance (fade + scale al montar Dashboard)
5. Transiciones de página (slide horizontal entre tabs)

**Fuera de alcance:** Bottom sheets (ya funcionales con Framer Motion, no requieren cambio).

## Stack de animación

- **Instalar:** `gsap` + `@gsap/react`
- **Framer Motion:** se mantiene únicamente en `TabBar.tsx` para el indicador `layoutId`. No se elimina.
- **Defaults globales** (en `main.tsx`):
  ```ts
  gsap.registerPlugin(useGSAP)
  gsap.defaults({ ease: 'power2.out', duration: 0.4 })
  ```
- **Accesibilidad:** todos los hooks respetan `prefers-reduced-motion` vía `gsap.matchMedia()` — duración `0` cuando el usuario lo prefiere.

## Arquitectura

```
src/
  hooks/
    animations/
      useCountUp.ts
      useStaggerIn.ts
      useBarGrow.ts
      useHeroEntrance.ts
  components/
    ios/
      PageTransition.tsx
```

## Hooks

### `useCountUp(value: number, ready: boolean): string`

- Anima de 0 → `value` usando `gsap.to` sobre un objeto `{ val: 0 }` con `onUpdate` que actualiza state.
- Solo inicia cuando `ready === true` (evita renderizar valores incorrectos antes de que carguen los datos).
- Si `value` cambia (cambio de período/filtro), re-anima desde el valor actual.
- Devuelve el número formateado con `Intl.NumberFormat` listo para renderizar.
- **Params:** `duration: 0.9`, `ease: 'power2.out'`
- **Usado en:** hero `gananciaMes` (Dashboard), `totalGanancia` y `margen` (Reportes)

### `useStaggerIn(containerRef: RefObject, deps: unknown[])`

- Usa `useGSAP` con `scope: containerRef` y `revertOnUpdate: true`.
- `gsap.from(children, { y: 20, autoAlpha: 0, stagger: 0.06, duration: 0.4, ease: 'power2.out' })`
- Se re-corre cuando cambian `deps` (ej: filtro activo, búsqueda, período).
- Targets: selector `':scope > *'` (hijos directos del container, sin clases globales).
- **Usado en:** lista de vehículos (Inventario), lista de gastos (Gastos), top vehículos (Reportes)

### `useBarGrow(containerRef: RefObject, deps: unknown[])`

- Usa `useGSAP` con `scope: containerRef` y `revertOnUpdate: true`.
- `gsap.from('.bar', { scaleY: 0, transformOrigin: 'bottom', stagger: 0.04, duration: 0.5, ease: 'power2.out' })`
- Cada elemento `<div>` de barra recibe clase CSS `bar` (solo dentro del scope del chart).
- Se re-corre al cambiar `chartMode` (Semana/Año) o cuando los datos cambian.
- **Usado en:** `BarChart` en Dashboard

### `useHeroEntrance(ref: RefObject)`

- `gsap.from(ref.current, { scale: 0.97, autoAlpha: 0, y: 12, duration: 0.45, ease: 'power2.out' })`
- Sin dependencias — corre una sola vez al montar.
- **Usado en:** hero card del Dashboard

### `PageTransition` (componente)

- Wrapper `<div>` que recibe `children`.
- Detecta `location.pathname` con `useLocation()`.
- Al cambiar de ruta: primero sale el contenido actual (`x: -20, autoAlpha: 0`, 150ms), luego entra el nuevo (`gsap.from({ x: 20, autoAlpha: 0 })`, 300ms). La secuencia es exit → swap de children → enter, sin overlap.
- Usa `useGSAP` con `dependencies: [location.pathname]` y `revertOnUpdate: true`.
- Se aplica en `App.tsx` wrapeando el `<Routes>`.

## Parámetros de timing

| Animación        | Duración | Ease          | Stagger |
|------------------|----------|---------------|---------|
| Counter KPI      | 0.9s     | power2.out    | —       |
| Stagger list     | 0.4s     | power2.out    | 0.06s   |
| Bar grow         | 0.5s     | power2.out    | 0.04s   |
| Hero entrance    | 0.45s    | power2.out    | —       |
| Page transition  | 0.3s     | power2.out    | —       |

## Accesibilidad

Todos los hooks wrappean la animación en `gsap.matchMedia()`:
```ts
mm.add({
  reduceMotion: '(prefers-reduced-motion: reduce)'
}, (ctx) => {
  if (ctx.conditions.reduceMotion) return  // skip all animations
  // animación normal
})
```

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `main.tsx` | `gsap.registerPlugin` + `gsap.defaults` |
| `src/hooks/animations/useCountUp.ts` | nuevo |
| `src/hooks/animations/useStaggerIn.ts` | nuevo |
| `src/hooks/animations/useBarGrow.ts` | nuevo |
| `src/hooks/animations/useHeroEntrance.ts` | nuevo |
| `src/components/ios/PageTransition.tsx` | nuevo |
| `src/App.tsx` | wrap con `<PageTransition>` |
| `src/pages/Dashboard/index.tsx` | useCountUp, useHeroEntrance, useBarGrow |
| `src/pages/Inventario/index.tsx` | useStaggerIn |
| `src/pages/Gastos/index.tsx` | useStaggerIn |
| `src/pages/Reportes/index.tsx` | useCountUp, useStaggerIn |
