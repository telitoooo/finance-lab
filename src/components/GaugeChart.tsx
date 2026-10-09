import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { useLang } from '../i18n/lang'
import { chrome } from '../lib/chartTheme'
import type { Tone } from './ui/StatTile'
import type { MeterZone } from './ui/ThresholdMeter'

/** Zone de jauge : la grille d'interprétation du cours, avec le ton du verdict. */
export interface GaugeZone extends MeterZone {
  tone: Exclude<Tone, 'neutral'>
}

const toneStyles = {
  good: { text: 'text-good-ink', Icon: CheckCircle2 },
  warning: { text: 'text-[#8a5a00]', Icon: AlertTriangle },
  critical: { text: 'text-critical', Icon: XCircle },
}

// Géométrie du demi-cercle (unités du viewBox).
const CX = 100
const CY = 100
const R_OUT = 88
const R_IN = 66
const GAP = 0.012 // espace entre deux zones, en fraction de demi-tour

const point = (r: number, p: number) => {
  const theta = Math.PI * (1 - p)
  return [CX + r * Math.cos(theta), CY - r * Math.sin(theta)] as const
}

function arc(p0: number, p1: number) {
  const [x0, y0] = point(R_OUT, p0)
  const [x1, y1] = point(R_OUT, p1)
  const [x2, y2] = point(R_IN, p1)
  const [x3, y3] = point(R_IN, p0)
  return `M ${x0} ${y0} A ${R_OUT} ${R_OUT} 0 0 1 ${x1} ${y1} L ${x2} ${y2} A ${R_IN} ${R_IN} 0 0 0 ${x3} ${y3} Z`
}

/**
 * Jauge semi-circulaire à seuils : chaque zone de la grille du cours a sa couleur et son libellé,
 * l'aiguille pointe la valeur courante (bornée à l'affichage). Le verdict est toujours écrit et
 * doublé d'une icône : la couleur n'est jamais le seul indice.
 */
export default function GaugeChart({
  label,
  value,
  min,
  max,
  zones,
  format,
  ticks,
}: {
  label: string
  value: number
  min: number
  max: number
  zones: GaugeZone[]
  format: (value: number) => string
  /** Valeurs graduées (par défaut : les seuils des zones compris entre min et max). */
  ticks?: number[]
}) {
  const colon = useLang() === 'fr' ? ' : ' : ': '
  const pct = (v: number) => (Math.min(max, Math.max(min, v)) - min) / (max - min)
  const current = Number.isFinite(value) ? (zones.find((z) => value >= z.from && value < z.to) ?? zones[zones.length - 1]) : zones[zones.length - 1]
  const style = toneStyles[current.tone]
  const tickValues = ticks ?? zones.map((z) => z.from).filter((v) => v > min && v < max)
  const needle = pct(Number.isFinite(value) ? value : max) * 180

  return (
    <div
      className="flex flex-col items-center gap-1 rounded-xl border border-hairline bg-white p-3"
      role="meter"
      aria-label={label}
      aria-valuenow={Number.isFinite(value) ? value : max}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuetext={`${format(value)}${colon}${current.label}`}
    >
      <p className="self-start text-xs font-medium text-secondary">{label}</p>
      <svg viewBox="-4 -2 208 114" className="w-full max-w-[16rem]" aria-hidden>
        {zones.map((z) => {
          const p0 = pct(z.from)
          const p1 = pct(z.to)
          if (p1 - p0 <= GAP) return null
          return <path key={z.label} d={arc(p0 + (p0 > 0 ? GAP / 2 : 0), p1 - (p1 < 1 ? GAP / 2 : 0))} fill={z.color} opacity={z === current ? 1 : 0.35} />
        })}
        {tickValues.map((t) => {
          const [x, y] = point(R_OUT + 8, pct(t))
          return (
            <text key={t} x={x} y={y} fontSize={9} fill={chrome.muted} textAnchor="middle" dominantBaseline="middle">
              {format(t)}
            </text>
          )
        })}
        <g style={{ transform: `rotate(${needle}deg)`, transformOrigin: `${CX}px ${CY}px`, transition: 'transform 300ms ease-out' }}>
          <line x1={CX} y1={CY} x2={CX - (R_IN - 6)} y2={CY} stroke={chrome.ink} strokeWidth={3} strokeLinecap="round" />
        </g>
        <circle cx={CX} cy={CY} r={6} fill={chrome.ink} stroke={chrome.surface} strokeWidth={2} />
      </svg>
      <p className="-mt-1 text-2xl font-semibold tracking-tight tabular-nums">{format(value)}</p>
      <p className={`flex items-center gap-1 text-center text-xs font-medium ${style.text}`}>
        <style.Icon className="size-3.5 shrink-0" aria-hidden />
        {current.label}
      </p>
    </div>
  )
}
