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
  type TooltipContentProps,
} from 'recharts'
import ChartLegend from '../components/ChartLegend'
import InteractiveSlider from '../components/InteractiveSlider'
import Panel from '../components/ui/Panel'
import SegmentedControl from '../components/ui/SegmentedControl'
import StatTile from '../components/ui/StatTile'
import Tex from '../components/ui/Tex'
import { adidas } from '../data'
import { useContent } from '../i18n/content'
import { useCopy } from '../i18n/lang'
import { axisProps, chrome, series } from '../lib/chartTheme'
import { chartTooltip } from '../lib/chartTooltip'
import * as f from '../lib/finance'
import { formatEuros, formatMillions, formatNumber, formatPercent, texMillions, texNum, texPct } from '../lib/format'

type Tab = 'adidas' | 'popup'

const copy = {
  fr: {
    tabs: "Choix de l'exercice",
    tabAdidas: 'Cascade Adidas 2025',
    tabPopup: 'Pop-up store : résultat ≠ trésorerie',
    steps: {
      revenue: "Chiffre d'affaires",
      cogs: 'Coût des ventes',
      otherIncome: 'Autres produits',
      opex: 'Charges opérationnelles',
      depreciation: 'Amortissements (D&A)',
      financial: 'Résultat financier',
      ebt: 'Résultat avant impôt',
      tax: 'Impôt sur les sociétés',
      discontinued: 'Activités abandonnées',
      net: 'Résultat net',
    },
    waterfallTitle: 'La cascade du compte de résultat 2025',
    waterfallSubtitle: 'Compte de résultat consolidé Adidas 2025, en M€. Bouge les curseurs : chaque solde se recalcule.',
    reset: 'Valeurs 2025',
    revenue: "Chiffre d'affaires",
    grossMarginRate: 'Taux de marge brute',
    opex: 'Charges opé. (hors D&A)',
    opexHint: 'Marketing, sponsoring, distribution, frais généraux.',
    depreciation: 'Amortissements (D&A)',
    financialResult: 'Résultat financier',
    taxRate: "Taux d'impôt",
    legendTotal: 'Solde',
    legendCharge: 'Charge',
    legendIncome: 'Produit',
    grossMargin: 'Marge brute',
    ebitdaMargin: "Marge d'EBITDA",
    ebitMargin: "Marge d'exploitation (EBIT / CA)",
    netMargin: 'Marge nette',
    loss: 'Perte',
    breakEvenTitle: "Le point mort d'Adidas",
    breakEvenSubtitle: 'Hypothèse du labo : le coût des ventes est variable ; charges opérationnelles et amortissements sont fixes.',
    texBreakEven: '\\text{Point mort}',
    distance: 'Écart entre le CA et le point mort',
    above: "Le CA dépasse le point mort : le résultat d'exploitation est positif.",
    below: "Sous le point mort : perte d'exploitation.",
    drop: 'Si les ventes baissent de 10 %',
    dropHint: 'Avec beaucoup de coûts fixes, une petite baisse de CA fait plonger le résultat (comme Iberia en 2008).',
    curveCaption: "Résultat d'exploitation selon le chiffre d'affaires (M€)",
    salesTitle: (v: string) => `CA ${v}`,
    breakEvenDot: 'Point mort',
    popupSubtitle: (origin: string, pages: string) => `Transposition du « ${origin} » du cours (p. ${pages}).`,
    pairs: 'Paires vendues par mois',
    courseRef: 'cours',
    courseScenario: 'Scénario du cours',
    badScenario: 'Scénario pessimiste',
    yearNet: "Résultat net de l'année",
    cashEnd: 'Trésorerie au 31/12',
    positiveCash: 'Trésorerie positive',
    overdraft: (v: string) => `Découvert bancaire de ${v}`,
    cash: 'Trésorerie',
    cumulative: 'Résultat net cumulé',
    opening: 'Ouv.',
    openingLong: 'Ouverture',
    monthEnd: (m: number) => `Fin du mois ${m}`,
    thousands: (v: number) => `${formatNumber(Math.round(v / 1000))} k€`,
    whyTitle: 'Pourquoi les deux courbes divergent',
    why: (cash: string, net: string, gap: string, dep: string, tax: string) =>
      `Sur l'année, la trésorerie varie de ${cash} et le résultat net vaut ${net}. L'écart de ${gap} = amortissement de l'aménagement (${dep}, charge calculée sans sortie de cash) + impôt dû à l'État mais pas encore payé (${tax}).`,
  },
  en: {
    tabs: 'Choice of exercise',
    tabAdidas: 'Adidas 2025 waterfall',
    tabPopup: 'Pop-up store: result ≠ cash',
    steps: {
      revenue: 'Revenue',
      cogs: 'Cost of sales',
      otherIncome: 'Other income',
      opex: 'Operating expenses',
      depreciation: 'Depreciation (D&A)',
      financial: 'Financial result',
      ebt: 'Income before tax',
      tax: 'Corporate tax',
      discontinued: 'Discontinued operations',
      net: 'Net income',
    },
    waterfallTitle: 'The 2025 income statement waterfall',
    waterfallSubtitle: "Adidas's 2025 consolidated income statement, in €m. Move the sliders: every margin recalculates.",
    reset: '2025 values',
    revenue: 'Revenue',
    grossMarginRate: 'Gross margin rate',
    opex: 'Operating exp. (excl. D&A)',
    opexHint: 'Marketing, sponsorship, distribution, overheads.',
    depreciation: 'Depreciation (D&A)',
    financialResult: 'Financial result',
    taxRate: 'Tax rate',
    legendTotal: 'Subtotal',
    legendCharge: 'Expense',
    legendIncome: 'Income',
    grossMargin: 'Gross margin',
    ebitdaMargin: 'EBITDA margin',
    ebitMargin: 'Operating margin (EBIT / revenue)',
    netMargin: 'Net margin',
    loss: 'Loss',
    breakEvenTitle: "Adidas's break-even point",
    breakEvenSubtitle: 'Lab assumption: cost of sales is variable; operating expenses and depreciation are fixed.',
    texBreakEven: '\\text{Break-even point}',
    distance: 'Gap between revenue and break-even point',
    above: 'Revenue is above the break-even point: the operating result is positive.',
    below: 'Below the break-even point: operating loss.',
    drop: 'If sales fall by 10%',
    dropHint: 'With high fixed costs, a small drop in revenue sinks the result (like Iberia in 2008).',
    curveCaption: 'Operating result as a function of revenue (€m)',
    salesTitle: (v: string) => `Revenue ${v}`,
    breakEvenDot: 'Break-even',
    popupSubtitle: (origin: string, pages: string) => `Transposition of the course's "${origin}" (p. ${pages}).`,
    pairs: 'Pairs sold per month',
    courseRef: 'course',
    courseScenario: 'Course scenario',
    badScenario: 'Pessimistic scenario',
    yearNet: 'Net result for the year',
    cashEnd: 'Cash at 31/12',
    positiveCash: 'Positive cash',
    overdraft: (v: string) => `Bank overdraft of ${v}`,
    cash: 'Cash',
    cumulative: 'Cumulated net result',
    opening: 'Open.',
    openingLong: 'Opening',
    monthEnd: (m: number) => `End of month ${m}`,
    thousands: (v: number) => `€${formatNumber(Math.round(v / 1000))}k`,
    whyTitle: 'Why the two curves diverge',
    why: (cash: string, net: string, gap: string, dep: string, tax: string) =>
      `Over the year, cash changes by ${cash} and the net result is ${net}. The gap of ${gap} = depreciation of the fit-out (${dep}, a calculated expense with no cash going out) + tax owed to the State but not yet paid (${tax}).`,
  },
}

