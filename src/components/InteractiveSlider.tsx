import { useId, type CSSProperties } from 'react'
import { useLang } from '../i18n/lang'

export interface SliderReference {
  value: number
  label: string
}

/**
 * Curseur contrôlé : libellé, valeur formatée, bornes, et repère facultatif (ex. valeur Adidas 2025).
 * La valeur d'état peut être plus précise que le pas (38,75 j) : seul le pouce est arrondi.
 */
export default function InteractiveSlider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format = String,
  reference,
  hint,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  format?: (value: number) => string
  reference?: SliderReference
  hint?: string
}) {
  const id = useId()
  const colon = useLang() === 'fr' ? ' : ' : ': '
  const pct = (v: number) => (Math.min(max, Math.max(min, v)) - min) / (max - min)
  // Le centre du pouce (16 px) va de 8 px à largeur − 8 px.
  const thumbLeft = (p: number) => `calc(${p * 100}% + ${8 - p * 16}px)`

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <output htmlFor={id} className="text-sm font-semibold tabular-nums">
          {format(value)}
        </output>
      </div>
      <div className="relative">
        <input
          id={id}
          type="range"
          className="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ '--fill': `${pct(value) * 100}%` } as CSSProperties}
          aria-valuetext={format(value)}
        />
        {reference && (
          <span
            className="pointer-events-none absolute top-[19px] h-2 w-px -translate-x-1/2 bg-muted"
            style={{ left: thumbLeft(pct(reference.value)) }}
            aria-hidden
          />
        )}
      </div>
      <div className="flex justify-between text-[11px] text-muted tabular-nums">
        <span>{format(min)}</span>
        {reference && (
          <span>
            ▲ {reference.label}
            {colon}
            {format(reference.value)}
          </span>
        )}
        <span>{format(max)}</span>
      </div>
      {hint && <p className="text-xs text-secondary">{hint}</p>}
    </div>
  )
}
