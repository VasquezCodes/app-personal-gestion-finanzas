import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Vehiculo, VehiculoForm } from '../types'

interface VehiculosState {
  vehiculos: Vehiculo[]
  loading: boolean
  error: string | null
  fetchVehiculos: () => Promise<void>
  crearVehiculo: (form: VehiculoForm) => Promise<string | null>
  crearVehiculosBatch: (forms: VehiculoForm[]) => Promise<{ exitosos: number; fallidos: number }>
  actualizarVehiculo: (id: string, campos: Partial<Omit<Vehiculo, 'id' | 'created_at' | 'user_id'>>) => Promise<string | null>
  eliminarVehiculo: (id: string) => Promise<string | null>
}

export const useVehiculosStore = create<VehiculosState>((set, get) => ({
  vehiculos: [],
  loading: false,
  error: null,

  fetchVehiculos: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('vehiculos')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      set({ loading: false, error: error.message })
      return
    }
    set({ vehiculos: data as Vehiculo[], loading: false })
  },

  crearVehiculo: async (form) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'No autenticado'

    const { error } = await supabase.from('vehiculos').insert({
      ...form,
      kilometraje: form.kilometraje ?? 0,
      gastos_adicionales: form.gastos_adicionales ?? 0,
      user_id: user.id,
    })

    if (error) return error.message

    await get().fetchVehiculos()
    return null
  },

  actualizarVehiculo: async (id, campos) => {
    const { error } = await supabase.from('vehiculos').update(campos).eq('id', id)
    if (error) return error.message
    set((s) => ({
      vehiculos: s.vehiculos.map((v) => v.id === id ? { ...v, ...campos } : v),
    }))
    return null
  },

  eliminarVehiculo: async (id) => {
    const { error } = await supabase.from('vehiculos').delete().eq('id', id)
    if (error) return error.message
    set((s) => ({ vehiculos: s.vehiculos.filter((v) => v.id !== id) }))
    return null
  },

  crearVehiculosBatch: async (forms) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { exitosos: 0, fallidos: forms.length }

    const rows = forms.map((f) => ({
      ...f,
      kilometraje: f.kilometraje ?? 0,
      gastos_adicionales: f.gastos_adicionales ?? 0,
      user_id: user.id,
    }))

    const { error } = await supabase.from('vehiculos').insert(rows)

    if (error) return { exitosos: 0, fallidos: forms.length }

    await get().fetchVehiculos()
    return { exitosos: forms.length, fallidos: 0 }
  },
}))
