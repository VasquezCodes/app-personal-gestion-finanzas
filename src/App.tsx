import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import { TabBar } from './components/ios/TabBar'
import { AuthGuard } from './components/ios/AuthGuard'
import { PageTransition } from './components/ios/PageTransition'
import Login from './pages/Login'
import { useAuthStore } from './store/authStore'
import { useThemeStore } from './store/themeStore'

// Lazy-load todas las rutas autenticadas para bajar el bundle inicial.
// Recharts/GSAP/Framer Motion son pesados; al separarlos por chunk solo se
// descargan cuando el usuario entra a la pantalla correspondiente.
const Dashboard          = lazy(() => import('./pages/Dashboard'))
const Inventario         = lazy(() => import('./pages/Inventario'))
const VehiculoDetalle    = lazy(() => import('./pages/Vehiculo'))
const Reparaciones       = lazy(() => import('./pages/Reparaciones'))
const Gastos             = lazy(() => import('./pages/Gastos'))
const Reportes           = lazy(() => import('./pages/Reportes'))
const Configuracion      = lazy(() => import('./pages/Configuracion'))
const HistorialGastos    = lazy(() => import('./pages/Gastos/HistorialGastos'))
const HistorialGanancias = lazy(() => import('./pages/Reportes/HistorialGanancias'))
const ReparacionesGastos = lazy(() => import('./pages/Gastos/Reparaciones'))
const EstadoResultados   = lazy(() => import('./pages/Dashboard/EstadoResultados'))

function RouteLoading() {
  return (
    <div style={{
      height: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        border: '2.5px solid var(--btn-ghost-bg)',
        borderTopColor: 'var(--ink)',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

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
        <Suspense fallback={<RouteLoading />}>
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
        </Suspense>
      </PageTransition>
      <TabBar />
    </div>
  )
}

export default function App() {
  const init = useAuthStore((s) => s.init)
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const bindUser = useThemeStore((s) => s.bindUser)

  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    bindUser(userId)
  }, [userId, bindUser])

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
