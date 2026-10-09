import { RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartLegend from '../components/ChartLegend'
import InteractiveSlider from '../components/InteractiveSlider'
import MissionBoard from '../components/MissionBoard'
import Panel from '../components/ui/Panel'
import SegmentedControl from '../components/ui/SegmentedControl'
import StatTile, { type Tone } from '../components/ui/StatTile'
import Tex from '../components/ui/Tex'
import WaterfallChart from '../components/WaterfallChart'
import { adidas } from '../data'
import { useContent } from '../i18n/content'
import { useCopy } from '../i18n/lang'
import { adidasBalance as b } from '../lib/balanceSheet'
import { axisProps, chrome, series } from '../lib/chartTheme'
import { chartTooltip } from '../lib/chartTooltip'
import * as f from '../lib/finance'
import { formatBillions, formatEurosCents, formatMillions, formatNumber, formatPercent, formatTimes, texNum, texPct } from '../lib/format'

const pnl = adidas.incomeStatement
const share = adidas.share
const s = adidas.scenarios.dcfAdidas.data as Record<string, number> & { critFlows: number[] }
const YEAR0 = adidas.meta.fiscalYear

/** Année de base du DCF : les comptes 2025 avec un BFR stable (le FCFF « normatif »). */
const baseYear = { ebitda: pnl.ebitda, ebit: pnl.ebit, taxRate: pnl.taxRate, capex: adidas.cashFlowStatement.capex, wcr: b.wcr }

const adidasDefaults = { wacc: s.wacc, g: s.growth, gx: s.explicitGrowth, multiple: s.evEbitMultiple }
type AdidasInputs = typeof adidasDefaults
const critDefaults = { wacc: s.critWacc, g: s.critGrowth, multiple: s.critMultiple }
type CritInputs = typeof critDefaults

/** Multiple VE / EBIT auquel la Bourse valorise Adidas au 31/12/2025. */
const impliedMultiple = (share.marketCap + b.netDebt) / pnl.ebit

function valueAdidas(x: AdidasInputs) {
  const proj = f.projectFcff(baseYear, x.gx, s.years, x.g)
  const r = f.dcf(proj.flows, x.wacc, x.g, proj.nextFlow)
  const equity = r ? f.equityValue(r.enterpriseValue, b.netDebt) : Infinity
  const multiplesEquity = f.equityValue(f.multipleValue(pnl.ebit, x.multiple), b.netDebt)
  return {
    proj,
    r,
    equity,
    perShare: equity / share.sharesOutstanding,
    multiplesEquity,
    multiplesPerShare: multiplesEquity / share.sharesOutstanding,
  }
}

const perShareAt = (x: AdidasInputs) => valueAdidas(x).perShare

/**
 * Convention du labo pour la recommandation : écart de plus de 10 % entre la valeur estimée et le
 * prix de marché. Le cours pose la question (BUY, HOLD ou SELL ?) sans fixer de seuil.
 */
type Call = 'BUY' | 'HOLD' | 'SELL'
function recommendation(intrinsic: number, market: number): { call: Call; tone: Tone; upside: number } {
  const upside = intrinsic / market - 1
  if (upside > 0.1) return { call: 'BUY', tone: 'good', upside }
  if (upside < -0.1) return { call: 'SELL', tone: 'critical', upside }
  return { call: 'HOLD', tone: 'warning', upside }
}

const pct1 = (v: number) => formatPercent(v, 1)
const signedPct = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${formatPercent(Math.abs(v), 0)}`
const bn = (v: number) => formatBillions(v / 1000, 1)
const euros = (v: number) => (Number.isFinite(v) ? formatEurosCents(v) : '∞')

const PRICE_AXIS_MAX = 600

const copy = {
  fr: {
    tabs: 'Choix du cas',
    tabAdidas: 'Adidas au 31/12/2025',
    tabCrit: 'Cas du cours : Crit 2021',
    reset: 'Hypothèses par défaut',
    wacc: "WACC (taux d'actualisation)",
    g: 'Croissance perpétuelle g',
    gHint: "Au-delà de 2030. Le cours retient l'inflation de long terme (2 %).",
    gx: 'Croissance annuelle 2026-2030',
    gxHint: "EBITDA, impôt, CAPEX et BFR suivent l'activité.",
    calls: { BUY: 'Acheter', HOLD: 'Conserver', SELL: 'Vendre' },
    verdictTitle: "Ton verdict d'analyste",
    perShare: 'Valeur par action (DCF)',
    perShareMultiples: 'Valeur par action (multiples)',
    price: (v: string) => `Cours au 31/12/2025 : ${v}`,
    upside: (v: string) => `Potentiel : ${v}`,
    verdictRule: 'Convention du labo : BUY au-delà de +10 %, SELL en dessous de −10 %.',
    invalid: "WACC ≤ g : Gordon-Shapiro ne s'applique plus, la valeur terminale est infinie.",
    bridge: {
      explicit: (y0: number, y1: number) => `VA des FCFF ${y0}-${y1}`,
      terminal: 'VA de la valeur terminale',
      ev: "Valeur d'entreprise",
      netDebt: 'Dette nette',
      equity: 'Capitaux propres',
    },
    legend: { total: 'Valeur', outflow: 'À déduire', inflow: 'Valeur actuelle' },
    terminalShare: 'Poids de la valeur terminale',
    terminalShareSub: "Part de la VE qui vient d'après 2030",
    impliedMultiple: 'VE / EBIT implicite du DCF',
    impliedMultipleSub: (v: string) => `La Bourse paie ${v}`,
    tableTitle: 'Le détail du calcul',
    tableHead: ['Année', 'FCFF', 'Actualisation', 'Valeur actuelle'],
    terminalRow: (y: number) => `Valeur terminale (fin ${y})`,
    total: "Valeur d'entreprise",
    texEquity: '\\text{Capitaux propres}',
    texEv: '\\text{VE}',
    texNetDebt: '\\text{Dette nette}',
    texShares: '\\text{actions (M)}',
    texPrice: (v: string) => `${v}\\text{ €}`,
    sensitivityTitle: "La valeur s'envole… ou s'effondre",
    sensitivitySubtitle: 'Valeur par action selon la croissance perpétuelle g, pour trois WACC. Quand g approche du WACC, Gordon-Shapiro explose.',
    curveTitle: (g: string) => `g = ${g}`,
    waccLine: (w: string, chosen: boolean) => `WACC ${w}${chosen ? ' (choisi)' : ''}`,
    priceLine: 'Cours',
    matrixTitle: 'Matrice de sensibilité (€ par action)',
    matrixHint: 'Clique une case pour appliquer ce couple WACC / g.',
    matrixCorner: 'WACC \\ g',
    multiplesTitle: 'Et par les multiples ?',
    multiplesSubtitle: (ebit: string) => `VE = EBIT 2025 (${ebit}) × multiple VE / EBIT de comparables, puis on retire la dette nette.`,
    multiple: 'Multiple VE / EBIT retenu',
    multipleRef: 'Bourse',
    multipleHint: "À toi de choisir l'échantillon de comparables : c'est tout le débat.",
    compareTitle: 'Valeur par action selon la méthode',
    methods: ['DCF', 'Multiples', 'Cours de bourse'],
    humble:
      'Le cours le rappelle : les multiples paraissent objectifs et rapides, le DCF subjectif et « bâti sur du sable ». En réalité, les deux reposent sur des choix. On croise les méthodes, et on reste humble.',
    critStory: (origin: string) =>
      `L'exercice du cours (${origin}), avec ses chiffres : EBIT 2021 de 75 M€, dette financière 127 M€, trésorerie 405 M€, capitalisation boursière 709 M€.`,
    critMarket: 'Capitalisation boursière',
    critDcf: 'Capitaux propres (DCF)',
    critMultiples: 'Capitaux propres (multiples)',
    critMultiple: 'Multiple VE / EBIT des concurrents',
    netCashNote: (cash: string) => `Dette nette négative : ${cash} de trésorerie nette s'ajoutent à la VE.`,
    missions: [
      {
        label: 'Justifie le cours : trouve un couple (WACC, g) qui donne 169 € par action, à 5 € près',
        hint: 'Monte le WACC ou baisse g. La matrice de sensibilité aide.',
        lesson: "Le marché « price » des hypothèses : lire un cours, c'est retrouver le WACC et la croissance qu'il suppose.",
      },
      {
        label: 'Sans toucher au WACC, fais exploser la valeur au-delà de 500 € par action',
        hint: 'Rapproche g du WACC.',
        lesson: "Quand g s'approche du WACC, le dénominateur de Gordon-Shapiro tend vers zéro : g doit rester raisonnable.",
      },
      {
        label: "Montre que la valeur terminale pèse plus de 80 % de la valeur d'entreprise",
        hint: 'Augmente g ou baisse le WACC.',
        lesson: "L'essentiel de la valeur vient d'au-delà de l'horizon explicite : d'où la critique d'un DCF « bâti sur du sable ».",
      },
      {
        label: 'Rejoue le cas Crit du cours et lis sa recommandation',
        hint: 'Onglet « Cas du cours : Crit 2021 ».',
        lesson: '1 288 M€ de capitaux propres par DCF et 1 178 M€ par les multiples, pour 709 M€ en Bourse : BUY.',
      },
    ],
    badge: 'Analyste star',
  },
  en: {
    tabs: 'Choice of case',
    tabAdidas: 'Adidas at 31/12/2025',
    tabCrit: 'Course case: Crit 2021',
    reset: 'Default assumptions',
    wacc: 'WACC (discount rate)',
    g: 'Perpetual growth g',
    gHint: 'Beyond 2030. The course uses long-term inflation (2%).',
    gx: 'Annual growth 2026-2030',
    gxHint: 'EBITDA, tax, CAPEX and WCR follow the business.',
    calls: { BUY: 'Buy', HOLD: 'Hold', SELL: 'Sell' },
    verdictTitle: 'Your analyst verdict',
    perShare: 'Value per share (DCF)',
    perShareMultiples: 'Value per share (multiples)',
    price: (v: string) => `Share price at 31/12/2025: ${v}`,
    upside: (v: string) => `Upside: ${v}`,
    verdictRule: 'Lab convention: BUY above +10%, SELL below −10%.',
    invalid: 'WACC ≤ g: Gordon-Shapiro no longer applies, the terminal value is infinite.',
    bridge: {
      explicit: (y0: number, y1: number) => `PV of FCFF ${y0}-${y1}`,
      terminal: 'PV of terminal value',
      ev: 'Enterprise value',
      netDebt: 'Net debt',
      equity: 'Equity',
    },
    legend: { total: 'Value', outflow: 'To deduct', inflow: 'Present value' },
    terminalShare: 'Weight of the terminal value',
    terminalShareSub: 'Share of EV coming from after 2030',
    impliedMultiple: 'EV / EBIT implied by the DCF',
    impliedMultipleSub: (v: string) => `The market pays ${v}`,
    tableTitle: 'The detailed computation',
    tableHead: ['Year', 'FCFF', 'Discount factor', 'Present value'],
    terminalRow: (y: number) => `Terminal value (end of ${y})`,
    total: 'Enterprise value',
    texEquity: '\\text{Equity}',
    texEv: '\\text{EV}',
    texNetDebt: '\\text{Net debt}',
    texShares: '\\text{shares (m)}',
    texPrice: (v: string) => `\\text{€}${v}`,
    sensitivityTitle: 'Value soars… or collapses',
    sensitivitySubtitle: 'Value per share as a function of perpetual growth g, for three WACCs. As g approaches the WACC, Gordon-Shapiro explodes.',
    curveTitle: (g: string) => `g = ${g}`,
    waccLine: (w: string, chosen: boolean) => `WACC ${w}${chosen ? ' (chosen)' : ''}`,
    priceLine: 'Share price',
    matrixTitle: 'Sensitivity matrix (€ per share)',
    matrixHint: 'Click a cell to apply that WACC / g pair.',
    matrixCorner: 'WACC \\ g',
    multiplesTitle: 'And with multiples?',
    multiplesSubtitle: (ebit: string) => `EV = 2025 EBIT (${ebit}) × EV / EBIT multiple of peers, then subtract net debt.`,
    multiple: 'EV / EBIT multiple used',
    multipleRef: 'Market',
    multipleHint: 'You choose the sample of peers: that is the whole debate.',
    compareTitle: 'Value per share by method',
    methods: ['DCF', 'Multiples', 'Share price'],
    humble:
      'As the course reminds us: multiples look objective and quick, the DCF subjective and "built on sand". In reality, both rest on choices. Combine methods, and stay humble.',
    critStory: (origin: string) =>
      `The course exercise (${origin}), with its figures: 2021 EBIT of €75m, financial debt €127m, cash €405m, market capitalisation €709m.`,
    critMarket: 'Market capitalisation',
    critDcf: 'Equity (DCF)',
    critMultiples: 'Equity (multiples)',
    critMultiple: 'EV / EBIT multiple of competitors',
    netCashNote: (cash: string) => `Negative net debt: ${cash} of net cash is added to the EV.`,
    missions: [
      {
        label: 'Justify the share price: find a (WACC, g) pair giving €169 per share, within €5',
        hint: 'Raise the WACC or lower g. The sensitivity matrix helps.',
        lesson: 'The market prices assumptions: reading a share price means finding the WACC and growth it implies.',
      },
      {
        label: 'Without touching the WACC, push the value above €500 per share',
        hint: 'Bring g closer to the WACC.',
        lesson: "As g gets close to the WACC, Gordon-Shapiro's denominator goes to zero: g must stay reasonable.",
      },
      {
        label: 'Show that the terminal value weighs more than 80% of the enterprise value',
        hint: 'Raise g or lower the WACC.',
        lesson: 'Most of the value comes from beyond the explicit horizon: hence the criticism of a DCF "built on sand".',
      },
      {
        label: "Replay the course's Crit case and read its recommendation",
        hint: 'Tab "Course case: Crit 2021".',
        lesson: '€1,288m of equity by DCF and €1,178m by multiples, for €709m on the market: BUY.',
      },
    ],
    badge: 'Star analyst',
  },
}

