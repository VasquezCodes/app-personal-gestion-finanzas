import { supabase } from './supabase'

/**
 * Inserta datos de prueba para 2026 (Enero–Abril).
 * Seguro llamar múltiples veces — usa upsert con IDs fijos.
 */
export async function seedMockData(): Promise<{ ok: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }
  const uid = user.id

  // ── Vehículos vendidos en distintos meses ──────────────────────────
  const vehiculos = [
    { id: 'mock-v-01', marca: 'Toyota',    modelo: 'Corolla',  anio: 2021, precio_compra: 18000, precio_venta: 22500, fecha_compra: '2026-01-05', fecha_venta: '2026-01-20', estado: 'vendido', color: 'Blanco',   vin: 'MOCK0000001', kilometraje: 42000 },
    { id: 'mock-v-02', marca: 'Ford',      modelo: 'F-150',    anio: 2020, precio_compra: 32000, precio_venta: 39000, fecha_compra: '2026-01-10', fecha_venta: '2026-02-03', estado: 'vendido', color: 'Negro',    vin: 'MOCK0000002', kilometraje: 61000 },
    { id: 'mock-v-03', marca: 'Honda',     modelo: 'Civic',    anio: 2022, precio_compra: 17500, precio_venta: 21000, fecha_compra: '2026-02-01', fecha_venta: '2026-02-18', estado: 'vendido', color: 'Gris',     vin: 'MOCK0000003', kilometraje: 28000 },
    { id: 'mock-v-04', marca: 'Chevrolet', modelo: 'Equinox',  anio: 2021, precio_compra: 23000, precio_venta: 27500, fecha_compra: '2026-02-12', fecha_venta: '2026-03-05', estado: 'vendido', color: 'Plata',    vin: 'MOCK0000004', kilometraje: 38000 },
    { id: 'mock-v-05', marca: 'Kia',       modelo: 'Sportage', anio: 2022, precio_compra: 21000, precio_venta: 26000, fecha_compra: '2026-03-02', fecha_venta: '2026-03-22', estado: 'vendido', color: 'Rojo',     vin: 'MOCK0000005', kilometraje: 22000 },
    { id: 'mock-v-06', marca: 'Toyota',    modelo: 'Hilux',    anio: 2020, precio_compra: 35000, precio_venta: 43000, fecha_compra: '2026-03-08', fecha_venta: '2026-03-28', estado: 'vendido', color: 'Blanco',   vin: 'MOCK0000006', kilometraje: 77000 },
    { id: 'mock-v-07', marca: 'Hyundai',   modelo: 'Tucson',   anio: 2021, precio_compra: 22000, precio_venta: 27000, fecha_compra: '2026-04-01', fecha_venta: '2026-04-10', estado: 'vendido', color: 'Azul',     vin: 'MOCK0000007', kilometraje: 31000 },
    { id: 'mock-v-08', marca: 'Nissan',    modelo: 'Frontier', anio: 2020, precio_compra: 28000, precio_venta: 34000, fecha_compra: '2026-04-03', fecha_venta: '2026-04-22', estado: 'vendido', color: 'Gris',     vin: 'MOCK0000008', kilometraje: 54000 },
    { id: 'mock-v-09', marca: 'Ford',      modelo: 'Ranger',   anio: 2022, precio_compra: 30000, precio_venta: 36500, fecha_compra: '2026-04-08', fecha_venta: '2026-04-25', estado: 'vendido', color: 'Negro',    vin: 'MOCK0000009', kilometraje: 19000 },
    // En stock / reparación
    { id: 'mock-v-10', marca: 'Volkswagen',modelo: 'Tiguan',   anio: 2023, precio_compra: 29000, precio_venta: null,  fecha_compra: '2026-03-15', fecha_venta: null,          estado: 'en_stock',    color: 'Blanco', vin: 'MOCK0000010', kilometraje: 12000 },
    { id: 'mock-v-11', marca: 'Kia',       modelo: 'Cerato',   anio: 2022, precio_compra: 16500, precio_venta: null,  fecha_compra: '2026-04-02', fecha_venta: null,          estado: 'en_reparacion', color: 'Rojo', vin: 'MOCK0000011', kilometraje: 45000 },
  ].map(v => ({ ...v, user_id: uid, notas: '', gastos_adicionales: 0 }))

  // ── Gastos generales por mes ───────────────────────────────────────
  const gastos = [
    // Enero
    { id: 'mock-g-01', descripcion: 'Alquiler local', monto: 1200, categoria: 'alquiler', fecha: '2026-01-01' },
    { id: 'mock-g-02', descripcion: 'Electricidad y agua', monto: 180, categoria: 'servicios', fecha: '2026-01-04' },
    { id: 'mock-g-03', descripcion: 'Instagram Ads', monto: 320, categoria: 'marketing', fecha: '2026-01-08' },
    { id: 'mock-g-04', descripcion: 'Sueldo administrativo', monto: 900, categoria: 'personal', fecha: '2026-01-10' },
    // Febrero
    { id: 'mock-g-05', descripcion: 'Alquiler local', monto: 1200, categoria: 'alquiler', fecha: '2026-02-01' },
    { id: 'mock-g-06', descripcion: 'Internet fibra', monto: 95, categoria: 'servicios', fecha: '2026-02-05' },
    { id: 'mock-g-07', descripcion: 'Google Ads', monto: 480, categoria: 'marketing', fecha: '2026-02-10' },
    { id: 'mock-g-08', descripcion: 'Contadora', monto: 350, categoria: 'personal', fecha: '2026-02-15' },
    { id: 'mock-g-09', descripcion: 'Limpieza local', monto: 120, categoria: 'otro', fecha: '2026-02-18' },
    // Marzo
    { id: 'mock-g-10', descripcion: 'Alquiler local', monto: 1200, categoria: 'alquiler', fecha: '2026-03-01' },
    { id: 'mock-g-11', descripcion: 'Electricidad y agua', monto: 210, categoria: 'servicios', fecha: '2026-03-03' },
    { id: 'mock-g-12', descripcion: 'Instagram Ads', monto: 550, categoria: 'marketing', fecha: '2026-03-06' },
    { id: 'mock-g-13', descripcion: 'Sueldo administrativo', monto: 950, categoria: 'personal', fecha: '2026-03-10' },
    { id: 'mock-g-14', descripcion: 'Herramientas', monto: 280, categoria: 'otro', fecha: '2026-03-20' },
    // Abril
    { id: 'mock-g-15', descripcion: 'Alquiler local', monto: 1200, categoria: 'alquiler', fecha: '2026-04-01' },
    { id: 'mock-g-16', descripcion: 'Electricidad y agua', monto: 195, categoria: 'servicios', fecha: '2026-04-03' },
    { id: 'mock-g-17', descripcion: 'MercadoLibre premium', monto: 140, categoria: 'marketing', fecha: '2026-04-11' },
    { id: 'mock-g-18', descripcion: 'Contadora', monto: 350, categoria: 'personal', fecha: '2026-04-15' },
  ].map(g => ({ ...g, user_id: uid }))

  const [vRes, gRes] = await Promise.all([
    supabase.from('vehiculos').upsert(vehiculos, { onConflict: 'id' }),
    supabase.from('gastos_generales').upsert(gastos, { onConflict: 'id' }),
  ])

  if (vRes.error) return { ok: false, error: vRes.error.message }
  if (gRes.error) return { ok: false, error: gRes.error.message }
  return { ok: true }
}

export async function clearMockData(): Promise<{ ok: boolean; error?: string }> {
  const [vRes, gRes] = await Promise.all([
    supabase.from('vehiculos').delete().like('id', 'mock-%'),
    supabase.from('gastos_generales').delete().like('id', 'mock-%'),
  ])
  if (vRes.error) return { ok: false, error: vRes.error.message }
  if (gRes.error) return { ok: false, error: gRes.error.message }
  return { ok: true }
}
