import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import InteractiveSlider from '../components/InteractiveSlider'
import Panel from '../components/ui/Panel'
import StatTile from '../components/ui/StatTile'
import Tex from '../components/ui/Tex'
import Toggle from '../components/ui/Toggle'
import { adidas } from '../data'
import { useContent } from '../i18n/content'
import { useCopy } from '../i18n/lang'
import { axisProps, balanceColors, chrome, series } from '../lib/chartTheme'
import * as f from '../lib/finance'
import { formatBillions, formatNumber, formatPercent, texPct } from '../lib/format'
import { textWidth, useElementWidth } from '../lib/measure'

const s = adidas.scenarios.waccCase.data as Record<string, number>
const capitalEmployed = s.equity + s.netDebt

const base = {
  ke: s.ke,
  kdBeforeTax: s.kdBeforeTax,
  taxRate: s.taxRate,
  debtShare: s.netDebt / capitalEmployed,
  nopat: s.nopatA,
}
type Inputs = typeof base

const md = (v: number, digits = 2) => formatBillions(v, digits)
const cases = [
  { id: 'A', nopat: s.nopatA },
  { id: 'B', nopat: s.nopatB },
  { id: 'C', nopat: s.nopatC },
]

const copy = {
  fr: {
    neutral: 'ROCE = WACC : rien à signaler, ni création ni destruction de valeur.',
    creation: (g: string) => `ROCE > WACC : création de valeur, goodwill de ${g}.`,
    destruction: (g: string) => `ROCE < WACC : destruction de valeur, badwill de ${g}.`,
    typicalYears: 'Années types du cours :',
    caseLabel: (id: string, nopat: string) => `Cas ${id} · NOPAT ${nopat}`,
    nopat: 'Résultat économique (NOPAT)',
    debtShare: 'Part de la dette nette D / (D + E)',
    courseRef: 'cours',
    ke: 'Coût des capitaux propres (kE)',
    keDerived: 'kE, recalculé par le levier',
    keDerivedSub: "Plus de dette = plus de risque pour l'actionnaire.",
    kd: "Taux d'emprunt avant impôt (kD')",
    tax: "Taux d'impôt (T)",
    mm: 'Modigliani-Miller : le risque se répercute sur kE. Change ensuite la part de dette : le WACC ne bouge plus.',
    with: 'avec',
    equalWacc: 'Égal au WACC',
    vsWacc: (above: boolean, wacc: string) => `${above ? 'Au-dessus' : 'En dessous'} du WACC (${wacc})`,
    netProfit: 'Résultat net',
    compareKe: (ke: string) => `à comparer à kE = ${ke}`,
    marketTitle: 'Ce que le marché paie pour les capitaux propres',
    marketSubtitle: "Valeur de marché = résultat net / kE (rente perpétuelle de l'exemple du cours, p. 323-325), en Md€.",
    noGoodwill: (v: string) => `Valeur de marché = valeur comptable (${v}) : ni goodwill ni badwill. Le résultat net couvre tout juste kE.`,
    goodwillText: (v: string, e: string, g: string) =>
      `Les actionnaires paieraient ${v} des capitaux propres comptabilisés pour ${e} : goodwill de ${g}.`,
    badwillText: (v: string, e: string, g: string) =>
      `Les capitaux propres ne valent que ${v} pour ${e} comptabilisés : badwill de ${g}. Un résultat net positif ne suffit pas, il doit couvrir kE.`,
    ladder: 'Échelle des taux :',
    book: 'Valeur comptable',
    market: 'Valeur de marché',
  },
  en: {
    neutral: 'ROCE = WACC: nothing to report, neither value creation nor destruction.',
    creation: (g: string) => `ROCE > WACC: value creation, goodwill of ${g}.`,
    destruction: (g: string) => `ROCE < WACC: value destruction, badwill of ${g}.`,
    typicalYears: 'Typical years from the course:',
    caseLabel: (id: string, nopat: string) => `Case ${id} · NOPAT ${nopat}`,
    nopat: 'Economic result (NOPAT)',
    debtShare: 'Net debt share D / (D + E)',
    courseRef: 'course',
    ke: 'Cost of equity (kE)',
    keDerived: 'kE, recomputed through leverage',
    keDerivedSub: 'More debt = more risk for the shareholder.',
    kd: "Pre-tax borrowing rate (kD')",
    tax: 'Tax rate (T)',
    mm: 'Modigliani-Miller: risk is passed on to kE. Then change the debt share: the WACC no longer moves.',
    with: 'with',
    equalWacc: 'Equal to the WACC',
    vsWacc: (above: boolean, wacc: string) => `${above ? 'Above' : 'Below'} the WACC (${wacc})`,
    netProfit: 'Net profit',
    compareKe: (ke: string) => `to compare with kE = ${ke}`,
    marketTitle: 'What the market pays for equity',
    marketSubtitle: 'Market value = net profit / kE (perpetuity of the course example, p. 323-325), in €bn.',
    noGoodwill: (v: string) => `Market value = book value (${v}): neither goodwill nor badwill. Net profit just covers kE.`,
    goodwillText: (v: string, e: string, g: string) => `Shareholders would pay ${v} for equity booked at ${e}: goodwill of ${g}.`,
    badwillText: (v: string, e: string, g: string) =>
      `Equity is worth only ${v} for ${e} booked: badwill of ${g}. A positive net profit is not enough, it must cover kE.`,
    ladder: 'Rate ladder:',
    book: 'Book value',
    market: 'Market value',
  },
}

