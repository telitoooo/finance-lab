import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts'
import { useCopy } from '../i18n/lang'
import { axisProps, chrome, series } from '../lib/chartTheme'
import { formatNumber } from '../lib/format'
import ChartLegend from './ChartLegend'

/**
 * Étape d'une cascade : un solde (total), dont la valeur est le niveau atteint, ou un flux (delta),
 * dont la valeur signée s'ajoute au niveau courant.
 */
export interface WaterfallStep {
  id: string
  label: string
  kind: 'total' | 'delta'
  value: number
}

const copy = {
  fr: { total: 'Solde', outflow: 'Décaissement', inflow: 'Encaissement' },
  en: { total: 'Subtotal', outflow: 'Cash-out', inflow: 'Cash-in' },
}

const colors = { total: series.blue, outflow: series.orange, inflow: series.aqua }

type Row = WaterfallStep & { range: [number, number]; tone: keyof typeof colors; text: string }

/**
 * Cascade horizontale (une barre par ligne, libellés lisibles sur mobile) : les soldes partent de zéro,
 * les flux flottent entre le niveau précédent et le suivant. Même grammaire visuelle que la cascade
 * du compte de résultat : bleu pour les soldes, orange pour ce qui sort, vert d'eau pour ce qui entre.
 */
export default function WaterfallChart({
  steps,
  format,
  height,
  legend,
  tickFormat = (v: number) => formatNumber(v),
}: {
  steps: WaterfallStep[]
  format: (value: number) => string
  height?: number
  /** Graduations de l'axe (par défaut : le nombre seul, l'unité étant dans les étiquettes). */
  tickFormat?: (value: number) => string
  /** Libellés de légende propres au graphique (ex. « Charge » / « Produit »). */
  legend?: { total: string; outflow: string; inflow: string }
}) {
  const c = useCopy(copy)
  const l = legend ?? c
  const rows: Row[] = []
  let level = 0
  for (const s of steps) {
    if (s.kind === 'total') {
      level = s.value
      rows.push({ ...s, range: [Math.min(0, s.value), Math.max(0, s.value)], tone: 'total', text: format(s.value) })
      continue
    }
    const from = level
    level += s.value
    const sign = s.value > 0 ? '+' : s.value < 0 ? '−' : ''
    rows.push({
      ...s,
      range: [Math.min(from, level), Math.max(from, level)],
      tone: s.value < 0 ? 'outflow' : 'inflow',
      text: `${sign}${format(Math.abs(s.value))}`,
    })
  }

  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <ChartLegend
        items={[
          { label: l.total, color: colors.total, shape: 'square' },
          { label: l.outflow, color: colors.outflow, shape: 'square' },
          { label: l.inflow, color: colors.inflow, shape: 'square' },
        ]}
      />
      <div style={{ height: height ?? rows.length * 30 + 40 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 80, bottom: 4, left: 4 }} barCategoryGap={6}>
            <CartesianGrid horizontal={false} stroke={chrome.grid} />
            <XAxis
              type="number"
              {...axisProps}
              tickFormatter={tickFormat}
              domain={['auto', 'auto']}
            />
            <YAxis type="category" dataKey="label" {...axisProps} width={150} interval={0} />
            <ReferenceLine x={0} stroke={chrome.axis} />
            <Tooltip cursor={{ fill: chrome.grid, opacity: 0.4 }} content={StepTooltip} />
            <Bar dataKey="range" barSize={18} radius={3} isAnimationActive={false}>
              {rows.map((r) => (
                <Cell key={r.id} fill={colors[r.tone]} />
              ))}
              <LabelList dataKey="text" position="right" fill={chrome.secondary} fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}

/** Infobulle : montant signé de l'étape (les barres flottantes portent un intervalle). */
function StepTooltip({ active, payload }: TooltipContentProps) {
  const row = payload?.[0]?.payload as Row | undefined
  if (!active || !row) return null
  return (
    <div className="rounded-lg border border-hairline bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold">{row.label}</p>
      <p className="tabular-nums">{row.text}</p>
    </div>
  )
}
