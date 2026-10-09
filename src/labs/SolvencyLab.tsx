import { RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import GaugeChart from '../components/GaugeChart'
import InteractiveSlider from '../components/InteractiveSlider'
import MissionBoard from '../components/MissionBoard'
import Panel from '../components/ui/Panel'
import SegmentedControl from '../components/ui/SegmentedControl'
import StatTile from '../components/ui/StatTile'
import Tex from '../components/ui/Tex'
import { adidas } from '../data'
import { useContent } from '../i18n/content'
import { useCopy, useLang } from '../i18n/lang'
import { adidasBalance as b } from '../lib/balanceSheet'
import { axisProps, chrome, series, status } from '../lib/chartTheme'
import { chartTooltip } from '../lib/chartTooltip'
import * as f from '../lib/finance'
import { formatMillions, formatMoney, formatNumber, formatPercent, formatTimes, texNum, texPct } from '../lib/format'
import { netDebtToCfoZones, netDebtToEbitdaZones, stableRatioGaugeZones } from './gaugeZones'
import { stableRatioRange } from './shared'

const pnl = adidas.incomeStatement
const cfs = adidas.cashFlowStatement
const s = adidas.scenarios.acquisition.data as Record<string, number> & { presets: number[] }

/** CFO « normatif » : EBITDA − IS calculé sur l'EBIT, BFR stable (le flux d'une année sans dérapage du BFR). */
const normativeCfo = f.operatingCashFlow(pnl.ebitda, pnl.ebit, pnl.taxRate, 0)
/** La cible convertit son EBITDA en CFO au même rythme qu'Adidas (hypothèse du labo). */
const cashConversion = normativeCfo / pnl.ebitda

const base = { price: 0, multiple: s.multiple, debtShare: 1 }
type Inputs = typeof base
type Maturity = 'long' | 'short'
type CfoBasis = 'normative' | 'published'

/**
 * Modèle du labo. Le prix payé (valeur d'entreprise de la cible) s'ajoute aux capitaux employés.
 * Il est financé par dette (part choisie) et par augmentation de capital (le reste). Une dette à
 * long terme est une ressource stable, un crédit-relais à court terme est de la trésorerie passive.
 */
function model(x: Inputs, maturity: Maturity, basis: CfoBasis) {
  const targetEbitda = x.price / x.multiple
  const debt = x.debtShare * x.price
  const equityRaised = x.price - debt
  const netDebt = b.netDebt + debt
  const ebitda = pnl.ebitda + targetEbitda
  const cfo = (basis === 'normative' ? normativeCfo : cfs.cfo) + targetEbitda * cashConversion
  const stable = b.stableResources + equityRaised + (maturity === 'long' ? debt : 0)
  const capitalEmployed = b.capitalEmployed + x.price
  const equity = b.equity + equityRaised
  return {
    targetEbitda,
    debt,
    equityRaised,
    netDebt,
    ebitda,
    cfo,
    stable,
    capitalEmployed,
    netCash: f.netCashFromStructure(stable, capitalEmployed),
    ndEbitda: f.netDebtToEbitda(netDebt, ebitda),
    ndCfo: f.netDebtToCfo(netDebt, cfo),
    srCe: f.stableResourcesRatio(stable, capitalEmployed),
    equity,
    gearing: f.gearing(netDebt, equity),
  }
}

/**
 * Prix maximal pour rester au plafond k de dette nette / EBITDA :
 * (DN₀ + d·P) / (EBITDA₀ + P/m) = k  ⇔  P = (k·EBITDA₀ − DN₀) / (d − k/m). null si le plafond n'est jamais atteint.
 */
function maxPrice(k: number, x: Inputs): number | null {
  const slope = x.debtShare - k / x.multiple
  const room = k * pnl.ebitda - b.netDebt
  if (room <= 0) return 0
  if (slope <= 0) return null
  return room / slope
}

const PRICE_MAX = 20000
const RATIO_AXIS_MAX = 7

const copy = {
  fr: {
    presets: ['Pas de rachat', 'Pépite du trail · 2 Md€', 'Rival européen · 8 Md€', 'Méga-fusion · 15 Md€'],
    reset: 'Revenir à Adidas 2025',
    price: "Prix de la cible (valeur d'entreprise)",
    multiple: 'Multiple payé (VE / EBITDA)',
    multipleHint: (ebitda: string) => `EBITDA apporté par la cible : ${ebitda}.`,
    debtShare: 'Part financée par dette',
    debtShareHint: (equity: string) => `Le reste (${equity}) par augmentation de capital.`,
    maturity: 'Maturité de la dette',
    maturityLong: 'Obligations (long terme)',
    maturityShort: 'Crédit-relais (court terme)',
    cfoBasis: 'CFO retenu',
    cfoNormative: (v: string) => `Normatif, BFR stable (${v})`,
    cfoPublished: (v: string) => `Publié 2025 (${v})`,
    gaugeEbitda: 'Dette nette / EBITDA',
    gaugeStable: 'Ressources stables / capitaux employés',
    gaugeCfo: 'Dette nette / CFO',
    years: (v: number) => `${formatNumber(v, 1, 1)} ans`,
    netDebt: 'Dette nette',
    netDebtSub: (added: string) => `dont ${added} de nouvelle dette`,
    netDebtBase: 'Bilan 2025, loyers compris',
    ebitda: 'EBITDA combiné',
    ebitdaSub: (target: string) => `dont ${target} apportés par la cible`,
    netCash: 'Trésorerie nette',
    netCashSub: 'Ressources stables − capitaux employés',
    netCashNegative: 'Négative : un découvert finance des actifs durables',
    gearing: 'Gearing (dette nette / capitaux propres)',
    gearingSub: (equity: string) => `Capitaux propres : ${equity}`,
    curveTitle: "Jusqu'où Adidas peut-elle s'endetter ?",
    curveSubtitle: 'Dette nette / EBITDA selon le prix payé, avec le multiple et le financement choisis. Zones de la grille du cours (p. 270).',
    curveX: (v: string) => `Prix ${v}`,
    ratio: 'Dette nette / EBITDA',
    maxAt: (k: number) => `Prix maximal pour rester sous ${k}x`,
    never: "Jamais atteint : la cible apporte assez d'EBITDA",
    already: 'Déjà dépassé sans rachat',
    maxSub: 'Avec le multiple et la part de dette choisis',
    texMax: (k: number) => `P_{\\max} = \\frac{${k} \\times \\text{EBITDA}_0 - \\text{DN}_0}{d - ${k}/m}`,
    europcarTitle: 'Repère du cours : Europcar, fin 2019',
    europcarSubtitle: "Les mêmes jauges, avec les chiffres de l'exercice (p. 271-272). Conclusion du corrigé : très mauvaise solvabilité.",
    europcarRounding: 'Le corrigé arrondit à 13.',
    texStable: '\\frac{\\text{Ressources stables}}{\\text{Capitaux employés}}',
    texNetDebt: '\\frac{\\text{Dette nette}}{\\text{EBITDA}}',
    missions: [
      {
        label: 'Rachète le rival européen (8 Md€) en gardant dette nette / EBITDA sous 3',
        hint: 'Mélange dette et augmentation de capital, ou négocie un multiple plus bas.',
        lesson: "Une augmentation de capital ne pèse pas sur la dette nette : le prix à payer, c'est la dilution des actionnaires.",
      },
      {
        label: 'Fais passer la jauge ressources stables / capitaux employés sous 70 %',
        hint: "Ce n'est pas le montant qui compte ici, mais la maturité de la dette.",
        lesson: 'Trésorerie nette = ressources stables − capitaux employés : un actif durable financé à court terme creuse le découvert.',
      },
      {
        label: 'Trouve le prix maximal finançable à 100 % par dette sans dépasser 4x (à 2 % près)',
        hint: 'Mets la part de dette à 100 %, puis approche 4x par la droite de la courbe.',
        lesson: 'Au-delà, Adidas sort de la zone « OK » de la grille du cours.',
      },
      {
        label: "Sans aucun rachat, passe au CFO publié 2025 : quelle jauge s'affole ?",
        hint: 'Regarde dette nette / CFO.',
        lesson: "Avec 751 M€ de CFO, plombé par le BFR, la dette nette vaut plus de 5 ans de flux : plus fin que dette nette / EBITDA, ce ratio est aussi plus volatil.",
      },
    ],
    badge: 'Gardien de la solvabilité',
  },
  en: {
    presets: ['No takeover', 'Trail running gem · €2bn', 'European rival · €8bn', 'Mega-merger · €15bn'],
    reset: 'Back to Adidas 2025',
    price: 'Target price (enterprise value)',
    multiple: 'Multiple paid (EV / EBITDA)',
    multipleHint: (ebitda: string) => `EBITDA brought by the target: ${ebitda}.`,
    debtShare: 'Share financed by debt',
    debtShareHint: (equity: string) => `The rest (${equity}) through a capital increase.`,
    maturity: 'Debt maturity',
    maturityLong: 'Bonds (long term)',
    maturityShort: 'Bridge loan (short term)',
    cfoBasis: 'CFO used',
    cfoNormative: (v: string) => `Normative, stable WCR (${v})`,
    cfoPublished: (v: string) => `Published 2025 (${v})`,
    gaugeEbitda: 'Net debt / EBITDA',
    gaugeStable: 'Stable resources / capital employed',
    gaugeCfo: 'Net debt / CFO',
    years: (v: number) => `${formatNumber(v, 1, 1)} years`,
    netDebt: 'Net debt',
    netDebtSub: (added: string) => `of which ${added} of new debt`,
    netDebtBase: '2025 balance sheet, leases included',
    ebitda: 'Combined EBITDA',
    ebitdaSub: (target: string) => `of which ${target} brought by the target`,
    netCash: 'Net cash',
    netCashSub: 'Stable resources − capital employed',
    netCashNegative: 'Negative: an overdraft is funding long-lived assets',
    gearing: 'Gearing (net debt / equity)',
    gearingSub: (equity: string) => `Equity: ${equity}`,
    curveTitle: 'How far can Adidas borrow?',
    curveSubtitle: 'Net debt / EBITDA as a function of the price paid, with the chosen multiple and financing. Zones of the course grid (p. 270).',
    curveX: (v: string) => `Price ${v}`,
    ratio: 'Net debt / EBITDA',
    maxAt: (k: number) => `Maximum price to stay below ${k}x`,
    never: 'Never reached: the target brings enough EBITDA',
    already: 'Already exceeded without a takeover',
    maxSub: 'With the chosen multiple and debt share',
    texMax: (k: number) => `P_{\\max} = \\frac{${k} \\times \\text{EBITDA}_0 - \\text{ND}_0}{d - ${k}/m}`,
    europcarTitle: 'Course benchmark: Europcar, end of 2019',
    europcarSubtitle: "The same gauges, with the exercise's figures (p. 271-272). The answer's conclusion: very poor solvency.",
    europcarRounding: 'The answer rounds it to 13.',
    texStable: '\\frac{\\text{Stable resources}}{\\text{Capital employed}}',
    texNetDebt: '\\frac{\\text{Net debt}}{\\text{EBITDA}}',
    missions: [
      {
        label: 'Buy the European rival (€8bn) while keeping net debt / EBITDA below 3',
        hint: 'Mix debt and a capital increase, or negotiate a lower multiple.',
        lesson: 'A capital increase does not weigh on net debt: the price to pay is shareholder dilution.',
      },
      {
        label: 'Push the stable resources / capital employed gauge below 70%',
        hint: 'What matters here is not the amount but the maturity of the debt.',
        lesson: 'Net cash = stable resources − capital employed: a long-lived asset financed short term digs an overdraft.',
      },
      {
        label: 'Find the maximum price financeable 100% by debt without exceeding 4x (within 2%)',
        hint: 'Set the debt share to 100%, then approach 4x from the right of the curve.',
        lesson: 'Beyond it, Adidas leaves the "OK" zone of the course grid.',
      },
      {
        label: 'With no takeover, switch to the published 2025 CFO: which gauge goes haywire?',
        hint: 'Look at net debt / CFO.',
        lesson: 'With €751m of CFO, dragged down by the WCR, net debt is worth more than 5 years of flows: finer than net debt / EBITDA, this ratio is also more volatile.',
      },
    ],
    badge: 'Solvency guardian',
  },
}

export default function SolvencyLab() {
  const c = useCopy(copy)
  const lang = useLang()
  const scenario = useContent().adidas.scenarios.acquisition
  const [x, setX] = useState<Inputs>(base)
  const [maturity, setMaturity] = useState<Maturity>('long')
  const [basis, setBasis] = useState<CfoBasis>('normative')
  const set = (key: keyof Inputs) => (value: number) => setX((prev) => ({ ...prev, [key]: value }))
  const m = model(x, maturity, basis)
  const prices = [0, ...s.presets]

  const curve = Array.from({ length: 41 }, (_, i) => {
    const price = (PRICE_MAX * i) / 40
    return { price, ratio: model({ ...x, price }, maturity, basis).ndEbitda }
  })
  const max3 = maxPrice(3, x)
  const max4 = maxPrice(4, x)
  const maxTile = (k: number, value: number | null) => (
    <StatTile
      label={c.maxAt(k)}
      value={value === null ? '∞' : value === 0 ? '0' : formatMoney(value)}
      sub={value === null ? c.never : value === 0 ? c.already : c.maxSub}
      tone={value === null ? 'good' : 'neutral'}
    />
  )

  const missions = c.missions.map((mission, i) => ({
    ...mission,
    id: ['rival-under-3', 'short-term-trap', 'max-4x', 'published-cfo'][i],
    done: [
      x.price >= 8000 && m.ndEbitda < 3,
      m.srCe < 0.7,
      x.debtShare === 1 && max4 !== null && max4 > 0 && Math.abs(x.price - max4) / max4 <= 0.02,
      basis === 'published' && x.price === 0,
    ][i],
  }))

  const years = (v: number) => c.years(v)

  return (
    <div className="flex flex-col gap-6">
      <Panel
        title={scenario.title}
        subtitle={scenario.story}
        actions={
          <button
            type="button"
            onClick={() => {
              setX(base)
              setMaturity('long')
              setBasis('normative')
            }}
            className="inline-flex items-center gap-1 text-sm text-secondary hover:text-ink"
          >
            <RotateCcw className="size-4" aria-hidden /> {c.reset}
          </button>
        }
      >
        <div className="flex flex-wrap gap-2">
          {c.presets.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setX((p) => ({ ...p, price: prices[i] }))}
              className={`rounded-lg border px-3 py-1.5 text-sm ${x.price === prices[i] ? 'border-ink bg-ink text-white' : 'border-hairline bg-white hover:border-ink'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <GaugeChart label={c.gaugeEbitda} value={m.ndEbitda} min={0} max={RATIO_AXIS_MAX} zones={netDebtToEbitdaZones(lang)} format={(v) => formatTimes(v)} />
          <GaugeChart
            label={c.gaugeStable}
            value={m.srCe}
            min={stableRatioRange.min}
            max={stableRatioRange.max}
            zones={stableRatioGaugeZones(lang)}
            format={(v) => formatPercent(v, 0)}
          />
          <GaugeChart label={c.gaugeCfo} value={m.ndCfo} min={0} max={RATIO_AXIS_MAX} zones={netDebtToCfoZones(lang)} format={years} ticks={[1, 3, 5]} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <InteractiveSlider label={c.price} value={x.price} min={0} max={PRICE_MAX} step={100} onChange={set('price')} format={formatMoney} />
            <InteractiveSlider
              label={c.multiple}
              value={x.multiple}
              min={6}
              max={20}
              step={0.5}
              onChange={set('multiple')}
              format={(v) => formatTimes(v)}
              hint={c.multipleHint(formatMillions(m.targetEbitda))}
            />
            <InteractiveSlider
              label={c.debtShare}
              value={x.debtShare}
              min={0}
              max={1}
              step={0.05}
              onChange={set('debtShare')}
              format={(v) => formatPercent(v, 0)}
              hint={c.debtShareHint(formatMoney(m.equityRaised))}
            />
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium">{c.maturity}</p>
              <SegmentedControl
                label={c.maturity}
                value={maturity}
                onChange={setMaturity}
                options={[
                  { value: 'long', label: c.maturityLong },
                  { value: 'short', label: c.maturityShort },
                ]}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium">{c.cfoBasis}</p>
              <SegmentedControl
                label={c.cfoBasis}
                value={basis}
                onChange={setBasis}
                options={[
                  { value: 'normative', label: c.cfoNormative(formatMillions(normativeCfo)) },
                  { value: 'published', label: c.cfoPublished(formatMillions(cfs.cfo)) },
                ]}
              />
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <div className="grid content-start gap-3 sm:grid-cols-2">
              <StatTile
                label={c.netDebt}
                value={formatMillions(m.netDebt)}
                sub={m.debt > 0 ? c.netDebtSub(formatMoney(m.debt)) : c.netDebtBase}
              />
              <StatTile
                label={c.ebitda}
                value={formatMillions(m.ebitda)}
                sub={m.targetEbitda > 0 ? c.ebitdaSub(formatMillions(m.targetEbitda)) : undefined}
              />
              <StatTile
                label={c.netCash}
                value={formatMillions(m.netCash)}
                sub={m.netCash >= 0 ? c.netCashSub : c.netCashNegative}
                tone={m.netCash >= 0 ? 'good' : 'critical'}
              />
              <StatTile label={c.gearing} value={formatTimes(m.gearing, 2)} sub={c.gearingSub(formatMillions(m.equity))} />
            </div>
          </div>
        </div>
      </Panel>

      <Panel title={c.curveTitle} subtitle={c.curveSubtitle}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <figure className="h-72 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={curve} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
                <ReferenceArea y1={0} y2={3} fill={status.good} fillOpacity={0.08} />
                <ReferenceArea y1={3} y2={4} fill={status.good} fillOpacity={0.16} />
                <ReferenceArea y1={4} y2={5} fill={status.warning} fillOpacity={0.18} />
                <ReferenceArea y1={5} y2={RATIO_AXIS_MAX} fill={status.critical} fillOpacity={0.12} />
                <CartesianGrid vertical={false} stroke={chrome.grid} />
                <XAxis dataKey="price" type="number" domain={[0, PRICE_MAX]} {...axisProps} tickFormatter={(v: number) => formatMoney(v)} />
                <YAxis {...axisProps} domain={[0, RATIO_AXIS_MAX]} allowDataOverflow ticks={[0, 1, 2, 3, 4, 5, 6, 7]} tickFormatter={(v: number) => `${v}x`} width={36} />
                <ReferenceLine y={3} stroke={status.goodInk} strokeDasharray="4 4" />
                <ReferenceLine y={5} stroke={status.critical} strokeDasharray="4 4" />
                <Tooltip content={chartTooltip({ format: (v) => formatTimes(v), title: (p) => c.curveX(formatMoney(Number(p))) })} />
                <Line dataKey="ratio" name={c.ratio} stroke={series.blue} strokeWidth={2} dot={false} isAnimationActive={false} />
                <ReferenceDot
                  x={x.price}
                  y={Math.min(m.ndEbitda, RATIO_AXIS_MAX)}
                  r={6}
                  fill={series.blue}
                  stroke={chrome.surface}
                  strokeWidth={2}
                  ifOverflow="visible"
                />
              </LineChart>
            </ResponsiveContainer>
          </figure>
          <div className="flex flex-col gap-3">
            {maxTile(3, max3)}
            {maxTile(4, max4)}
            <div className="overflow-x-auto rounded-xl border border-hairline bg-white p-3 text-xs">
              <Tex math={c.texMax(4)} />
            </div>
          </div>
        </div>
      </Panel>

      <Europcar />

      <MissionBoard storageId="solvency" missions={missions} badge={c.badge} />
    </div>
  )
}

/** Exercice Europcar (p. 271-272) : les jauges du labo, appliquées aux chiffres du cours. */
function Europcar() {
  const c = useCopy(copy)
  const lang = useLang()
  const stable = s.europcarEquity + s.europcarLtDebt
  const wcr = s.europcarOperatingCurrentAssets - s.europcarOperatingCurrentLiabilities
  const employed = s.europcarNonCurrentAssets + wcr
  const netDebt = s.europcarLtDebt + s.europcarStDebt - s.europcarCash
  const ratio = f.stableResourcesRatio(stable, employed)
  const leverage = f.netDebtToEbitda(netDebt, s.europcarEbitda)
  return (
    <Panel title={c.europcarTitle} subtitle={c.europcarSubtitle}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <div className="overflow-x-auto rounded-xl border border-hairline bg-white p-3 text-xs sm:text-sm">
            <Tex
              math={`${c.texStable} = \\frac{${texNum(s.europcarEquity)} + ${texNum(s.europcarLtDebt)}}{${texNum(s.europcarNonCurrentAssets)} + (${texNum(s.europcarOperatingCurrentAssets)} - ${texNum(s.europcarOperatingCurrentLiabilities)})} = ${texPct(ratio, 0)}`}
            />
          </div>
          <GaugeChart
            label={c.gaugeStable}
            value={ratio}
            min={stableRatioRange.min}
            max={stableRatioRange.max}
            zones={stableRatioGaugeZones(lang)}
            format={(v) => formatPercent(v, 0)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="overflow-x-auto rounded-xl border border-hairline bg-white p-3 text-xs sm:text-sm">
            <Tex
              math={`${c.texNetDebt} = \\frac{${texNum(s.europcarLtDebt)} + ${texNum(s.europcarStDebt)} - ${texNum(s.europcarCash)}}{${texNum(s.europcarEbitda)}} = ${texNum(leverage, 1)}`}
            />
          </div>
          <GaugeChart label={c.gaugeEbitda} value={leverage} min={0} max={RATIO_AXIS_MAX} zones={netDebtToEbitdaZones(lang)} format={(v) => formatTimes(v)} />
          <p className="text-xs text-muted">{c.europcarRounding}</p>
        </div>
      </div>
    </Panel>
  )
}
