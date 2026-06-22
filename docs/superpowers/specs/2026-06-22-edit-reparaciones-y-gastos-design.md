# Edición de reparaciones y gastos generales

**Fecha:** 2026-06-22
**Autor:** rober + Claude
**Status:** Aprobado por usuario, listo para plan de implementación

## Contexto

El cliente del dealership reporta que carga gastos por equivocación y
quiere poder corregirlos. Hoy hay dos gaps reales:

1. **Reparaciones individuales del vehículo** se pueden _agregar_ pero
   no editar ni borrar. Una vez creadas, son inmutables desde la UI.
2. **Gastos generales** sí son editables desde la pantalla principal
   `/gastos` (existe `EditGastoSheet`), pero **no** desde
   `HistorialGastos` — que ahora muestra gastos y reparaciones
   unificadas. Las rows del historial son read-only.

Resolución: cerrar ambos gaps con dos bottom-sheets compartidos.

## Goal

Que cualquier registro (gasto general o reparación) que el usuario vea
en pantalla pueda editarse o eliminarse desde un sheet de edición, con
los mismos campos con los que fue creado y con el mismo flujo de "doble
tap" para confirmar borrado que ya tiene `EditGastoSheet`.

## Out of scope

- Edición masiva (multi-select).
- Undo / soft-delete (borrar es definitivo, vía RLS).
- Auditoría / historial de cambios.
- Toasts visuales de éxito — la app no tiene sistema de toasts y no se
  va a introducir uno acá. Errores se muestran con `window.alert`.

## Arquitectura

Dos componentes compartidos en `src/components/shared/`:

1. **`EditGastoSheet`** — extraído de `src/pages/Gastos/index.tsx` sin
   cambios de lógica. La versión que vive inline en Gastos se reemplaza
   por la importación.

2. **`EditReparacionSheet`** — nuevo. Mismo patrón visual y de
   interacción que `EditGastoSheet`.

Ambos siguen el mismo contrato:

```ts
interface Props<T> {
  item: T
  onClose: () => void
  onSaved: (updated: T) => void
  onDeleted: (id: string) => void
}
```

Concretamente:
- `EditGastoSheet`: `T = GastoGeneral`
- `EditReparacionSheet`: `T = Reparacion`

## Data model & queries

### EditReparacionSheet

Campos editables (todos los del formulario actual de creación, menos
`vehiculo_id` que es estructural y no debería cambiar):

| Campo | Tipo | Required |
|---|---|---|
| `descripcion` | string | sí |
| `costo` | number | sí |
| `categoria` | `CategoriaReparacion` | sí |
| `fecha` | string ISO date | sí |
| `proveedor` | string | no |

Queries:

```ts
// Save
const { data, error } = await supabase
  .from('reparaciones')
  .update({ descripcion, costo, categoria, fecha, proveedor: proveedor || null })
  .eq('id', reparacion.id)
  .select()
  .single()

// Delete
const { error } = await supabase
  .from('reparaciones')
  .delete()
  .eq('id', reparacion.id)
```

RLS scopea por `user_id` automáticamente; no se filtra en cliente.

### EditGastoSheet

Sin cambios. Mantiene su lógica actual de update/delete sobre
`gastos_generales`.

## Integración por pantalla

### Inventario `VehicleSheet` y página `Vehiculo`

- State nuevo: `editingRep: Reparacion | null`.
- Cada row de reparación se vuelve clickeable → `setEditingRep(r)`.
- Render condicional al final del sheet:
  ```tsx
  {editingRep && (
    <EditReparacionSheet
      item={editingRep}
      onClose={() => setEditingRep(null)}
      onSaved={(updated) => {
        setReparaciones((prev) => prev.map((r) => r.id === updated.id ? updated : r))
        setEditingRep(null)
      }}
      onDeleted={(id) => {
        setReparaciones((prev) => prev.filter((r) => r.id !== id))
        setEditingRep(null)
      }}
    />
  )}
  ```

### HistorialGastos

Las rows ya distinguen `source: 'gasto' | 'reparacion'`. Cada row
recibe `onClick` que abre el sheet correspondiente.

- State nuevo: `editingGasto: GastoGeneral | null`, `editingRep: Reparacion | null`.
- Para abrir el sheet de un gasto: necesito el `GastoGeneral` completo,
  no solo el `GastoRow` simplificado. Opciones:
  1. Refetch puntual al abrir: `supabase.from('gastos_generales').select('*').eq('id', g.id).single()`.
  2. Cambiar `gastos` state para que guarde objetos completos en vez de `GastoRow`.

  Voy con (2): cambio el state para guardar `GastoGeneral` y `Reparacion`
  completos en un wrapper. Es menos round-trips y el payload extra es
  marginal.

- Al guardar: actualizo el item en el array unificado, re-mapeo a la
  vista (`toDisplayCat` etc.) si cambió la categoría.
- Al borrar: filtro el item del array unificado.

## Error handling

- Validación cliente: `descripcion` y `costo` requeridos. Botón Guardar
  disabled si faltan.
- Error de red / Supabase en save: muestro `window.alert(error.message)`,
  no cierro el sheet, no aplico el cambio local.
- Error de red en delete: igual — alert y no se aplica el filter local.
- Si el usuario tiene la sesión expirada: el error de RLS vendrá como
  "no rows updated" — manejo el caso `!data && !error` como error genérico.

## Edge cases

| Caso | Manejo |
|---|---|
| Categoría nueva no listada en HistorialGastos (`impuestos`, `seguros`) | `toDisplayCat()` mapea a "otro" para el ícono/label; el dato real se persiste sin cambio. |
| `proveedor` vacío en reparación | Se guarda como `null`. |
| Cambiar fecha a un mes distinto | El re-render agrupa correctamente por mes (lógica ya existente en `porMes`). |
| Tap accidental en row durante drag de scroll | Aceptable — el sheet abierto se cierra con backdrop tap o `X`. |
| Borrar reparación de vehículo y el sheet del vehículo aún muestra `totalReparaciones` viejo | El sheet del vehículo recalcula `totalReparaciones` en cada render desde `reparaciones`. El optimistic update del array dispara el re-cálculo. |

## Testing manual

Después de implementar, hay que verificar:

1. Editar descripción de una reparación desde el detalle del vehículo
   → cambio visible inmediato, número de costo total recalcula.
2. Eliminar una reparación → desaparece, costo total y ganancia neta
   recalculan.
3. Editar categoría de un gasto general en HistorialGastos a "impuestos"
   → en la lista aparece como "Otro" (mapping), en `/gastos` aparece
   con la categoría real.
4. Doble tap para confirmar delete → primer tap muestra confirmación,
   segundo ejecuta.
5. Cambiar fecha de un gasto a otro mes → re-agrupa correctamente en
   ambos lugares (Historial y Gastos principal).

## Riesgos / dependencias

- **Ninguna migración SQL**. Las tablas ya tienen los campos necesarios.
- Mantener consistencia entre `EditGastoSheet` extraído y la versión
  inline previa: la extracción debe ser literal, sin "mientras estoy acá".
