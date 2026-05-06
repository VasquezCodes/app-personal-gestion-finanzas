import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { TabBar } from './components/ios/TabBar'
import { AuthGuard } from './components/ios/AuthGuard'
import { PageTransition } from './components/ios/PageTransition'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Inventario from './pages/Inventario'
import VehiculoDetalle from './pages/Vehiculo'
import Reparaciones from './pages/Reparaciones'
import Gastos from './pages/Gastos'
import Reportes from './pages/Reportes'
import Configuracion from './pages/Configuracion'
import HistorialGastos from './pages/Gastos/HistorialGastos'
import HistorialGanancias from './pages/Reportes/HistorialGanancias'
import ReparacionesGastos from './pages/Gastos/Reparaciones'
import EstadoResultados from './pages/Dashboard/EstadoResultados'
import { useAuthStore } from './store/authStore'

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
          <Route path="/gastos/historial" element={<HistorialGastos />} />
          <Route path="/gastos/reparaciones" element={<ReparacionesGastos />} />
          <Route path="/reportes/historial" element={<HistorialGanancias />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/dashboard/resumen" element={<EstadoResultados />} />
          <Route path="/configuracion" element={<Configuracion />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PageTransition>
      <TabBar />
    </div>
  )
}

export default function App() {
  const init = useAuthStore((s) => s.init)

  useEffect(() => {
    init()
  }, [init])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <AuthGuard>
              <AppLayout />
            </AuthGuard>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
