import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import BalanceSheetChart from '../components/BalanceSheetChart'
import ChartLegend from '../components/ChartLegend'
import InteractiveSlider from '../components/InteractiveSlider'
import Panel from '../components/ui/Panel'
import StatTile from '../components/ui/StatTile'
import Tex from '../components/ui/Tex'
import ThresholdMeter from '../components/ui/ThresholdMeter'
import { adidas } from '../data'
import { useContent } from '../i18n/content'
import { useCopy, useLang } from '../i18n/lang'
import { adidasBalance as b, fundingColumns } from '../lib/balanceSheet'
import { axisProps, balanceColors, chrome, inkOn, series } from '../lib/chartTheme'
import { chartTooltip } from '../lib/chartTooltip'
import * as f from '../lib/finance'
import { formatDays, formatMillions, formatMoney, formatPercent, texNum } from '../lib/format'
import { textWidth, useElementWidth } from '../lib/measure'
import { stableRatioRange, stableRatioVerdict, stableRatioZones } from './shared'

const pnl = adidas.incomeStatement

/** Délais 2025 exacts, recalculés depuis le bilan (le curseur n'en montre que l'arrondi). */
const base = {
  dso: (b.receivables / pnl.revenue) * 365,
  dio: (b.inventories / pnl.cogs) * 365,
  dpo: (b.payables / pnl.cogs) * 365,
  growth: 0,
}
type Inputs = typeof base

/**
 * Modèle du labo : créances = délai clients × CA / 365 ; stocks et dettes fournisseurs = délai × coût
 * des ventes / 365 ; les autres postes d'exploitation suivent l'activité. Immobilisations et
 * ressources stables restent fixes : la trésorerie nette absorbe toute variation du BFR.
 */
function model(x: Inputs) {
  const scale = 1 + x.growth
  const revenue = pnl.revenue * scale
  const cogs = pnl.cogs * scale
  const receivables = (x.dso / 365) * revenue
  const inventories = (x.dio / 365) * cogs
  const payables = (x.dpo / 365) * cogs
  const otherReceivables = b.otherReceivables * scale
  const otherPayables = b.otherPayables * scale
  const wcr = f.wcr(inventories + receivables + otherReceivables, payables + otherPayables)
  const capitalEmployed = f.capitalEmployed(b.fixedAssets, wcr)
  return {
    revenue,
    wcr,
    capitalEmployed,
    netCash: f.netCashFromStructure(b.stableResources, capitalEmployed),
    stableRatio: f.stableResourcesRatio(b.stableResources, capitalEmployed),
  }
}

const presetApply: ((x: Inputs) => Inputs)[] = [
  () => base,
  () => ({ ...base, dio: base.dio + 30, dso: base.dso + 30, dpo: base.dpo - 30 }),
  (x) => ({ ...x, dpo: 120 }),
  (x) => ({ ...x, growth: 0.5 }),
]

const signedPct = (g: number) => `${g > 0 ? '+' : g < 0 ? '−' : ''}${formatPercent(Math.abs(g), 0)}`

