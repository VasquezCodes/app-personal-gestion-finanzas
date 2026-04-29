import { supabase } from './supabase'

// UUIDs fijos en formato válido (v4-ish) para poder limpiarlos luego
// Vehículos: 00000000-0000-4000-a000-0000000000XX
// Gastos:    00000000-0000-4000-b000-0000000000XX
const VID = (n: number) => `00000000-0000-4000-a000-${String(n).padStart(12, '0')}`
const GID = (n: number) => `00000000-0000-4000-b000-${String(n).padStart(12, '0')}`

const MOCK_V_IDS = Array.from({ length: 11 }, (_, i) => VID(i + 1))
const MOCK_G_IDS = Array.from({ length: 18 }, (_, i) => GID(i + 1))

export async function seedMockData(): Promise<{ ok: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }
  const uid = user.id

  const vehiculos = [
    { id: VID(1),  marca: 'Toyota',     modelo: 'Corolla',   anio: 2021, precio_compra: 18000, precio_venta: 22500, fecha_compra: '2026-01-05', fecha_venta: '2026-01-20', estado: 'vendido',       color: 'Blanco', kilometraje: 42000, gastos_adicionales: 0 },
    { id: VID(2),  marca: 'Ford',       modelo: 'F-150',     anio: 2020, precio_compra: 32000, precio_venta: 39000, fecha_compra: '2026-01-10', fecha_venta: '2026-02-03', estado: 'vendido',       color: 'Negro',  kilometraje: 61000, gastos_adicionales: 0 },
    { id: VID(3),  marca: 'Honda',      modelo: 'Civic',     anio: 2022, precio_compra: 17500, precio_venta: 21000, fecha_compra: '2026-02-01', fecha_venta: '2026-02-18', estado: 'vendido',       color: 'Gris',   kilometraje: 28000, gastos_adicionales: 0 },
    { id: VID(4),  marca: 'Chevrolet',  modelo: 'Equinox',   anio: 2021, precio_compra: 23000, precio_venta: 27500, fecha_compra: '2026-02-12', fecha_venta: '2026-03-05', estado: 'vendido',       color: 'Plata',  kilometraje: 38000, gastos_adicionales: 0 },
    { id: VID(5),  marca: 'Kia',        modelo: 'Sportage',  anio: 2022, precio_compra: 21000, precio_venta: 26000, fecha_compra: '2026-03-02', fecha_venta: '2026-03-22', estado: 'vendido',       color: 'Rojo',   kilometraje: 22000, gastos_adicionales: 0 },
    { id: VID(6),  marca: 'Toyota',     modelo: 'Hilux',     anio: 2020, precio_compra: 35000, precio_venta: 43000, fecha_compra: '2026-03-08', fecha_venta: '2026-03-28', estado: 'vendido',       color: 'Blanco', kilometraje: 77000, gastos_adicionales: 0 },
    { id: VID(7),  marca: 'Hyundai',    modelo: 'Tucson',    anio: 2021, precio_compra: 22000, precio_venta: 27000, fecha_compra: '2026-04-01', fecha_venta: '2026-04-10', estado: 'vendido',       color: 'Azul',   kilometraje: 31000, gastos_adicionales: 0 },
    { id: VID(8),  marca: 'Nissan',     modelo: 'Frontier',  anio: 2020, precio_compra: 28000, precio_venta: 34000, fecha_compra: '2026-04-03', fecha_venta: '2026-04-22', estado: 'vendido',       color: 'Gris',   kilometraje: 54000, gastos_adicionales: 0 },
    { id: VID(9),  marca: 'Ford',       modelo: 'Ranger',    anio: 2022, precio_compra: 30000, precio_venta: 36500, fecha_compra: '2026-04-08', fecha_venta: '2026-04-25', estado: 'vendido',       color: 'Negro',  kilometraje: 19000, gastos_adicionales: 0 },
    { id: VID(10), marca: 'Volkswagen', modelo: 'Tiguan',    anio: 2023, precio_compra: 29000, precio_venta: null,  fecha_compra: '2026-03-15', fecha_venta: null,          estado: 'en_stock',      color: 'Blanco', kilometraje: 12000, gastos_adicionales: 0 },
    { id: VID(11), marca: 'Kia',        modelo: 'Cerato',    anio: 2022, precio_compra: 16500, precio_venta: null,  fecha_compra: '2026-04-02', fecha_venta: null,          estado: 'en_reparacion', color: 'Rojo',   kilometraje: 45000, gastos_adicionales: 800 },
  ].map(v => ({ ...v, user_id: uid, notas: '', vin: null }))

  const gastos = [
    // Enero
    { id: GID(1),  descripcion: 'Alquiler local',        monto: 1200, categoria: 'alquiler',  fecha: '2026-01-01' },
    { id: GID(2),  descripcion: 'Electricidad y agua',   monto: 180,  categoria: 'servicios', fecha: '2026-01-04' },
    { id: GID(3),  descripcion: 'Instagram Ads',         monto: 320,  categoria: 'marketing', fecha: '2026-01-08' },
    { id: GID(4),  descripcion: 'Sueldo administrativo', monto: 900,  categoria: 'personal',  fecha: '2026-01-10' },
    // Febrero
    { id: GID(5),  descripcion: 'Alquiler local',        monto: 1200, categoria: 'alquiler',  fecha: '2026-02-01' },
    { id: GID(6),  descripcion: 'Internet fibra',        monto: 95,   categoria: 'servicios', fecha: '2026-02-05' },
    { id: GID(7),  descripcion: 'Google Ads',            monto: 480,  categoria: 'marketing', fecha: '2026-02-10' },
    { id: GID(8),  descripcion: 'Contadora',             monto: 350,  categoria: 'personal',  fecha: '2026-02-15' },
    { id: GID(9),  descripcion: 'Limpieza local',        monto: 120,  categoria: 'otro',      fecha: '2026-02-18' },
    // Marzo
    { id: GID(10), descripcion: 'Alquiler local',        monto: 1200, categoria: 'alquiler',  fecha: '2026-03-01' },
    { id: GID(11), descripcion: 'Electricidad y agua',   monto: 210,  categoria: 'servicios', fecha: '2026-03-03' },
    { id: GID(12), descripcion: 'Instagram Ads',         monto: 550,  categoria: 'marketing', fecha: '2026-03-06' },
    { id: GID(13), descripcion: 'Sueldo administrativo', monto: 950,  categoria: 'personal',  fecha: '2026-03-10' },
    { id: GID(14), descripcion: 'Herramientas',          monto: 280,  categoria: 'otro',      fecha: '2026-03-20' },
    // Abril
    { id: GID(15), descripcion: 'Alquiler local',        monto: 1200, categoria: 'alquiler',  fecha: '2026-04-01' },
    { id: GID(16), descripcion: 'Electricidad y agua',   monto: 195,  categoria: 'servicios', fecha: '2026-04-03' },
    { id: GID(17), descripcion: 'MercadoLibre premium',  monto: 140,  categoria: 'marketing', fecha: '2026-04-11' },
    { id: GID(18), descripcion: 'Contadora',             monto: 350,  categoria: 'personal',  fecha: '2026-04-15' },
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
    supabase.from('vehiculos').delete().in('id', MOCK_V_IDS),
    supabase.from('gastos_generales').delete().in('id', MOCK_G_IDS),
  ])
  if (vRes.error) return { ok: false, error: vRes.error.message }
  if (gRes.error) return { ok: false, error: gRes.error.message }
  return { ok: true }
}
