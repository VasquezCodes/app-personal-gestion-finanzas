import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useThemeStore } from './store/themeStore'

gsap.registerPlugin(useGSAP)
gsap.defaults({ ease: 'power2.out', duration: 0.4 })

// Cleanup de datos legacy en localStorage (gastos/ganancias historial pasaron a Supabase).
// Sin namespace por user_id, estos valores se filtraban entre cuentas en el mismo navegador.
localStorage.removeItem('motorhub_gastos_historial')
localStorage.removeItem('motorhub_ganancias_historial')

// Init temprano del tema — antes del primer paint para evitar flash light → dark
useThemeStore.getState().init()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