type Tab = 'adidas' | 'crit'

export default function ValuationLab() {
  const c = useCopy(copy)
  const [tab, setTab] = useState<Tab>('adidas')
  const [visitedCrit, setVisitedCrit] = useState(false)
  const [x, setX] = useState<AdidasInputs>(adidasDefaults)
  const v = valueAdidas(x)
  const tvShare = v.r ? v.r.pvTerminal / v.r.enterpriseValue : 1

  const missions = c.missions.map((mission, i) => ({
    ...mission,
    id: ['justify-price', 'explode', 'terminal-80', 'crit-buy'][i],
    done: [
      Math.abs(v.perShare - share.yearEndPrice) <= 5,
      v.perShare > 500 && Math.abs(x.wacc - adidasDefaults.wacc) < 1e-9,
      tvShare > 0.8,
      visitedCrit,
    ][i],
  }))

  return (
    <div className="flex flex-col gap-6">
      <SegmentedControl
        label={c.tabs}
        value={tab}
        onChange={(t) => {
          setTab(t)
          if (t === 'crit') setVisitedCrit(true)
        }}
        options={[
          { value: 'adidas', label: c.tabAdidas },
          { value: 'crit', label: c.tabCrit },
        ]}
      />
      {tab === 'adidas' ? <AdidasDcf x={x} setX={setX} /> : <CritCase />}
      <MissionBoard storageId="valuation" missions={missions} badge={c.badge} />
    </div>
  )
}