export default function WaccLab() {
  const c = useCopy(copy)
  const scenario = useContent().adidas.scenarios.waccCase
  const [x, setX] = useState<Inputs>(base)
  /** null : kE libre. Sinon, rentabilité exigée sur l'actif économique, figée (Modigliani-Miller). */
  const [assetReturn, setAssetReturn] = useState<number | null>(null)
  const set = (key: keyof Inputs) => (value: number) => setX((p) => ({ ...p, [key]: value }))

  const debt = x.debtShare * capitalEmployed
  const equity = capitalEmployed - debt
  const kd = f.afterTaxCostOfDebt(x.kdBeforeTax, x.taxRate)
  // Formule du levier (p. 291) appliquée aux taux exigés : kE = ka + (ka − kD) × D/E.
  const ke = assetReturn === null ? x.ke : f.leverageRoe(assetReturn, kd, debt, equity)
  const wacc = f.wacc(ke, kd, equity, debt)
  const roce = f.roce(x.nopat, capitalEmployed)
  const netProfit = x.nopat - kd * debt
  const roe = f.roe(netProfit, equity)
  const equityValue = f.perpetuityValue(netProfit, ke)
  const goodwill = equityValue - equity
  const spread = roce - wacc
  const verdict =
    Math.abs(spread) < 0.0005
      ? { tone: 'neutral' as const, label: c.neutral }
      : spread > 0
        ? { tone: 'good' as const, label: c.creation(md(goodwill)) }
        : { tone: 'critical' as const, label: c.destruction(md(-goodwill)) }

  function toggleMM(on: boolean) {
    setAssetReturn(on ? wacc : null)
    if (!on) setX((p) => ({ ...p, ke }))
  }

  return (
    <div className="flex flex-col gap-6">
      <Panel title={scenario.title} subtitle={scenario.story}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-secondary">{c.typicalYears}</span>
          {cases.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => {
                setAssetReturn(null)
                setX({ ...base, nopat: k.nopat })
              }}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                Math.abs(x.nopat - k.nopat) < 1e-9 ? 'border-ink bg-ink text-white' : 'border-hairline bg-white hover:border-ink'
              }`}
            >
              {c.caseLabel(k.id, md(k.nopat, 1))}
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <InteractiveSlider label={c.nopat} value={x.nopat} min={-0.5} max={3} step={0.01} onChange={set('nopat')} format={(v) => md(v)} />
            <InteractiveSlider
              label={c.debtShare}
              value={x.debtShare}
              min={0}
              max={0.9}
              step={0.01}
              onChange={set('debtShare')}
              format={(v) => formatPercent(v, 0)}
              reference={{ value: base.debtShare, label: c.courseRef }}
            />
            {assetReturn === null ? (
              <InteractiveSlider label={c.ke} value={x.ke} min={0.04} max={0.25} step={0.001} onChange={set('ke')} format={(v) => formatPercent(v)} reference={{ value: base.ke, label: c.courseRef }} />
            ) : (
              <StatTile label={c.keDerived} value={formatPercent(ke)} sub={c.keDerivedSub} />
            )}
            <InteractiveSlider label={c.kd} value={x.kdBeforeTax} min={0} max={0.15} step={0.001} onChange={set('kdBeforeTax')} format={(v) => formatPercent(v)} reference={{ value: base.kdBeforeTax, label: c.courseRef }} />
            <InteractiveSlider label={c.tax} value={x.taxRate} min={0} max={0.5} step={0.001} onChange={set('taxRate')} format={(v) => formatPercent(v)} reference={{ value: base.taxRate, label: c.courseRef }} />
            <Toggle checked={assetReturn !== null} onChange={toggleMM}>
              {c.mm}
            </Toggle>
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <div className="overflow-x-auto rounded-xl border border-hairline bg-white p-3 text-[11px] sm:text-base">
              <Tex
                display
                math={`\\begin{aligned}\\text{WACC} &= k_E \\cdot \\tfrac{E}{D+E} + k_D \\cdot \\tfrac{D}{D+E} \\\\ &= ${texPct(ke)} \\times ${texPct(1 - x.debtShare, 0)} + ${texPct(kd, 2)} \\times ${texPct(x.debtShare, 0)} = \\mathbf{${texPct(wacc, 2)}}\\end{aligned}`}
              />
              <p className="mt-1 text-xs text-secondary">
                {c.with} <Tex math={`k_D = ${texPct(x.kdBeforeTax)} \\times (1 - ${texPct(x.taxRate)}) = ${texPct(kd, 2)}`} />
              </p>
            </div>
            <RateLadder rates={{ kd, wacc, ke, roce }} />
            <div className="grid gap-3 sm:grid-cols-3">
              <StatTile
                label={`ROCE (NOPAT / ${md(capitalEmployed, 0)})`}
                value={formatPercent(roce)}
                sub={verdict.tone === 'neutral' ? c.equalWacc : c.vsWacc(verdict.tone === 'good', formatPercent(wacc))}
                tone={verdict.tone}
              />
              <StatTile label={c.netProfit} value={md(netProfit)} sub={`NOPAT − kD × D (${md(kd * debt)})`} />
              <StatTile label="ROE" value={formatPercent(roe)} sub={c.compareKe(formatPercent(ke))} tone={roe >= ke - 0.0005 ? 'good' : 'critical'} />
            </div>
            <p className={`rounded-xl px-4 py-3 text-sm font-medium ${verdict.tone === 'good' ? 'bg-good/10 text-good-ink' : verdict.tone === 'critical' ? 'bg-critical/10 text-critical' : 'bg-neutral-100'}`}>
              {verdict.label}
            </p>
          </div>
        </div>
      </Panel>

      <Panel
        title={c.marketTitle}
        subtitle={c.marketSubtitle}
      >
        <EquityValueChart book={equity} market={equityValue} />
        <p className="text-sm text-secondary">
          {Math.abs(goodwill) < 0.005
            ? c.noGoodwill(md(equity))
            : goodwill > 0
              ? c.goodwillText(md(equityValue), md(equity), md(goodwill))
              : c.badwillText(md(equityValue), md(equity), md(-goodwill))}
        </p>
      </Panel>
    </div>
  )
}

/** Échelle des taux : kD, WACC et kE au-dessus de l'axe, ROCE en dessous (p. 318). */
function RateLadder({ rates }: { rates: { kd: number; wacc: number; ke: number; roce: number } }) {
  const c = useCopy(copy)
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const max = Math.max(0.2, rates.ke, rates.roce, rates.wacc) * 1.1
  const min = Math.min(0, rates.roce, rates.kd)
  const x = (v: number) => ((v - min) / (max - min)) * 100
  const marks = [
    { id: 'kD', value: rates.kd, color: balanceColors['net-debt'] },
    { id: 'WACC', value: rates.wacc, color: chrome.ink },
    { id: 'kE', value: rates.ke, color: balanceColors.equity },
  ]
    .sort((a, b) => a.value - b.value)
    // Deux étiquettes trop proches : la seconde monte d'une rangée.
    .map((m, i, all) => {
      const label = `${m.id} ${formatPercent(m.value)}`
      const prev = all[i - 1]
      const tooClose = prev && ((m.value - prev.value) / (max - min)) * width < textWidth(label) + 8
      return { ...m, label, row: tooClose ? 1 : 0 }
    })
  for (let i = 2; i < marks.length; i++) if (marks[i].row === 1 && marks[i - 1].row === 1) marks[i].row = 0

  return (
    <div ref={ref} className="relative mx-2 h-28" role="img" aria-label={`${c.ladder} ${marks.map((m) => m.label).join(', ')}, ROCE ${formatPercent(rates.roce)}`}>
      <div className="absolute top-14 right-0 left-0 h-px" style={{ background: chrome.axis }} />
      {marks.map((m) => (
        <div key={m.id} className="absolute flex -translate-x-1/2 flex-col items-center transition-[left] duration-300" style={{ left: `${x(m.value)}%`, top: m.row ? 0 : 20 }}>
          <span className="text-xs font-semibold whitespace-nowrap">{m.label}</span>
          <span className="w-0.5" style={{ height: m.row ? 38 : 18, background: m.color }} />
          <span className="size-3 rounded-full border-2" style={{ background: m.color, borderColor: chrome.surface }} />
        </div>
      ))}
      <div className="absolute flex -translate-x-1/2 flex-col items-center transition-[left] duration-300" style={{ left: `${x(rates.roce)}%`, top: 50 }}>
        <span className="size-3 rotate-45 border-2" style={{ background: series.blue, borderColor: chrome.surface }} />
        <span className="h-4 w-0.5" style={{ background: series.blue }} />
        <span className="text-xs font-semibold whitespace-nowrap">ROCE {formatPercent(rates.roce)}</span>
      </div>
    </div>
  )
}

function EquityValueChart({ book, market }: { book: number; market: number }) {
  const c = useCopy(copy)
  const data = [
    { name: c.book, value: book, color: chrome.axis },
    { name: c.market, value: market, color: balanceColors.equity },
  ]
  return (
    <div className="h-36">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 72, bottom: 0, left: 4 }}>
          <CartesianGrid horizontal={false} stroke={chrome.grid} />
          <XAxis type="number" {...axisProps} domain={[(dMin: number) => Math.min(0, dMin), (dMax: number) => Math.max(dMax, 1)]} tickFormatter={axisNumber} />
          <YAxis type="category" dataKey="name" {...axisProps} width={120} />
          <ReferenceLine x={0} stroke={chrome.axis} />
          <Bar dataKey="value" barSize={20} radius={4} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
            <LabelList dataKey="value" position="right" formatter={(v) => md(Number(v))} fill={chrome.secondary} fontSize={12} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

const axisNumber = (v: number) => formatNumber(v, 1)
