import { useState, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

export function useCountUp(target: number, ready: boolean): string {
  const [displayed, setDisplayed] = useState(0)
  const valRef = useRef({ val: 0 })

  useGSAP(() => {
    if (!ready) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayed(target)
      return
    }
    gsap.to(valRef.current, {
      val: target,
      duration: 0.9,
      ease: 'power2.out',
      onUpdate: () => setDisplayed(Math.round(valRef.current.val)),
    })
  }, { dependencies: [target, ready], revertOnUpdate: true })

  return `$${displayed.toLocaleString('es-AR')}`
}