const copy = {
  fr: {
    presets: ['Adidas 2025', 'Les 3 réflexes « sympas »', 'Usines payées à 120 j', 'Croissance de +50 %'],
    title: "Pilote le BFR d'Adidas",
    subtitle: 'Les curseurs partent des délais réels de 2025. Les immobilisations et les ressources stables ne bougent pas.',
    dso: 'Délai de paiement des clients',
    dsoHint: 'Les distributeurs (wholesale) paient à terme ; adidas.com encaisse comptant.',
    dio: 'Durée de stockage',
    dioHint: "Bateau depuis l'Asie, entrepôts, rayons.",
    dpo: 'Délai de paiement des usines',
    growth: 'Croissance des ventes',
    wcr: 'BFR',
    level2025: 'Niveau 2025',
    delta: (amount: string, up: boolean) => `${up ? '+' : '−'}${amount} vs 2025 : ${up ? 'cash consommé' : 'cash libéré'}`,
    capitalEmployed: 'Capitaux employés',
    capitalEmployedSub: 'Immobilisations + BFR',
    netCash: 'Trésorerie nette',
    covered: 'Les ressources stables couvrent les besoins',
    uncovered: "Découvert : le BFR n'est plus financé",
    texNetCash: '\\text{Trésorerie nette}',
    formulaCaption: 'ressources stables − (immobilisations + BFR), en M€',
    stableRatio: 'Ressources stables / capitaux employés',
    verdictPrefix: 'Ressources stables / capitaux employés :',
    origin: (o: string, pages: string) => `(« ${o} », p. ${pages})`,
    cycleTitle: "Le cycle d'exploitation",
    cycleSubtitle: "Une paire, de la livraison par l'usine à l'encaissement de la vente (p. 81).",
    fundingTitle: 'Emplois et ressources stables',
    fundingSubtitle: 'La trésorerie nette est le solde : quand le BFR grossit, elle fond.',
    growthTitle: 'On peut mourir en excellente santé',
    growthSubtitle: 'BFR et trésorerie nette selon la croissance des ventes, à délais constants (M€).',
    growthLabel: (g: string) => `Croissance ${g}`,
    growthLesson:
      "Avec un BFR positif, chaque euro de ventes supplémentaire immobilise du cash : sans nouvelles ressources stables, la croissance se finance à découvert. C'est la leçon des sociétés jumelles du cours, transposée ci-dessous.",
    supplierSide: 'Côté fournisseur',
    productSide: 'Côté produit et client',
    supplierCredit: 'Crédit fournisseur',
    storage: 'Stockage',
    customerCredit: 'Crédit client',
    day0: "J0 : livraison de l'usine",
    payFactory: (d: number) => `J${d} : on paie l'usine`,
    customerPays: (d: number) => `J${d} : le client paie`,
    gap: (d: string) => (
      <>
        <strong>{d} de décalage</strong> entre la sortie de cash vers l'usine et l'encaissement de la vente : un besoin permanent à financer, le
        BFR.
      </>
    ),
    resource: (d: string) => (
      <>
        Le client paie <strong>{d} avant</strong> qu'Adidas ne règle l'usine : le cycle dégage une ressource (BFR négatif sur ces postes).
      </>
    ),
    indicative: "Durées indicatives : le stockage et les délais sont des moyennes sur l'ensemble des produits.",
    dtc: 'adidas.com (vente directe)',
    wholesale: 'Filiale wholesale',
    tableHead: ['M€, activité qui double', 'BFR année Y', 'BFR année Y+1', 'Découvert Y+1'],
  },
  en: {
    presets: ['Adidas 2025', 'The 3 "nice" reflexes', 'Factories paid at 120 days', '+50% growth'],
    title: "Steer Adidas's WCR",
    subtitle: 'The sliders start from the actual 2025 payment terms. Fixed assets and stable resources do not move.',
    dso: 'Customer payment terms',
    dsoHint: 'Retailers (wholesale) pay on credit; adidas.com collects upfront.',
    dio: 'Storage time',
    dioHint: 'Ship from Asia, warehouses, shelves.',
    dpo: 'Factory payment terms',
    growth: 'Sales growth',
    wcr: 'WCR',
    level2025: '2025 level',
    delta: (amount: string, up: boolean) => `${up ? '+' : '−'}${amount} vs 2025: ${up ? 'cash consumed' : 'cash released'}`,
    capitalEmployed: 'Capital employed',
    capitalEmployedSub: 'Fixed assets + WCR',
    netCash: 'Net cash',
    covered: 'Stable resources cover the needs',
    uncovered: 'Overdraft: the WCR is no longer financed',
    texNetCash: '\\text{Net cash}',
    formulaCaption: 'stable resources − (fixed assets + WCR), in €m',
    stableRatio: 'Stable resources / capital employed',
    verdictPrefix: 'Stable resources / capital employed:',
    origin: (o: string, pages: string) => `("${o}", p. ${pages})`,
    cycleTitle: 'The operating cycle',
    cycleSubtitle: 'One pair, from delivery by the factory to collection of the sale (p. 81).',
    fundingTitle: 'Stable uses and resources',
    fundingSubtitle: 'Net cash is the balancing item: when the WCR grows, it melts.',
    growthTitle: 'You can die in excellent health',
    growthSubtitle: 'WCR and net cash as a function of sales growth, at constant payment terms (€m).',
    growthLabel: (g: string) => `Growth ${g}`,
    growthLesson:
      "With a positive WCR, every extra euro of sales ties up cash: without new stable resources, growth is financed by an overdraft. That is the lesson of the course's twin companies, transposed below.",
    supplierSide: 'Supplier side',
    productSide: 'Product and customer side',
    supplierCredit: 'Supplier credit',
    storage: 'Storage',
    customerCredit: 'Customer credit',
    day0: 'D0: delivery by the factory',
    payFactory: (d: number) => `D${d}: factory is paid`,
    customerPays: (d: number) => `D${d}: customer pays`,
    gap: (d: string) => (
      <>
        <strong>A {d} gap</strong> between the cash paid to the factory and the cash collected on the sale: a permanent need to finance, the WCR.
      </>
    ),
    resource: (d: string) => (
      <>
        The customer pays <strong>{d} before</strong> Adidas pays the factory: the cycle generates a resource (negative WCR on these items).
      </>
    ),
    indicative: 'Indicative durations: storage time and payment terms are averages across all products.',
    dtc: 'adidas.com (direct sales)',
    wholesale: 'Wholesale subsidiary',
    tableHead: ['€m, activity doubling', 'WCR year Y', 'WCR year Y+1', 'Overdraft Y+1'],
  },
}

