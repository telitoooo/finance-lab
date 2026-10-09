import { useState } from 'react'
import { useCopy } from '../i18n/lang'
import { inkOn } from '../lib/chartTheme'
import { formatMillions, formatPercent } from '../lib/format'
import { textWidth, useElementWidth } from '../lib/measure'

export interface BalanceSegment {
  id: string
  label: string
  /** Libellé court affiché dans le bloc s'il tient. */
  short?: string
  value: number
  color: string
  detail?: string
}

export interface BalanceColumn {
  id: string
  label: string
  segments: BalanceSegment[]
}

const copy = {
  fr: { detail: 'Détail :', ofTotal: 'du total' },
  en: { detail: 'Breakdown:', ofTotal: 'of total' },
}

const GAP = 2
const LABEL_FONT = '600 12px system-ui, -apple-system, "Segoe UI", sans-serif'
const VALUE_FONT = '400 12px system-ui, -apple-system, "Segoe UI", sans-serif'

/**
 * Bilan en grandes masses : une colonne par côté, des blocs proportionnels séparés par un
 * espace de 2 px. Un libellé n'est écrit dans un bloc que s'il y tient ; sinon la légende
 * (qui sert aussi de tableau des valeurs) et l'infobulle prennent le relais.
 */
export default function BalanceSheetChart({
  columns,
  height = 340,
  format = formatMillions,
  caption,
}: {
  columns: BalanceColumn[]
  height?: number
  format?: (value: number) => string
  caption?: string
}) {
  const c = useCopy(copy)
  const [active, setActive] = useState<string | null>(null)
  const totals = columns.map((c) => c.segments.reduce((s, x) => s + Math.max(0, x.value), 0))
  const maxTotal = Math.max(...totals, 1)

  return (
    <figure className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:gap-6">
        {columns.map((column, ci) => (
          <Column
            key={column.id}
            column={column}
            total={totals[ci]}
            height={(totals[ci] / maxTotal) * height}
            side={ci === 0 ? 'left' : 'right'}
            active={active}
            setActive={setActive}
            format={format}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-6">
        {columns.map((column, ci) => (
          <ul key={column.id} className="flex flex-col gap-1 text-xs" aria-label={`${c.detail} ${column.label}`}>
            {column.segments.map((s) => (
              <li
                key={s.id}
                onMouseEnter={() => setActive(s.id)}
                onMouseLeave={() => setActive(null)}
                className={`flex items-baseline gap-2 rounded px-1 py-0.5 ${active === s.id ? 'bg-neutral-100' : ''}`}
              >
                <span className="size-2.5 shrink-0 translate-y-px rounded-sm" style={{ background: s.color }} aria-hidden />
                <span className="flex-1 text-secondary">{s.label}</span>
                <span className="font-medium tabular-nums">{format(s.value)}</span>
                <span className="w-9 text-right text-muted tabular-nums">{pct(s.value, totals[ci])}</span>
              </li>
            ))}
          </ul>
        ))}
      </div>
      {caption && <figcaption className="text-xs text-muted">{caption}</figcaption>}
    </figure>
  )
}

function Column({
  column,
  total,
  height,
  side,
  active,
  setActive,
  format,
}: {
  column: BalanceColumn
  total: number
  height: number
  side: 'left' | 'right'
  active: string | null
  setActive: (id: string | null) => void
  format: (value: number) => string
}) {
  const c = useCopy(copy)
  const [ref, width] = useElementWidth<HTMLDivElement>()

  const visible = column.segments.filter((s) => s.value > 0)
  const usable = height - GAP * Math.max(0, visible.length - 1)
  const heights = visible.map((s) => (total > 0 ? (s.value / total) * usable : 0))
  const layout = visible.map((s, i) => ({
    segment: s,
    h: heights[i],
    top: heights.slice(0, i).reduce((sum, h) => sum + h + GAP, 0),
  }))
  const tip = layout.find((l) => l.segment.id === active)

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">{column.label}</p>
        <p className="text-xs text-secondary tabular-nums">{format(total)}</p>
      </div>
      <div className="relative" style={{ height }}>
        <div ref={ref} className="flex h-full flex-col overflow-hidden rounded-md" style={{ gap: GAP }}>
          {layout.map(({ segment: s, h }) => {
            const inner = width - 16
            const name = s.short ?? s.label
            const showName = h >= 22 && textWidth(name, LABEL_FONT) <= inner
            const showValue = showName && h >= 40 && textWidth(format(s.value), VALUE_FONT) <= inner
            const dimmed = active !== null && active !== s.id
            return (
              <div
                key={s.id}
                tabIndex={0}
                role="img"
                aria-label={`${s.label}: ${format(s.value)}, ${pct(s.value, total)} ${c.ofTotal}`}
                onMouseEnter={() => setActive(s.id)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(s.id)}
                onBlur={() => setActive(null)}
                className="flex min-h-0 flex-col justify-center px-2 transition-[flex-grow,opacity] duration-300 outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-inset"
                style={{ flexGrow: s.value, flexBasis: 0, background: s.color, color: inkOn(s.color), opacity: dimmed ? 0.45 : 1 }}
              >
                {showName && <span className="text-xs leading-tight font-semibold whitespace-nowrap">{name}</span>}
                {showValue && <span className="text-xs leading-tight whitespace-nowrap tabular-nums">{format(s.value)}</span>}
              </div>
            )
          })}
        </div>
        {tip && (
          <div
            role="tooltip"
            className={`pointer-events-none absolute z-10 w-52 -translate-y-1/2 rounded-lg border border-hairline bg-white p-3 text-xs shadow-lg ${
              side === 'left' ? 'left-[calc(100%+8px)]' : 'right-[calc(100%+8px)]'
            }`}
            style={{ top: Math.min(Math.max(tip.top + tip.h / 2, 30), height - 30) }}
          >
            <p className="font-semibold">{tip.segment.label}</p>
            <p className="mt-0.5 tabular-nums">
              {format(tip.segment.value)} · {pct(tip.segment.value, total)} {c.ofTotal}
            </p>
            {tip.segment.detail && <p className="mt-1 text-secondary">{tip.segment.detail}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

const pct = (value: number, total: number) => (total > 0 ? formatPercent(value / total, 0) : '–')
