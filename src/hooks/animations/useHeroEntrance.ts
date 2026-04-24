import { type RefObject } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

export function useHeroEntrance(ref: RefObject<HTMLDivElement | null>) {
  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      gsap.from(ref.current, {
        scale: 0.97,
        autoAlpha: 0,
        y: 12,
        duration: 0.45,
        ease: 'power2.out',
        clearProps: 'transform,opacity,visibility',
      })
    },
    { scope: ref },
  )
}