export default function PnlLab() {
  const c = useCopy(copy)
  const [tab, setTab] = useState<Tab>('adidas')
  return (
    <div className="flex flex-col gap-6">
      <SegmentedControl
        label={c.tabs}
        value={tab}
        onChange={setTab}
        options={[
          { value: 'adidas', label: c.tabAdidas },
          { value: 'popup', label: c.tabPopup },
        ]}
      />
      {tab === 'adidas' ? <AdidasWaterfall /> : <PopUpStore />}
    </div>
  )
}

// --- Cascade Adidas ------------------------------------------------------------------

const pnl = adidas.incomeStatement
const defaults = {
  revenue: pnl.revenue,
  grossMargin: 1 - pnl.cogs / pnl.revenue,
  opex: pnl.operatingExpensesExDA,
  depreciation: pnl.depreciation,
  financialResult: pnl.financialResult,
  taxRate: pnl.incomeTax / pnl.incomeBeforeTax,
}

type Step = { name: string; range: [number, number]; kind: 'total' | 'charge' | 'income'; amount: number }

function buildSteps(x: typeof defaults, names: (typeof copy)['fr']['steps']) {
  const cogs = x.revenue * (1 - x.grossMargin)
  const gross = x.revenue - cogs
  const ebitda = gross + pnl.otherOperatingIncome - x.opex
  const ebit = f.ebit(ebitda, x.depreciation)
  const ebt = f.grossResult(ebit, x.financialResult)
  const tax = f.corporateTax(ebt, x.taxRate)
  const net = ebt - tax + pnl.discontinuedOperations

  const total = (name: string, value: number): Step => ({ name, range: [Math.min(0, value), Math.max(0, value)], kind: 'total', amount: value })
  const delta = (name: string, from: number, to: number): Step => ({
    name,
    range: [Math.min(from, to), Math.max(from, to)],
    kind: to < from ? 'charge' : 'income',
    amount: to - from,
  })
  const steps: Step[] = [
    total(names.revenue, x.revenue),
    delta(names.cogs, x.revenue, gross),
    delta(names.otherIncome, gross, gross + pnl.otherOperatingIncome),
    delta(names.opex, gross + pnl.otherOperatingIncome, ebitda),
    total('EBITDA', ebitda),
    delta(names.depreciation, ebitda, ebit),
    total('EBIT', ebit),
    delta(names.financial, ebit, ebt),
    total(names.ebt, ebt),
    delta(names.tax, ebt, ebt - tax),
    delta(names.discontinued, ebt - tax, net),
    total(names.net, net),
  ]
  return { steps, cogs, gross, ebitda, ebit, ebt, tax, net }
}

