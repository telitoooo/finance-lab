import { RotateCcw } from 'lucide-react'
import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import ChartLegend from '../components/ChartLegend'
import { chartTooltip } from '../lib/chartTooltip'
import InteractiveSlider from '../components/InteractiveSlider'
import Panel from '../components/ui/Panel'
import StatTile from '../components/ui/StatTile'
import Tex from '../components/ui/Tex'
import Toggle from '../components/ui/Toggle'
import { adidas } from '../data'
import { useCopy } from '../i18n/lang'
import { adidasBalance as b } from '../lib/balanceSheet'
import { axisProps, chrome, series } from '../lib/chartTheme'
import * as f from '../lib/finance'
import { formatMillions, formatNumber, formatPercent, texNum, texPct } from '../lib/format'

const pnl = adidas.incomeStatement
const taxRate = pnl.taxRate
const debt0 = adidas.derived.debtWithProvisions
const capitalEmployed0 = b.equity + debt0

/** Adidas 2025 : E, D (dette nette + provisions) et un kD' qui retrouve les 236 M€ de frais financiers nets. */
const base = {
  equity: b.equity,
  debt: debt0,
  ebit: pnl.ebit,
  kdBeforeTax: -pnl.financialResult / debt0,
}
type Inputs = typeof base

/** Hypothèse du labo (pas une formule du cours) : +2 points de taux par unité de gearing au-delà de 1. */
const RISK_SPREAD = 0.02
const effectiveKdBeforeTax = (x: Inputs, gearing: number, riskAdjusted: boolean) =>
  x.kdBeforeTax + (riskAdjusted ? RISK_SPREAD * Math.max(0, gearing - 1) : 0)

const copy = {
  fr: {
    presets: ['Adidas 2025', "Rachat d'actions financé par dette (D/E = 2)", 'Crise : EBIT −85 %'],
    title: 'Dette, capitaux propres et rentabilité',
    subtitle: 'Point de départ : Adidas 2025, dette nette et provisions pour retraites comptées dans D pour que CE = E + D.',
    reset: 'Valeurs 2025',
    debt: 'Dette nette (D)',
    equity: 'Capitaux propres (E)',
    lock: 'Capitaux employés constants : chaque euro de dette remplace un euro de capitaux propres.',
    ebit: "Résultat d'exploitation (EBIT)",
    kd: "Taux d'intérêt avant impôt (kD')",
    risk: 'Les prêteurs exigent plus quand le gearing monte (+2 points par unité de D/E au-delà de 1, hypothèse du labo).',
    tax: (t: string) => `Taux d'impôt : ${t} (taux effectif 2025).`,
    roceSub: 'NOPAT / capitaux employés',
    kdAfter: 'kD après impôt',
    positive: (v: string) => `Levier positif : +${v}`,
    negative: (v: string) => `Levier négatif : −${v}`,
    check: (ni: string, e: string, roe: string) => `Vérification : résultat net ${ni} / capitaux propres ${e} = ${roe}.`,
    curveCaption: 'ROE selon le gearing, à ROCE constant',
    up: "ROCE > kD : chaque euro de dette rapporte plus qu'il ne coûte, la courbe du ROE monte avec le gearing.",
    down: "ROCE < kD : la dette coûte plus qu'elle ne rapporte, le levier se retourne et la courbe du ROE plonge.",
    mrTitle: "D'où vient le ROCE d'Adidas ?",
    mrSubtitle: 'Marge × rotation, puis comparaison avec les entreprises citées dans le cours.',
    texMargin: '\\text{marge }',
    mrText: (rotation: string, margin: string) =>
      `Chaque euro de capital employé génère ${rotation} € de ventes, sur lesquelles Adidas garde ${margin} de résultat économique après impôt. Une marque premium joue sur la marge ; un distributeur comme Carrefour sur la rotation.`,
    peersCaption: 'ROCE comparés (le moat de Warren Buffett, p. 287-288)',
  },
  en: {
    presets: ['Adidas 2025', 'Debt-financed share buyback (D/E = 2)', 'Crisis: EBIT −85%'],
    title: 'Debt, equity and profitability',
    subtitle: 'Starting point: Adidas 2025, net debt and pension provisions counted in D so that CE = E + D.',
    reset: '2025 values',
    debt: 'Net debt (D)',
    equity: 'Equity (E)',
    lock: 'Constant capital employed: each euro of debt replaces a euro of equity.',
    ebit: 'Operating result (EBIT)',
    kd: "Pre-tax interest rate (kD')",
    risk: 'Lenders demand more as gearing rises (+2 points per unit of D/E above 1, a lab assumption).',
    tax: (t: string) => `Tax rate: ${t} (2025 effective rate).`,
    roceSub: 'NOPAT / capital employed',
    kdAfter: 'kD after tax',
    positive: (v: string) => `Positive leverage: +${v}`,
    negative: (v: string) => `Negative leverage: −${v}`,
    check: (ni: string, e: string, roe: string) => `Check: net income ${ni} / equity ${e} = ${roe}.`,
    curveCaption: 'ROE as a function of gearing, at constant ROCE',
    up: 'ROCE > kD: each euro of debt earns more than it costs, the ROE curve rises with gearing.',
    down: 'ROCE < kD: debt costs more than it earns, leverage turns around and the ROE curve plunges.',
    mrTitle: "Where does Adidas's ROCE come from?",
    mrSubtitle: 'Margin × rotation, then a comparison with the companies cited in the course.',
    texMargin: '\\text{margin }',
    mrText: (rotation: string, margin: string) =>
      `Each euro of capital employed generates €${rotation} of sales, on which Adidas keeps ${margin} of economic result after tax. A premium brand plays on margin; a retailer like Carrefour on rotation.`,
    peersCaption: "ROCE compared (Warren Buffett's moat, p. 287-288)",
  },
}