export default function WcrLab() {
  const c = useCopy(copy)
  const lang = useLang()
  const [x, setX] = useState<Inputs>(base)
  const set = (key: keyof Inputs) => (value: number) => setX((prev) => ({ ...prev, [key]: value }))
  const m = model(x)
  const ref = model(base)
  const delta = m.wcr - ref.wcr
  const growthCurve = Array.from({ length: 27 }, (_, i) => {
    const growth = -0.3 + i * 0.05
    const point = model({ ...x, growth })
    return { growth, wcr: point.wcr, netCash: point.netCash }
  })

  return (
    <div className="flex flex-col gap-6">
      <Panel title={c.title} subtitle={c.subtitle}>
        <div className="flex flex-wrap gap-2">
          {c.presets.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setX(presetApply[i](x))}
              className="rounded-lg border border-hairline bg-white px-3 py-1.5 text-sm hover:border-ink"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <InteractiveSlider label={c.dso} value={x.dso} min={0} max={120} onChange={set('dso')} format={formatDays} reference={{ value: base.dso, label: '2025' }} hint={c.dsoHint} />
            <InteractiveSlider label={c.dio} value={x.dio} min={30} max={270} onChange={set('dio')} format={formatDays} reference={{ value: base.dio, label: '2025' }} hint={c.dioHint} />
            <InteractiveSlider label={c.dpo} value={x.dpo} min={0} max={180} onChange={set('dpo')} format={formatDays} reference={{ value: base.dpo, label: '2025' }} />
            <InteractiveSlider label={c.growth} value={x.growth} min={-0.3} max={1} step={0.05} onChange={set('growth')} format={signedPct} reference={{ value: 0, label: '2025' }} />
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <StatTile
                label={c.wcr}
                value={formatMillions(m.wcr)}
                sub={Math.abs(delta) < 1 ? c.level2025 : c.delta(formatMoney(Math.abs(delta)), delta > 0)}
                tone={Math.abs(delta) < 1 ? 'neutral' : delta > 0 ? 'warning' : 'good'}
              />
              <StatTile label={c.capitalEmployed} value={formatMillions(m.capitalEmployed)} sub={c.capitalEmployedSub} />
              <StatTile
                label={c.netCash}
                value={formatMillions(m.netCash)}
                tone={m.netCash >= 0 ? 'good' : 'critical'}
                sub={m.netCash >= 0 ? c.covered : c.uncovered}
              />
            </div>
            <div className="overflow-x-auto rounded-xl border border-hairline bg-white p-3 text-[11px] sm:text-sm">
              <Tex
                display
                math={`${c.texNetCash} = ${texNum(b.stableResources)} - (${texNum(b.fixedAssets)} + ${texNum(m.wcr)}) = \\mathbf{${texNum(m.netCash)}}`}
              />
              <p className="text-center text-xs text-secondary">{c.formulaCaption}</p>
            </div>
            <ThresholdMeter
              label={c.stableRatio}
              value={m.stableRatio}
              min={stableRatioRange.min}
              max={stableRatioRange.max}
              zones={stableRatioZones(lang)}
              format={(v) => formatPercent(v, 0)}
            />
            <p className="text-xs text-secondary">
              {c.verdictPrefix} <strong className="text-ink">{stableRatioVerdict(m.stableRatio, lang)}</strong>.
            </p>
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title={c.cycleTitle} subtitle={c.cycleSubtitle}>
          <CycleTimeline dio={x.dio} dso={x.dso} dpo={x.dpo} />
        </Panel>
        <Panel title={c.fundingTitle} subtitle={c.fundingSubtitle}>
          <BalanceSheetChart
            height={260}
            columns={fundingColumns({ fixedAssets: b.fixedAssets, wcr: m.wcr, equity: b.equity, provisions: b.provisions, ltDebt: b.ltDebt }, lang)}
          />
        </Panel>
      </div>

      <Panel title={c.growthTitle} subtitle={c.growthSubtitle}>
        <ChartLegend
          items={[
            { label: c.wcr, color: series.orange },
            { label: c.netCash, color: series.blue },
          ]}
        />
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={growthCurve} margin={{ top: 16, right: 16, bottom: 4, left: 4 }}>
              <CartesianGrid vertical={false} stroke={chrome.grid} />
              <XAxis dataKey="growth" type="number" domain={[-0.3, 1]} {...axisProps} tickFormatter={signedPct} />
              <YAxis {...axisProps} width={80} tickFormatter={(v) => formatMillions(v)} />
              <ReferenceLine y={0} stroke={chrome.axis} />
              <Tooltip content={chartTooltip({ format: (v) => formatMillions(v), title: (g) => c.growthLabel(signedPct(Number(g))) })} />
              <Line dataKey="wcr" name={c.wcr} stroke={series.orange} strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line dataKey="netCash" name={c.netCash} stroke={series.blue} strokeWidth={2} dot={false} isAnimationActive={false} />
              <ReferenceDot x={x.growth} y={m.netCash} r={5} fill={series.blue} stroke={chrome.surface} strokeWidth={2} />
              <ReferenceDot x={x.growth} y={m.wcr} r={5} fill={series.orange} stroke={chrome.surface} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-secondary">{c.growthLesson}</p>
        <TwinSubsidiaries />
      </Panel>
    </div>
  )
}

