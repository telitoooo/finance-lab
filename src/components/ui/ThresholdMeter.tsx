export interface MeterZone {
  from: number
  to: number
  label: string
  color: string
}

/**
 * Jauge à seuils (grilles d'interprétation du cours). Chaque zone porte son libellé :
 * la couleur n'est jamais le seul indice. Le repère indique la valeur courante.
 */
export default function ThresholdMeter({
  value,
  min,
  max,
  zones,
  format,
  label,
}: {
  value: number
  min: number
  max: number
  zones: MeterZone[]
  format: (value: number) => string
  label: string
}) {
  const pos = (v: number) => ((Math.min(max, Math.max(min, v)) - min) / (max - min)) * 100
  const current = zones.find((z) => value >= z.from && value < z.to) ?? zones[zones.length - 1]

  return (
    <div className="flex flex-col gap-2" role="meter" aria-label={label} aria-valuenow={value} aria-valuemin={min} aria-valuemax={max} aria-valuetext={`${format(value)} : ${current.label}`}>
      <div className="relative pt-7">
        <div
          className="absolute top-0 flex -translate-x-1/2 flex-col items-center transition-[left] duration-300"
          style={{ left: `${pos(value)}%` }}
        >
          <span className="rounded bg-ink px-1.5 py-0.5 text-xs font-semibold whitespace-nowrap text-white tabular-nums">{format(value)}</span>
          <span className="h-2 w-0.5 bg-ink" />
        </div>
        <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
          {zones.map((z) => (
            <div key={z.label} style={{ flexGrow: pos(z.to) - pos(z.from), flexBasis: 0, background: z.color }} />
          ))}
        </div>
      </div>
      <div className="flex gap-0.5 text-[10px] leading-tight text-secondary">
        {zones.map((z) => (
          <div
            key={z.label}
            className={`min-w-0 ${z === current ? 'font-semibold text-ink' : ''}`}
            style={{ flexGrow: pos(z.to) - pos(z.from), flexBasis: 0 }}
          >
            {z.label}
          </div>
        ))}
      </div>
    </div>
  )
}
