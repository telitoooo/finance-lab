import { useEffect, useRef, useState } from 'react'

let measureCtx: CanvasRenderingContext2D | null = null

/** Largeur en pixels d'un texte rendu dans la police donnée (pour décider si un libellé tient). */
export function textWidth(text: string, font = '600 12px system-ui, -apple-system, "Segoe UI", sans-serif'): number {
  measureCtx ??= document.createElement('canvas').getContext('2d')
  if (!measureCtx) return Infinity
  measureCtx.font = font
  return measureCtx.measureText(text).width
}

/** Largeur courante d'un élément, suivie par ResizeObserver. */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}