// --- Adidas -----------------------------------------------------------------------------------

function AdidasDcf({ x, setX }: { x: AdidasInputs; setX: (updater: (prev: AdidasInputs) => AdidasInputs) => void }) {
  const c = useCopy(copy)
  const scenario = useContent().adidas.scenarios.dcfAdidas
  const set = (key: keyof AdidasInputs) => (value: number) => setX((prev) => ({ ...prev, [key]: value }))
  const v = valueAdidas(x)
  const verdict = recommendation(v.perShare, share.yearEndPrice)
  const lastYear = YEAR0 + s.years

  return (
    <>
      <Panel
        title={scenario.title}
        subtitle={scenario.story}
        actions={
          <button type="button" onClick={() => setX(() => adidasDefaults)} className="inline-flex items-center gap-1 text-sm text-secondary hover:text-ink">
            <RotateCcw className="size-4" aria-hidden /> {c.reset}
          </button>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <InteractiveSlider label={c.wacc} value={x.wacc} min={0.05} max={0.12} step={0.001} onChange={set('wacc')} format={pct1} reference={{ value: adidasDefaults.wacc, label: 'base' }} />
            <InteractiveSlider label={c.g} value={x.g} min={0} max={0.06} step={0.001} onChange={set('g')} format={pct1} hint={c.gHint} />
            <InteractiveSlider label={c.gx} value={x.gx} min={-0.05} max={0.15} step={0.005} onChange={set('gx')} format={signedPct} hint={c.gxHint} />
            <VerdictCard
              title={c.verdictTitle}
              valueLabel={c.perShare}
              value={euros(v.perShare)}
              market={c.price(formatEurosCents(share.yearEndPrice))}
              verdict={v.r ? verdict : null}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            {v.r ? (
              <>
                <WaterfallChart
                  legend={c.legend}
                  format={bn}
                  tickFormat={(t) => formatNumber(t / 1000)}
                  steps={[
                    { id: 'explicit', label: c.bridge.explicit(YEAR0 + 1, lastYear), kind: 'delta', value: v.r.pvExplicit },
                    { id: 'terminal', label: c.bridge.terminal, kind: 'delta', value: v.r.pvTerminal },
                    { id: 'ev', label: c.bridge.ev, kind: 'total', value: v.r.enterpriseValue },
                    { id: 'net-debt', label: c.bridge.netDebt, kind: 'delta', value: -b.netDebt },
                    { id: 'equity', label: c.bridge.equity, kind: 'total', value: v.equity },
                  ]}
                />
                <div className="overflow-x-auto rounded-xl border border-hairline bg-white p-3 text-[11px] sm:text-sm">
                  <Tex
                    display
                    math={`\\frac{${c.texEv} - ${c.texNetDebt}}{${c.texShares}} = \\frac{${texNum(v.r.enterpriseValue)} - ${texNum(b.netDebt)}}{${texNum(share.sharesOutstanding, 1)}} = \\mathbf{${c.texPrice(texNum(v.perShare, 2))}}`}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <StatTile
                    label={c.terminalShare}
                    value={formatPercent(v.r.pvTerminal / v.r.enterpriseValue, 0)}
                    sub={c.terminalShareSub}
                    tone={v.r.pvTerminal / v.r.enterpriseValue > 0.8 ? 'warning' : 'neutral'}
                  />
                  <StatTile label={c.impliedMultiple} value={formatTimes(v.r.enterpriseValue / pnl.ebit)} sub={c.impliedMultipleSub(formatTimes(impliedMultiple))} />
                </div>
              </>
            ) : (
              <StatTile label={c.bridge.ev} value="∞" sub={c.invalid} tone="critical" />
            )}
          </div>
        </div>

        {v.r && <ProjectionTable flows={v.proj.flows} wacc={x.wacc} r={v.r} firstYear={YEAR0 + 1} format={formatMillions} />}
      </Panel>

      <Panel title={c.sensitivityTitle} subtitle={c.sensitivitySubtitle}>
        <SensitivityCurve x={x} />
        <SensitivityMatrix x={x} onPick={(wacc, g) => setX((prev) => ({ ...prev, wacc, g }))} />
      </Panel>

      <MultiplesPanel x={x} setMultiple={set('multiple')} dcfPerShare={v.perShare} />
    </>
  )
}

function VerdictCard({
  title,
  valueLabel,
  value,
  market,
  verdict,
}: {
  title: string
  valueLabel: string
  value: string
  market: string
  verdict: ReturnType<typeof recommendation> | null
}) {
  const c = useCopy(copy)
  const ring = verdict?.tone === 'good' ? 'border-good/50 bg-good/5' : verdict?.tone === 'critical' ? 'border-critical/40 bg-critical/5' : 'border-warning/60 bg-warning/5'
  const ink = verdict?.tone === 'good' ? 'text-good-ink' : verdict?.tone === 'critical' ? 'text-critical' : 'text-[#8a5a00]'
  return (
    <div className={`flex flex-col gap-1 rounded-xl border p-4 ${verdict ? ring : 'border-hairline bg-white'}`}>
      <p className="text-xs font-semibold tracking-wider text-secondary uppercase">{title}</p>
      {verdict && (
        <p className={`text-3xl font-bold tracking-tight ${ink}`}>
          {verdict.call} <span className="text-base font-medium">· {c.calls[verdict.call]}</span>
        </p>
      )}
      <p className="mt-1 text-xs text-secondary">{valueLabel}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-secondary">{market}</p>
      {verdict && <p className={`text-xs font-medium ${ink}`}>{c.upside(signedPct(verdict.upside))}</p>}
      <p className="mt-1 text-[11px] text-muted">{c.verdictRule}</p>
    </div>
  )
}

function ProjectionTable({
  flows,
  wacc,
  r,
  firstYear,
  format,
}: {
  flows: number[]
  wacc: number
  r: NonNullable<ReturnType<typeof f.dcf>>
  firstYear: number
  format: (v: number) => string
}) {
  const c = useCopy(copy)
  const lastYear = firstYear + flows.length - 1
  return (
    <details className="rounded-xl border border-hairline bg-white p-3 text-sm">
      <summary className="cursor-pointer font-medium">{c.tableTitle}</summary>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[28rem] text-left text-xs tabular-nums">
          <thead className="text-secondary">
            <tr>
              {c.tableHead.map((h, i) => (
                <th key={h} className={`py-1 font-medium ${i > 0 ? 'text-right' : ''}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {flows.map((flow, i) => (
              <tr key={i} className="border-t border-hairline">
                <td className="py-1">{firstYear + i}</td>
                <td className="text-right">{format(flow)}</td>
                <td className="text-right">{formatNumber(1 / (1 + wacc) ** (i + 1), 3, 3)}</td>
                <td className="text-right">{format(r.pvFlows[i])}</td>
              </tr>
            ))}
            <tr className="border-t border-hairline">
              <td className="py-1">{c.terminalRow(lastYear)}</td>
              <td className="text-right">{format(r.terminalValue)}</td>
              <td className="text-right">{formatNumber(1 / (1 + wacc) ** flows.length, 3, 3)}</td>
              <td className="text-right">{format(r.pvTerminal)}</td>
            </tr>
            <tr className="border-t border-ink font-semibold">
              <td className="py-1">{c.total}</td>
              <td />
              <td />
              <td className="text-right">{format(r.enterpriseValue)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  )
}

function SensitivityCurve({ x }: { x: AdidasInputs }) {
  const c = useCopy(copy)
  const waccs = [x.wacc - 0.01, x.wacc, x.wacc + 0.01]
  const colors = [series.aqua, series.blue, series.violet]
  const data = Array.from({ length: 61 }, (_, i) => {
    const g = i / 1000
    const point: Record<string, number | null> = { g }
    waccs.forEach((wacc, k) => {
      point[`w${k}`] = wacc - g > 0.0015 ? perShareAt({ ...x, wacc, g }) : null
    })
    return point
  })
  const current = perShareAt(x)
  return (
    <figure className="flex flex-col gap-2">
      <ChartLegend
        items={[
          ...waccs.map((w, k) => ({ label: c.waccLine(pct1(w), k === 1), color: colors[k] })),
          { label: c.priceLine, color: chrome.ink },
        ]}
      />
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
            <CartesianGrid vertical={false} stroke={chrome.grid} />
            <XAxis dataKey="g" type="number" domain={[0, 0.06]} ticks={[0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06]} {...axisProps} tickFormatter={(v: number) => formatPercent(v, 0)} />
            <YAxis {...axisProps} domain={[0, PRICE_AXIS_MAX]} allowDataOverflow width={56} tickFormatter={(v: number) => formatEurosCents(v, 0)} />
            <ReferenceLine y={share.yearEndPrice} stroke={chrome.ink} strokeDasharray="4 4" />
            <Tooltip content={chartTooltip({ format: (v) => formatEurosCents(v), title: (g) => c.curveTitle(pct1(Number(g))) })} />
            {waccs.map((w, k) => (
              <Line
                key={k}
                dataKey={`w${k}`}
                name={c.waccLine(pct1(w), k === 1)}
                stroke={colors[k]}
                strokeWidth={k === 1 ? 2.5 : 1.5}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
            {Number.isFinite(current) && (
              <ReferenceDot x={x.g} y={Math.min(current, PRICE_AXIS_MAX)} r={6} fill={series.blue} stroke={chrome.surface} strokeWidth={2} ifOverflow="visible" />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}

function SensitivityMatrix({ x, onPick }: { x: AdidasInputs; onPick: (wacc: number, g: number) => void }) {
  const c = useCopy(copy)
  const round = (v: number) => Math.round(v * 10000) / 10000
  const waccs = [-0.015, -0.01, -0.005, 0, 0.005, 0.01, 0.015].map((d) => round(x.wacc + d)).filter((w) => w > 0)
  const gs = [-0.01, -0.005, 0, 0.005, 0.01].map((d) => round(x.g + d)).filter((g) => g >= 0)
  const cellStyle: Record<Tone, string> = {
    good: 'bg-good/15 text-good-ink',
    warning: 'bg-warning/25 text-[#8a5a00]',
    critical: 'bg-critical/15 text-critical',
    neutral: 'bg-neutral-100',
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold">{c.matrixTitle}</h4>
        <p className="text-xs text-secondary">{c.matrixHint}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[26rem] border-separate border-spacing-1 text-center text-xs tabular-nums">
          <thead>
            <tr>
              <th className="text-left font-medium text-secondary">{c.matrixCorner}</th>
              {gs.map((g) => (
                <th key={g} className="font-medium text-secondary">
                  {pct1(g)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {waccs.map((wacc) => (
              <tr key={wacc}>
                <th className="text-left font-medium text-secondary">{pct1(wacc)}</th>
                {gs.map((g) => {
                  const value = wacc > g ? perShareAt({ ...x, wacc, g }) : Infinity
                  const tone = Number.isFinite(value) ? recommendation(value, share.yearEndPrice).tone : 'good'
                  const active = Math.abs(wacc - x.wacc) < 1e-9 && Math.abs(g - x.g) < 1e-9
                  return (
                    <td key={g} className="p-0">
                      <button
                        type="button"
                        onClick={() => onPick(wacc, g)}
                        className={`w-full rounded-md px-2 py-1.5 font-medium ${cellStyle[tone]} ${active ? 'ring-2 ring-ink' : 'hover:ring-1 hover:ring-ink/40'}`}
                        aria-pressed={active}
                      >
                        {Number.isFinite(value) ? formatNumber(value) : '∞'}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MultiplesPanel({ x, setMultiple, dcfPerShare }: { x: AdidasInputs; setMultiple: (v: number) => void; dcfPerShare: number }) {
  const c = useCopy(copy)
  const v = valueAdidas(x)
  const verdict = recommendation(v.multiplesPerShare, share.yearEndPrice)
  const bars = [
    { name: c.methods[0], value: Number.isFinite(dcfPerShare) ? dcfPerShare : PRICE_AXIS_MAX, color: series.blue },
    { name: c.methods[1], value: v.multiplesPerShare, color: series.aqua },
    { name: c.methods[2], value: share.yearEndPrice, color: chrome.secondary },
  ].map((bar) => ({ ...bar, label: formatEurosCents(bar.value) }))
  return (
    <Panel title={c.multiplesTitle} subtitle={c.multiplesSubtitle(formatMillions(pnl.ebit))}>
      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <InteractiveSlider
            label={c.multiple}
            value={x.multiple}
            min={8}
            max={25}
            step={0.5}
            onChange={setMultiple}
            format={(m) => formatTimes(m)}
            reference={{ value: impliedMultiple, label: c.multipleRef }}
            hint={c.multipleHint}
          />
          <StatTile
            label={c.perShareMultiples}
            value={formatEurosCents(v.multiplesPerShare)}
            sub={`${verdict.call} · ${c.upside(signedPct(verdict.upside))}`}
            tone={verdict.tone}
          />
        </div>
        <figure className="flex min-w-0 flex-col gap-2">
          <figcaption className="text-sm text-secondary">{c.compareTitle}</figcaption>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bars} layout="vertical" margin={{ top: 4, right: 80, bottom: 4, left: 4 }} barCategoryGap={8}>
                <CartesianGrid horizontal={false} stroke={chrome.grid} />
                <XAxis type="number" {...axisProps} tickFormatter={(n: number) => formatEurosCents(n, 0)} />
                <YAxis type="category" dataKey="name" {...axisProps} width={110} />
                <Bar dataKey="value" barSize={20} radius={3} isAnimationActive={false}>
                  {bars.map((bar) => (
                    <Cell key={bar.name} fill={bar.color} />
                  ))}
                  <LabelList dataKey="label" position="right" fill={chrome.secondary} fontSize={12} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </figure>
      </div>
      <p className="max-w-prose text-sm text-secondary">{c.humble}</p>
    </Panel>
  )
}

// --- Cas Crit (exercice du cours) ---------------------------------------------------------------

function CritCase() {
  const c = useCopy(copy)
  const scenario = useContent().adidas.scenarios.dcfAdidas
  const [x, setX] = useState<CritInputs>(critDefaults)
  const set = (key: keyof CritInputs) => (value: number) => setX((prev) => ({ ...prev, [key]: value }))
  const r = f.dcf(s.critFlows, x.wacc, x.g)
  const netDebt = s.critDebt - s.critCash
  const equityDcf = r ? f.equityValue(r.enterpriseValue, netDebt) : Infinity
  const equityMultiples = f.equityValue(f.multipleValue(s.critEbit, x.multiple), netDebt)
  const dcfVerdict = recommendation(equityDcf, s.critMarketCap)
  const multiplesVerdict = recommendation(equityMultiples, s.critMarketCap)
  const m = (v: number) => (Number.isFinite(v) ? formatMillions(v, 0) : '∞')

  return (
    <Panel
      title={c.tabCrit}
      subtitle={c.critStory(scenario.pdfOrigin)}
      actions={
        <button type="button" onClick={() => setX(critDefaults)} className="inline-flex items-center gap-1 text-sm text-secondary hover:text-ink">
          <RotateCcw className="size-4" aria-hidden /> {c.reset}
        </button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <InteractiveSlider label={c.wacc} value={x.wacc} min={0.05} max={0.12} step={0.001} onChange={set('wacc')} format={pct1} reference={{ value: critDefaults.wacc, label: 'Crit' }} />
          <InteractiveSlider label={c.g} value={x.g} min={0} max={0.05} step={0.001} onChange={set('g')} format={pct1} reference={{ value: critDefaults.g, label: 'Crit' }} />
          <InteractiveSlider
            label={c.critMultiple}
            value={x.multiple}
            min={6}
            max={18}
            step={0.5}
            onChange={set('multiple')}
            format={(v) => formatTimes(v)}
            reference={{ value: critDefaults.multiple, label: 'Crit' }}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile label={c.critMarket} value={m(s.critMarketCap)} />
            <StatTile label={c.critDcf} value={m(equityDcf)} sub={r ? `${dcfVerdict.call} · ${c.upside(signedPct(dcfVerdict.upside))}` : c.invalid} tone={r ? dcfVerdict.tone : 'critical'} />
            <StatTile label={c.critMultiples} value={m(equityMultiples)} sub={`${multiplesVerdict.call} · ${c.upside(signedPct(multiplesVerdict.upside))}`} tone={multiplesVerdict.tone} />
          </div>
          {r && (
            <div className="overflow-x-auto rounded-xl border border-hairline bg-white p-3 text-[11px] sm:text-sm">
              <Tex
                display
                math={`${c.texEquity} = ${c.texEv} - ${c.texNetDebt} = ${texNum(r.enterpriseValue, 1)} - (${texNum(s.critDebt)} - ${texNum(s.critCash)}) = \\mathbf{${texNum(equityDcf, 1)}}`}
              />
              <Tex
                display
                math={`\\text{TV} = \\frac{${texNum(s.critFlows[s.critFlows.length - 1])} \\times (1 + ${texPct(x.g)})}{${texPct(x.wacc)} - ${texPct(x.g)}} = ${texNum(r.terminalValue, 1)}`}
              />
            </div>
          )}
          <p className="text-xs text-secondary">{c.netCashNote(formatMillions(-netDebt))}</p>
        </div>
      </div>
      {r && <ProjectionTable flows={s.critFlows} wacc={x.wacc} r={r} firstYear={2022} format={(v) => formatMillions(v, 1)} />}
    </Panel>
  )
}