/** Frise du cycle : crédit fournisseur, stockage, crédit client, et le décalage de trésorerie à financer. */
function CycleTimeline({ dio, dso, dpo }: { dio: number; dso: number; dpo: number }) {
  const c = useCopy(copy)
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const end = Math.max(dio + dso, dpo, 1) * 1.05
  const pos = (d: number) => `${(d / end) * 100}%`
  const cashIn = dio + dso
  const gap = cashIn - dpo
  const assetColor = balanceColors['operating-current-assets']
  const liabilityColor = balanceColors['operating-current-liabilities']

  return (
    <div ref={ref} className="flex flex-col gap-3 text-sm">
      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-secondary">{c.supplierSide}</p>
        <div className="relative h-7">
          <TimelineBar width={width} end={end} from={0} to={dpo} color={liabilityColor} label={`${c.supplierCredit} · ${formatDays(dpo)}`} short={formatDays(dpo)} />
        </div>
        <p className="text-xs text-secondary">{c.productSide}</p>
        <div className="relative h-7">
          <TimelineBar width={width} end={end} from={0} to={dio} color={assetColor} label={`${c.storage} · ${formatDays(dio)}`} short={formatDays(dio)} />
          <div className="absolute h-full" style={{ left: pos(dio), width: 2, background: chrome.surface }} />
          <TimelineBar width={width} end={end} from={dio} to={cashIn} color={assetColor} label={`${c.customerCredit} · ${formatDays(dso)}`} short={formatDays(dso)} />
        </div>
      </div>

      <div className="relative h-10 border-t" style={{ borderColor: chrome.axis }}>
        <Marker at={0} label={c.day0} />
        <Marker at={dpo / end} label={c.payFactory(Math.round(dpo))} />
        <Marker at={cashIn / end} label={c.customerPays(Math.round(cashIn))} />
      </div>

      <div className={`rounded-xl px-4 py-3 ${gap > 0 ? 'bg-neutral-100' : 'bg-good/10'}`}>
        <p>{gap > 0 ? c.gap(formatDays(gap)) : c.resource(formatDays(-gap))}</p>
      </div>
      <p className="text-xs text-muted">{c.indicative}</p>
    </div>
  )
}

