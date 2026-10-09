import type { ReactNode } from 'react'
import type { TooltipContentProps } from 'recharts'

/**
 * Contenu d'infobulle commun aux graphiques Recharts : titre, puis une ligne par série
 * (pastille de couleur + nom + valeur). Le texte reste en encre, jamais à la couleur de la série.
 */
export function chartTooltip({
  format,
  title,
}: {
  format: (value: number, name: string) => string
  title?: (label: ReactNode, payload: TooltipContentProps['payload']) => ReactNode
}) {
  return function ChartTooltipContent({ active, payload, label }: TooltipContentProps) {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-lg border border-hairline bg-white px-3 py-2 text-xs shadow-lg">
        <p className="mb-1 font-semibold">{title ? title(label, payload) : label}</p>
        <ul className="flex flex-col gap-0.5">
          {payload
            .filter((item) => item.value !== undefined && item.value !== null)
            .map((item) => (
              <li key={String(item.dataKey ?? item.name)} className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: item.color ?? item.payload?.fill }} aria-hidden />
                <span className="text-secondary">{item.name}</span>
                <span className="ml-auto pl-3 font-medium tabular-nums">
                  {format(Array.isArray(item.value) ? Number(item.value[1]) - Number(item.value[0]) : Number(item.value), String(item.name))}
                </span>
              </li>
            ))}
        </ul>
      </div>
    )
  }
}
