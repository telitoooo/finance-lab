/** Légende HTML : trait (séries en ligne) ou carré (barres) + libellé, en encre secondaire. */
export default function ChartLegend({ items }: { items: { label: string; color: string; shape?: 'line' | 'square' }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-secondary">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span
            className={item.shape === 'square' ? 'size-2.5 rounded-sm' : 'h-[3px] w-4 rounded-full'}
            style={{ background: item.color }}
            aria-hidden
          />
          {item.label}
        </li>
      ))}
    </ul>
  )
}