const stepColor = { total: series.blue, charge: series.orange, income: series.aqua }
const axisMillions = (v: number) => formatNumber(v)

function AdidasWaterfall() {
  const c = useCopy(copy)
  const [x, setX] = useState(defaults)
  const set = (key: keyof typeof defaults) => (value: number) => setX((prev) => ({ ...prev, [key]: value }))
  const r = buildSteps(x, c.steps)
  const data = r.steps.map((s) => ({ ...s, label: s.kind === 'total' ? formatMillions(s.amount) : '' }))

  // Point mort (p. 170). Hypothèse du labo : coût des ventes = coûts variables ; le reste est fixe.
  const fixedCosts = x.opex + x.depreciation - pnl.otherOperatingIncome
  const breakEven = fixedCosts / x.grossMargin
  const distance = (x.revenue - breakEven) / x.revenue
  const ebitAfterDrop = r.ebit - 0.1 * x.revenue * x.grossMargin
  const ebitSwing = r.ebit !== 0 ? (ebitAfterDrop - r.ebit) / Math.abs(r.ebit) : 0
  const curveMax = Math.max(breakEven, x.revenue) * 1.35
  const curve = Array.from({ length: 41 }, (_, i) => {
    const sales = (curveMax * i) / 40
    return { sales, ebit: sales * x.grossMargin - fixedCosts }
  })

  return (
    <div className="flex flex-col gap-6">
      <Panel
        title={c.waterfallTitle}
        subtitle={c.waterfallSubtitle}
        actions={
          <button type="button" onClick={() => setX(defaults)} className="inline-flex items-center gap-1 text-sm text-secondary hover:text-ink">
            <RotateCcw className="size-4" aria-hidden /> {c.reset}
          </button>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <InteractiveSlider label={c.revenue} value={x.revenue} min={15000} max={35000} step={50} onChange={set('revenue')} format={formatMillions} reference={{ value: pnl.revenue, label: '2025' }} />
            <InteractiveSlider label={c.grossMarginRate} value={x.grossMargin} min={0.4} max={0.6} step={0.001} onChange={set('grossMargin')} format={(v) => formatPercent(v)} reference={{ value: defaults.grossMargin, label: '2025' }} />
            <InteractiveSlider label={c.opex} value={x.opex} min={6000} max={13000} step={50} onChange={set('opex')} format={formatMillions} hint={c.opexHint} />
            <InteractiveSlider label={c.depreciation} value={x.depreciation} min={400} max={2000} step={10} onChange={set('depreciation')} format={formatMillions} />
            <InteractiveSlider label={c.financialResult} value={x.financialResult} min={-800} max={200} step={2} onChange={set('financialResult')} format={formatMillions} />
            <InteractiveSlider label={c.taxRate} value={x.taxRate} min={0} max={0.4} step={0.001} onChange={set('taxRate')} format={(v) => formatPercent(v)} reference={{ value: defaults.taxRate, label: '2025' }} />
          </div>

          <figure className="flex min-w-0 flex-col gap-2">
            <ChartLegend
              items={[
                { label: c.legendTotal, color: stepColor.total, shape: 'square' },
                { label: c.legendCharge, color: stepColor.charge, shape: 'square' },
                { label: c.legendIncome, color: stepColor.income, shape: 'square' },
              ]}
            />
            <div className="h-[26rem]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ top: 4, right: 72, bottom: 4, left: 4 }} barCategoryGap={6}>
                  <CartesianGrid horizontal={false} stroke={chrome.grid} />
                  <XAxis type="number" {...axisProps} tickFormatter={axisMillions} domain={[(min: number) => Math.min(0, min), 'auto']} />
                  <YAxis type="category" dataKey="name" {...axisProps} width={150} interval={0} />
                  <ReferenceLine x={0} stroke={chrome.axis} />
                  <Tooltip cursor={{ fill: chrome.grid, opacity: 0.4 }} content={WaterfallTooltip} />
                  <Bar dataKey="range" barSize={18} radius={3} isAnimationActive={false}>
                    {data.map((d) => (
                      <Cell key={d.name} fill={stepColor[d.kind]} />
                    ))}
                    <LabelList dataKey="label" position="right" fill={chrome.secondary} fontSize={12} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </figure>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label={c.grossMargin} value={formatPercent(r.gross / x.revenue)} />
          <StatTile label={c.ebitdaMargin} value={formatPercent(r.ebitda / x.revenue)} />
          <StatTile label={c.ebitMargin} value={formatPercent(r.ebit / x.revenue)} />
          <StatTile label={c.netMargin} value={formatPercent(r.net / x.revenue)} tone={r.net >= 0 ? 'neutral' : 'critical'} sub={r.net < 0 ? c.loss : undefined} />
        </div>
      </Panel>

      <Panel title={c.breakEvenTitle} subtitle={c.breakEvenSubtitle}>
        <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="flex flex-col gap-3">
            <Tex math={`${c.texBreakEven} = \\frac{${texNum(fixedCosts)}}{${texPct(x.grossMargin)}} = ${texMillions(breakEven)}`} />
            <StatTile
              label={c.distance}
              value={formatPercent(distance)}
              tone={distance > 0.15 ? 'good' : distance > 0 ? 'warning' : 'critical'}
              sub={distance > 0 ? c.above : c.below}
            />
            <StatTile label={c.drop} value={`EBIT ${ebitSwing >= 0 ? '+' : '−'}${formatPercent(Math.abs(ebitSwing), 0)}`} tone="warning" sub={c.dropHint} />
          </div>
          <figure className="flex min-w-0 flex-col gap-2">
            <figcaption className="text-sm text-secondary">{c.curveCaption}</figcaption>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={curve} margin={{ top: 16, right: 16, bottom: 4, left: 4 }}>
                  <CartesianGrid vertical={false} stroke={chrome.grid} />
                  <XAxis dataKey="sales" type="number" domain={[0, curveMax]} {...axisProps} tickFormatter={axisMillions} />
                  <YAxis {...axisProps} tickFormatter={axisMillions} width={64} />
                  <ReferenceLine y={0} stroke={chrome.axis} />
                  <Tooltip content={chartTooltip({ format: (v) => formatMillions(v), title: (label) => c.salesTitle(formatMillions(Number(label))) })} />
                  <Line dataKey="ebit" name="EBIT" stroke={series.blue} strokeWidth={2} dot={false} isAnimationActive={false} />
                  <ReferenceDot x={breakEven} y={0} r={5} fill={chrome.ink} stroke={chrome.surface} strokeWidth={2} label={{ value: c.breakEvenDot, position: 'top', fill: chrome.secondary, fontSize: 12 }} />
                  <ReferenceDot x={x.revenue} y={r.ebit} r={5} fill={series.blue} stroke={chrome.surface} strokeWidth={2} label={{ value: 'Adidas', position: 'left', fill: chrome.secondary, fontSize: 12 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </figure>
        </div>
      </Panel>
    </div>
  )
}

/** Infobulle de la cascade : montant signé de l'étape (les barres flottantes portent un intervalle). */
function WaterfallTooltip({ active, payload }: TooltipContentProps) {
  const step = payload?.[0]?.payload as Step | undefined
  if (!active || !step) return null
  const sign = step.kind === 'total' ? '' : step.amount >= 0 ? '+' : '−'
  return (
    <div className="rounded-lg border border-hairline bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold">{step.name}</p>
      <p className="tabular-nums">
        {sign}
        {formatMillions(Math.abs(step.amount))}
      </p>
    </div>
  )
}

// --- Pop-up store (Pizza Food Truck transposé) -------------------------------------------

const p = adidas.scenarios.popUpStore.data as Record<string, number>

function PopUpStore() {
  const c = useCopy(copy)
  const popup = useContent().adidas.scenarios.popUpStore
  const [pairs, setPairs] = useState(p.pairsPerMonth)
  const depreciation = p.fitOut / p.lifeYears / 12
  const sales = pairs * p.unitPrice
  const cashOut = pairs * p.unitCost + p.salariesPerMonth + p.miscPerMonth
  const monthlyGross = sales - cashOut - depreciation
  const yearGross = 12 * monthlyGross
  const yearTax = f.corporateTax(yearGross, p.taxRate)
  const yearNet = yearGross - yearTax
  const cashEnd = p.minCash + 12 * (sales - cashOut)
  const months = Array.from({ length: 13 }, (_, m) => ({
    month: m,
    cash: p.minCash + m * (sales - cashOut),
    result: m * (monthlyGross - f.corporateTax(monthlyGross, p.taxRate)),
  }))
  const eur = (v: number) => formatEuros(Math.round(v))

  return (
    <Panel title={popup.title} subtitle={c.popupSubtitle(popup.pdfOrigin, popup.pages.join('-'))}>
      <p className="max-w-prose text-sm text-secondary">{popup.story}</p>
      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <InteractiveSlider
            label={c.pairs}
            value={pairs}
            min={0}
            max={2000}
            step={10}
            onChange={setPairs}
            format={(v) => formatNumber(v)}
            reference={{ value: p.pairsPerMonth, label: c.courseRef }}
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setPairs(p.pairsPerMonth)} className="rounded-lg border border-hairline bg-white px-3 py-1.5 text-sm hover:border-ink">
              {c.courseScenario}
            </button>
            <button type="button" onClick={() => setPairs(p.pairsPerMonthBad)} className="rounded-lg border border-hairline bg-white px-3 py-1.5 text-sm hover:border-ink">
              {c.badScenario}
            </button>
          </div>
          <StatTile label={c.yearNet} value={eur(yearNet)} tone={yearNet >= 0 ? 'neutral' : 'critical'} sub={yearNet < 0 ? c.loss : undefined} />
          <StatTile
            label={c.cashEnd}
            value={eur(cashEnd)}
            tone={cashEnd >= 0 ? 'good' : 'critical'}
            sub={cashEnd >= 0 ? c.positiveCash : c.overdraft(eur(-cashEnd))}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <figure className="flex flex-col gap-2">
            <ChartLegend
              items={[
                { label: c.cash, color: series.blue },
                { label: c.cumulative, color: series.orange },
              ]}
            />
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={months} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
                  <CartesianGrid vertical={false} stroke={chrome.grid} />
                  <XAxis dataKey="month" {...axisProps} tickFormatter={(m) => (m === 0 ? c.opening : `M${m}`)} />
                  <YAxis {...axisProps} width={72} tickFormatter={c.thousands} />
                  <ReferenceLine y={0} stroke={chrome.axis} />
                  <Tooltip content={chartTooltip({ format: (v) => eur(v), title: (m) => (m === 0 ? c.openingLong : c.monthEnd(Number(m))) })} />
                  <Line dataKey="cash" name={c.cash} stroke={series.blue} strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line dataKey="result" name={c.cumulative} stroke={series.orange} strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </figure>
          <div className="rounded-xl bg-neutral-100 p-4 text-sm">
            <p className="font-medium">{c.whyTitle}</p>
            <p className="mt-1 text-secondary">
              {c.why(eur(cashEnd - p.minCash), eur(yearNet), eur(cashEnd - p.minCash - yearNet), eur(12 * depreciation), eur(yearTax))}
            </p>
          </div>
        </div>
      </div>
    </Panel>
  )
}