/** Barre de la frise ; le libellé n'est écrit que si la barre est assez longue pour le contenir. */
function TimelineBar({
  width,
  end,
  from,
  to,
  color,
  label,
  short,
}: {
  width: number
  end: number
  from: number
  to: number
  color: string
  label: string
  short: string
}) {
  const room = ((to - from) / end) * width - 16
  const text = textWidth(label) <= room ? label : textWidth(short) <= room ? short : ''
  return (
    <div
      className="absolute flex h-full items-center rounded px-2 text-xs font-semibold whitespace-nowrap transition-all duration-300"
      style={{ left: `${(from / end) * 100}%`, width: `${(Math.max(0, to - from) / end) * 100}%`, background: color, color: inkOn(color) }}
      title={label}
    >
      {text}
    </div>
  )
}

/** Repère de la frise. Le libellé s'aligne vers l'intérieur près des bords pour ne jamais déborder. */
function Marker({ at, label }: { at: number; label: string }) {
  const shift = at < 0.25 ? 'translate-x-0' : at > 0.75 ? '-translate-x-full' : '-translate-x-1/2'
  return (
    <div className="absolute top-0 w-0 transition-[left] duration-300" style={{ left: `${at * 100}%` }}>
      <div className="h-2 w-px bg-ink" />
      <p className={`absolute top-2.5 left-0 text-[11px] whitespace-nowrap text-secondary ${shift}`}>{label}</p>
    </div>
  )
}

function TwinSubsidiaries() {
  const c = useCopy(copy)
  const twin = useContent().adidas.scenarios.twinSubsidiaries
  const e = twin.expected
  const rows = [
    { name: c.dtc, y: e.dtcWcrY, y1: e.dtcWcrY1, overdraft: 0 },
    { name: c.wholesale, y: e.wholesaleWcrY, y1: e.wholesaleWcrY1, overdraft: e.wholesaleOverdraftY1 },
  ]
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">
        {twin.title}{' '}
        <span className="font-normal text-muted">{c.origin(twin.pdfOrigin, twin.pages.join('-'))}</span>
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] text-sm">
          <thead className="text-left text-xs text-secondary">
            <tr>
              {c.tableHead.map((h, i) => (
                <th key={h} className={`py-1 font-medium ${i > 0 ? 'text-right' : ''}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {rows.map((r) => (
              <tr key={r.name} className="border-t border-hairline">
                <td className="py-1.5">{r.name}</td>
                <td className="py-1.5 text-right">{r.y}</td>
                <td className="py-1.5 text-right">{r.y1}</td>
                <td className={`py-1.5 text-right ${r.overdraft > 0 ? 'font-semibold text-critical' : ''}`}>{r.overdraft || '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-secondary">{twin.story}</p>
    </div>
  )
}