function compute(x: Inputs, riskAdjusted: boolean) {
  const gearing = x.debt / x.equity
  const nopat = f.nopat(x.ebit, taxRate)
  const capitalEmployed = x.equity + x.debt
  const roce = f.roce(nopat, capitalEmployed)
  const kd = f.afterTaxCostOfDebt(effectiveKdBeforeTax(x, gearing, riskAdjusted), taxRate)
  const roe = f.leverageRoe(roce, kd, x.debt, x.equity)
  const netIncome = nopat - kd * x.debt
  return { gearing, nopat, capitalEmployed, roce, kd, roe, netIncome }
}

export default function LeverageLab() {
  const c = useCopy(copy)
  const [x, setX] = useState<Inputs>(base)
  const [lockCapital, setLockCapital] = useState(true)
  const [riskAdjusted, setRiskAdjusted] = useState(false)
  const r = compute(x, riskAdjusted)
  const capital = lockCapital ? x.equity + x.debt : null

  // Capitaux employés constants : remplacer des capitaux propres par de la dette (rachat d'actions) ou l'inverse.
  const setDebt = (debt: number) => setX((p) => (lockCapital ? { ...p, debt, equity: Math.max(100, p.equity + p.debt - debt) } : { ...p, debt }))
  const setEquity = (equity: number) => setX((p) => (lockCapital ? { ...p, equity, debt: Math.max(0, p.equity + p.debt - equity) } : { ...p, equity }))

  const curve = Array.from({ length: 61 }, (_, i) => {
    const gearing = i * 0.05
    const kd = f.afterTaxCostOfDebt(effectiveKdBeforeTax(x, gearing, riskAdjusted), taxRate)
    return { gearing, roe: r.roce + (r.roce - kd) * gearing, roce: r.roce }
  })
  const leverageEffect = r.roe - r.roce
  const presetApply: (() => Inputs)[] = [
    () => base,
    () => ({ ...x, debt: (2 / 3) * (capital ?? capitalEmployed0), equity: (1 / 3) * (capital ?? capitalEmployed0) }),
    () => ({ ...x, ebit: pnl.ebit * 0.15 }),
  ]

  return (
    <div className="flex flex-col gap-6">
      <Panel
        title={c.title}
        subtitle={c.subtitle}
        actions={
          <button type="button" onClick={() => setX(base)} className="inline-flex items-center gap-1 text-sm text-secondary hover:text-ink">
            <RotateCcw className="size-4" aria-hidden /> {c.reset}
          </button>
        }
      >
        <div className="flex flex-wrap gap-2">
          {c.presets.map((label, i) => (
            <button key={label} type="button" onClick={() => setX(presetApply[i]())} className="rounded-lg border border-hairline bg-white px-3 py-1.5 text-sm hover:border-ink">
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <InteractiveSlider label={c.debt} value={x.debt} min={0} max={12000} step={10} onChange={setDebt} format={formatMillions} reference={{ value: base.debt, label: '2025' }} />
            <InteractiveSlider label={c.equity} value={x.equity} min={500} max={12000} step={10} onChange={setEquity} format={formatMillions} reference={{ value: base.equity, label: '2025' }} />
            <Toggle checked={lockCapital} onChange={setLockCapital}>
              {c.lock}
            </Toggle>
            <InteractiveSlider label={c.ebit} value={x.ebit} min={-500} max={4000} step={10} onChange={(ebit) => setX((p) => ({ ...p, ebit }))} format={formatMillions} reference={{ value: base.ebit, label: '2025' }} />
            <InteractiveSlider
              label={c.kd}
              value={x.kdBeforeTax}
              min={0}
              max={0.15}
              step={0.001}
              onChange={(kdBeforeTax) => setX((p) => ({ ...p, kdBeforeTax }))}
              format={(v) => formatPercent(v)}
              reference={{ value: base.kdBeforeTax, label: '2025' }}
            />
            <Toggle checked={riskAdjusted} onChange={setRiskAdjusted}>
              {c.risk}
            </Toggle>
            <p className="text-xs text-muted">{c.tax(formatPercent(taxRate))}</p>
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <StatTile label="ROCE" value={formatPercent(r.roce)} sub={c.roceSub} />
              <StatTile label={c.kdAfter} value={formatPercent(r.kd)} sub={`kD' × (1 − T)`} />
              <StatTile label="Gearing D/E" value={formatNumber(r.gearing, 2)} />
              <StatTile
                label="ROE"
                value={formatPercent(r.roe)}
                tone={leverageEffect >= 0 ? 'good' : 'critical'}
                sub={leverageEffect >= 0 ? c.positive(formatPercent(leverageEffect)) : c.negative(formatPercent(-leverageEffect))}
              />
            </div>
            <div className="overflow-x-auto rounded-xl border border-hairline bg-white p-3 text-[11px] sm:text-base">
              <Tex
                display
                math={`\\begin{aligned}\\text{ROE} &= \\text{ROCE} + (\\text{ROCE} - k_D) \\times \\tfrac{D}{E} \\\\ &= ${texPct(r.roce)} + (${texPct(r.roce)} - ${texPct(r.kd)}) \\times ${texNum(r.gearing, 2)} = \\mathbf{${texPct(r.roe)}}\\end{aligned}`}
              />
              <p className="mt-1 text-xs text-secondary">
                {c.check(formatMillions(r.netIncome), formatMillions(x.equity), formatPercent(r.netIncome / x.equity))}
              </p>
            </div>
            <figure className="flex flex-col gap-2">
              <figcaption className="flex flex-wrap items-center justify-between gap-2 text-sm text-secondary">
                <span>{c.curveCaption}</span>
                <ChartLegend
                  items={[
                    { label: 'ROE', color: series.blue },
                    { label: 'ROCE', color: chrome.muted },
                  ]}
                />
              </figcaption>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={curve} margin={{ top: 12, right: 16, bottom: 4, left: 4 }}>
                    <CartesianGrid vertical={false} stroke={chrome.grid} />
                    <XAxis dataKey="gearing" type="number" domain={[0, 3]} {...axisProps} tickFormatter={(g) => formatNumber(g, 2)} />
                    <YAxis {...axisProps} width={52} tickFormatter={(v) => formatPercent(v, 0)} />
                    <ReferenceLine y={0} stroke={chrome.axis} />
                    <Tooltip content={chartTooltip({ format: (v) => formatPercent(v), title: (g) => `D/E = ${formatNumber(Number(g), 2)}` })} />
                    <Line dataKey="roce" name="ROCE" stroke={chrome.muted} strokeWidth={2} dot={false} isAnimationActive={false} />
                    <Line dataKey="roe" name="ROE" stroke={series.blue} strokeWidth={2} dot={false} isAnimationActive={false} />
                    {r.gearing <= 3 && <ReferenceDot x={r.gearing} y={r.roe} r={5} fill={series.blue} stroke={chrome.surface} strokeWidth={2} />}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-sm text-secondary">
                {r.roce >= r.kd ? c.up : c.down}
              </p>
            </figure>
          </div>
        </div>
      </Panel>

      <MarginRotation />
    </div>
  )
}

/** ROCE = marge × rotation (p. 283), et comparaison avec les ROCE 2019 du cours (p. 287). */
function MarginRotation() {
  const c = useCopy(copy)
  const nopat = f.nopat(pnl.ebit, taxRate)
  const margin = nopat / pnl.revenue
  const rotation = pnl.revenue / b.capitalEmployed
  const roce = margin * rotation
  const peers = [
    { name: 'Apple (2019)', roce: 0.29 },
    { name: 'LVMH (2019)', roce: 0.18 },
    { name: 'Adidas (2025)', roce, highlight: true },
    { name: 'Carrefour (2019)', roce: 0.07 },
    { name: 'Volkswagen (2019)', roce: 0.02 },
  ]

  return (
    <Panel title={c.mrTitle} subtitle={c.mrSubtitle}>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="overflow-x-auto rounded-xl border border-hairline bg-white p-3 text-[11px] sm:text-base">
            <Tex
              display
              math={`\\text{ROCE} = \\underbrace{\\frac{${texNum(nopat)}}{${texNum(pnl.revenue)}}}_{${c.texMargin}${texPct(margin)}} \\times \\underbrace{\\frac{${texNum(pnl.revenue)}}{${texNum(b.capitalEmployed)}}}_{\\text{rotation } ${texNum(rotation, 2)}} = ${texPct(roce)}`}
            />
          </div>
          <p className="text-sm text-secondary">{c.mrText(formatNumber(rotation, 1), formatPercent(margin))}</p>
        </div>
        <figure className="flex flex-col gap-2">
          <figcaption className="text-sm text-secondary">{c.peersCaption}</figcaption>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peers} layout="vertical" margin={{ top: 0, right: 48, bottom: 0, left: 4 }}>
                <CartesianGrid horizontal={false} stroke={chrome.grid} />
                <XAxis type="number" {...axisProps} tickFormatter={(v) => formatPercent(v, 0)} domain={[0, 0.32]} />
                <YAxis type="category" dataKey="name" {...axisProps} width={128} interval={0} />
                <Bar dataKey="roce" barSize={16} radius={[0, 4, 4, 0]} isAnimationActive={false}>
                  {peers.map((p) => (
                    <Cell key={p.name} fill={p.highlight ? series.blue : chrome.axis} />
                  ))}
                  <LabelList dataKey="roce" position="right" formatter={(v) => formatPercent(Number(v), 0)} fill={chrome.secondary} fontSize={12} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </figure>
      </div>
    </Panel>
  )
}
