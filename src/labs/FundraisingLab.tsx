import { RotateCcw } from 'lucide-react'
import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import BalanceSheetChart, { type BalanceColumn } from '../components/BalanceSheetChart'
import ChartLegend from '../components/ChartLegend'
import InteractiveSlider from '../components/InteractiveSlider'
import MissionBoard from '../components/MissionBoard'
import Panel from '../components/ui/Panel'
import SegmentedControl from '../components/ui/SegmentedControl'
import StatTile from '../components/ui/StatTile'
import Tex from '../components/ui/Tex'
import { adidas } from '../data'
import { useContent } from '../i18n/content'
import { useCopy } from '../i18n/lang'
import { axisProps, balanceColors, chrome, series } from '../lib/chartTheme'
import * as f from '../lib/finance'
import { formatEuros, formatMillions, formatNumber, formatPercent, texNum, texPct } from '../lib/format'

const s = adidas.scenarios.strideLab.data as Record<string, number>
const l = adidas.scenarios.liquidation.data as { claims: number[]; proceeds: number }
const SHARES = s.founderShares
const NOMINAL = s.nominal
const CAPITAL = (SHARES * NOMINAL) / 1e6
const base = { pre: s.post - s.inv, inv: s.inv }
type Inputs = typeof base

/** Levée de fonds (p. 460-462), montants en M€. */
function raise(x: Inputs) {
  const r = f.fundraising({ shares: SHARES, nominal: NOMINAL, pre: x.pre * 1e6, inv: x.inv * 1e6 })
  return {
    ...r,
    post: r.post / 1e6,
    capitalIncrease: r.capitalIncrease / 1e6,
    sharePremium: r.sharePremium / 1e6,
  }
}

const m1 = (v: number) => formatMillions(v, 1)
const pct = (v: number) => formatPercent(v, 1)
const colors = { adidas: series.blue, vc: series.orange, premium: series.magenta }

const copy = {
  fr: {
    tabs: 'Choix du scénario',
    tabRaise: 'Levée de fonds',
    tabBankruptcy: 'Plan B : la liquidation',
    reset: 'Exemple du cours',
    pre: 'Valorisation pre-money',
    preHint: 'Négociée avec les VC (DCF, multiples…).',
    inv: 'Montant levé (INV)',
    courseRef: 'cours',
    pieTitle: 'Qui détient Stride Lab ?',
    adidas: 'Adidas (fondateur)',
    vc: 'Fonds de capital-risque',
    control: 'Contrôle',
    majority: 'Adidas garde la majorité du capital, donc le pouvoir',
    tie: 'Égalité parfaite : aucun camp ne décide seul',
    lost: 'Les VC détiennent la majorité : Adidas perd le contrôle',
    post: 'Valeur post-money',
    postSub: 'POST = PRE + INV',
    price: "Prix d'émission par action",
    priceSub: (nominal: string) => `Pour un nominal de ${nominal}`,
    newShares: 'Actions nouvelles',
    newSharesSub: (total: string) => `${total} actions au total`,
    premiumShare: 'Part de la levée en prime',
    premiumShareSub: 'Ce qui ne donne aucun pouvoir supplémentaire',
    texShare: '\\text{Part des VC}',
    texK: '\\Delta K',
    texPremium: "\\text{Prime d'émission}",
    texM: '\\text{ M€}',
    before: 'Avant la levée',
    after: 'Après la levée',
    assets: 'Actif',
    liabilities: 'Passif',
    fixedAssets: 'Prototype et brevets',
    cash: 'Trésorerie',
    capital: 'Capital social',
    premium: "Prime d'émission",
    jTitle: 'La courbe en J du financement',
    jSubtitle: "Flux de trésorerie d'exploitation d'une start-up qui réussit, et ses investisseurs successifs (schéma du cours, p. 459). Allure illustrative.",
    jPhases: ['Famille, amis, business angels', 'Capital-risque (VC)', 'Capital-développement, Bourse, cessions'],
    jPoints: ['Prototype', 'Validation du concept', 'Premiers revenus', "Point mort du flux d'exploitation", 'Point mort du free cash flow'],
    jHere: 'Stride Lab est ici',
    proceeds: 'Produit de la vente des actifs',
    classes: ['1. État', '2. Créanciers post-jugement', '3. Créanciers garantis (banque)', '4. Créanciers chirographaires', '5. Actionnaires'],
    paid: 'Remboursé',
    unpaid: 'Perdu',
    paidLabel: (paid: string, claim: string, rate: string) => `${paid} / ${claim} (${rate})`,
    creditors: 'Créanciers remboursés',
    creditorsSub: (claims: string) => `sur ${claims} de créances`,
    shareholders: 'Récupéré par les actionnaires',
    shareholdersSub: (adidasPart: string, vcPart: string) => `Adidas ${adidasPart}, VC ${vcPart}, au prorata des actions`,
    shareholdersZero: 'Rien : ils passent en dernier',
    missions: [
      {
        label: 'Lève au moins 150 M€ sans perdre la majorité',
        hint: "Il faut une valorisation pre-money supérieure au montant levé.",
        lesson: 'INV / POST < 50 % ⇔ PRE > INV : plus la valorisation négociée est haute, moins Adidas est diluée.',
      },
      {
        label: "Fais en sorte que la prime d'émission dépasse 95 % des fonds levés",
        hint: "Le prix d'émission doit atteindre 20 fois le nominal de 1 000 €.",
        lesson: "Plus la valorisation est élevée, plus l'apport file en prime d'émission plutôt qu'en capital social (et en pouvoir).",
      },
      {
        label: 'Accepte une valorisation trop basse… et perds la majorité',
        hint: 'Baisse la pre-money sous le montant levé.',
        lesson: 'Avec INV / POST > 50 %, les VC contrôlent les décisions : la valorisation est le nerf de la négociation.',
      },
      {
        label: 'Plan B : trouve le produit de cession à partir duquel les actionnaires touchent leur premier euro (à 2 M€ près)',
        hint: "Additionne les créances de tous ceux qui passent avant eux.",
        lesson: "Il faut d'abord rembourser 63 M€ de créances : l'actionnaire est servi en dernier, c'est lui qui porte le plus de risque.",
      },
    ],
    badge: 'Fondateur averti',
  },
  en: {
    tabs: 'Choice of scenario',
    tabRaise: 'Fundraising',
    tabBankruptcy: 'Plan B: liquidation',
    reset: 'Course example',
    pre: 'Pre-money valuation',
    preHint: 'Negotiated with the VCs (DCF, multiples…).',
    inv: 'Amount raised (INV)',
    courseRef: 'course',
    pieTitle: 'Who owns Stride Lab?',
    adidas: 'Adidas (founder)',
    vc: 'Venture capital funds',
    control: 'Control',
    majority: 'Adidas keeps the majority of the capital, hence the power',
    tie: 'A perfect tie: neither side decides alone',
    lost: 'The VCs hold the majority: Adidas loses control',
    post: 'Post-money value',
    postSub: 'POST = PRE + INV',
    price: 'Issue price per share',
    priceSub: (nominal: string) => `For a nominal value of ${nominal}`,
    newShares: 'New shares',
    newSharesSub: (total: string) => `${total} shares in total`,
    premiumShare: 'Share of the raise in premium',
    premiumShareSub: 'What gives no extra power',
    texShare: "\\text{VCs' share}",
    texK: '\\Delta K',
    texPremium: '\\text{Share premium}',
    texM: '\\text{m}',
    before: 'Before the raise',
    after: 'After the raise',
    assets: 'Assets',
    liabilities: 'Liabilities',
    fixedAssets: 'Prototype and patents',
    cash: 'Cash',
    capital: 'Share capital',
    premium: 'Share premium',
    jTitle: 'The J-curve of financing',
    jSubtitle: "Operating cash flows of a successful start-up, and its successive investors (course diagram, p. 459). Illustrative shape.",
    jPhases: ['Family, friends, business angels', 'Venture capital (VC)', 'Capital development, IPOs, disposals'],
    jPoints: ['Prototype', 'Validation of the concept', 'First revenues', 'Operating cash flow break-even', 'Free cash flow break-even'],
    jHere: 'Stride Lab is here',
    proceeds: 'Proceeds from selling the assets',
    classes: ['1. State', '2. Post-filing creditors', '3. Secured creditors (bank)', '4. Unsecured creditors', '5. Shareholders'],
    paid: 'Repaid',
    unpaid: 'Lost',
    paidLabel: (paid: string, claim: string, rate: string) => `${paid} / ${claim} (${rate})`,
    creditors: 'Creditors repaid',
    creditorsSub: (claims: string) => `out of ${claims} of claims`,
    shareholders: 'Recovered by shareholders',
    shareholdersSub: (adidasPart: string, vcPart: string) => `Adidas ${adidasPart}, VCs ${vcPart}, pro rata to shares`,
    shareholdersZero: 'Nothing: they come last',
    missions: [
      {
        label: 'Raise at least €150m without losing the majority',
        hint: 'You need a pre-money valuation above the amount raised.',
        lesson: 'INV / POST < 50% ⇔ PRE > INV: the higher the negotiated valuation, the less Adidas is diluted.',
      },
      {
        label: 'Make the share premium exceed 95% of the funds raised',
        hint: 'The issue price must reach 20 times the €1,000 nominal value.',
        lesson: 'The higher the valuation, the more the contribution goes to the share premium rather than to share capital (and power).',
      },
      {
        label: 'Accept a valuation that is too low… and lose the majority',
        hint: 'Lower the pre-money below the amount raised.',
        lesson: 'With INV / POST > 50%, the VCs control decisions: valuation is the crux of the negotiation.',
      },
      {
        label: 'Plan B: find the sale proceeds from which shareholders get their first euro (within €2m)',
        hint: 'Add up the claims of everyone who comes before them.',
        lesson: '€63m of claims must be repaid first: the shareholder is served last, they bear the most risk.',
      },
    ],
    badge: 'Savvy founder',
  },
}

type Tab = 'raise' | 'bankruptcy'

export default function FundraisingLab() {
  const c = useCopy(copy)
  const [tab, setTab] = useState<Tab>('raise')
  const [x, setX] = useState<Inputs>(base)
  const [proceeds, setProceeds] = useState(l.proceeds)
  const r = raise(x)
  const firstEuro = l.claims.slice(0, -1).reduce((a, b) => a + b, 0)

  const missions = c.missions.map((mission, i) => ({
    ...mission,
    id: ['raise-150', 'premium-95', 'lose-control', 'first-euro'][i],
    done: [
      x.inv >= 150 && r.founderShare > 0.5,
      r.sharePremium / x.inv >= 0.95,
      r.founderShare < 0.5,
      tab === 'bankruptcy' && proceeds > firstEuro && proceeds <= firstEuro + 2,
    ][i],
  }))

  return (
    <div className="flex flex-col gap-6">
      <SegmentedControl
        label={c.tabs}
        value={tab}
        onChange={setTab}
        options={[
          { value: 'raise', label: c.tabRaise },
          { value: 'bankruptcy', label: c.tabBankruptcy },
        ]}
      />
      {tab === 'raise' ? <Raise x={x} setX={setX} /> : <Liquidation proceeds={proceeds} setProceeds={setProceeds} founderShare={r.founderShare} />}
      <MissionBoard storageId="startup" missions={missions} badge={c.badge} />
    </div>
  )
}

// --- Levée de fonds ------------------------------------------------------------------------------

function Raise({ x, setX }: { x: Inputs; setX: (updater: (prev: Inputs) => Inputs) => void }) {
  const c = useCopy(copy)
  const scenario = useContent().adidas.scenarios.strideLab
  const set = (key: keyof Inputs) => (value: number) => setX((prev) => ({ ...prev, [key]: value }))
  const r = raise(x)
  const control =
    Math.abs(r.founderShare - 0.5) < 1e-9
      ? { tone: 'warning' as const, label: c.tie }
      : r.founderShare > 0.5
        ? { tone: 'good' as const, label: c.majority }
        : { tone: 'critical' as const, label: c.lost }
  const pie = [
    { name: c.adidas, value: r.founderShare, color: colors.adidas },
    { name: c.vc, value: r.investorShare, color: colors.vc },
  ]

  const sheet = (after: boolean): BalanceColumn[] => [
    {
      id: 'assets',
      label: c.assets,
      segments: [
        { id: 'fixed-assets', label: c.fixedAssets, short: c.fixedAssets, value: s.fixedAssets, color: balanceColors['fixed-assets'] },
        { id: 'cash-assets', label: c.cash, value: s.cash + (after ? x.inv : 0), color: balanceColors['cash-assets'] },
      ],
    },
    {
      id: 'liabilities',
      label: c.liabilities,
      segments: [
        { id: 'equity', label: c.capital, value: CAPITAL + (after ? r.capitalIncrease : 0), color: balanceColors.equity },
        ...(after ? [{ id: 'premium', label: c.premium, value: r.sharePremium, color: colors.premium }] : []),
      ],
    },
  ]
  const totalAfter = s.fixedAssets + s.cash + x.inv
  const height = 300

  return (
    <>
      <Panel
        title={scenario.title}
        subtitle={scenario.story}
        actions={
          <button type="button" onClick={() => setX(() => base)} className="inline-flex items-center gap-1 text-sm text-secondary hover:text-ink">
            <RotateCcw className="size-4" aria-hidden /> {c.reset}
          </button>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <InteractiveSlider
              label={c.pre}
              value={x.pre}
              min={20}
              max={400}
              step={2.5}
              onChange={set('pre')}
              format={(v) => formatMillions(v, 1)}
              reference={{ value: base.pre, label: c.courseRef }}
              hint={c.preHint}
            />
            <InteractiveSlider
              label={c.inv}
              value={x.inv}
              min={5}
              max={300}
              step={5}
              onChange={set('inv')}
              format={(v) => formatMillions(v, 0)}
              reference={{ value: base.inv, label: c.courseRef }}
            />
            <StatTile label={c.control} value={pct(r.founderShare)} sub={control.label} tone={control.tone} />
          </div>

          <div className="flex min-w-0 justify-center">
            <figure className="flex w-full max-w-xs flex-col items-center gap-2">
              <figcaption className="self-start text-sm font-medium">{c.pieTitle}</figcaption>
              <div className="relative h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pie} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="92%" startAngle={90} endAngle={-270} stroke={chrome.surface} strokeWidth={2} isAnimationActive={false}>
                      {pie.map((p) => (
                        <Cell key={p.name} fill={p.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold tabular-nums">{formatPercent(r.founderShare, 0)}</span>
                  <span className="text-xs text-secondary">Adidas</span>
                </div>
              </div>
              <ul className="flex w-full flex-col gap-1 text-xs">
                {pie.map((p) => (
                  <li key={p.name} className="flex items-center gap-2">
                    <span className="size-2.5 rounded-sm" style={{ background: p.color }} aria-hidden />
                    <span className="flex-1 text-secondary">{p.name}</span>
                    <span className="font-medium tabular-nums">{pct(p.value)}</span>
                  </li>
                ))}
              </ul>
            </figure>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile label={c.post} value={formatMillions(r.post, 1)} sub={c.postSub} />
          <StatTile label={c.price} value={formatEuros(r.pricePerShare)} sub={c.priceSub(formatEuros(NOMINAL))} />
          <StatTile label={c.newShares} value={formatNumber(r.newShares)} sub={c.newSharesSub(formatNumber(SHARES + r.newShares))} />
          <StatTile label={c.premiumShare} value={formatPercent(r.sharePremium / x.inv, 0)} sub={c.premiumShareSub} />
        </div>

        <div className="flex flex-col gap-1 overflow-x-auto rounded-xl border border-hairline bg-white p-3 text-[11px] sm:text-sm">
          <Tex
            display
            math={`${c.texShare} = \\frac{\\text{INV}}{\\text{POST}} = \\frac{${texNum(x.inv, 1)}}{${texNum(x.pre, 1)} + ${texNum(x.inv, 1)}} = ${texPct(r.investorShare)}`}
          />
          <Tex
            display
            math={`${c.texK} = K \\times \\frac{\\text{INV}}{\\text{PRE}} = ${texNum(CAPITAL)} \\times \\frac{${texNum(x.inv, 1)}}{${texNum(x.pre, 1)}} = ${texNum(r.capitalIncrease, 2)}${c.texM} \\qquad ${c.texPremium} = ${texNum(x.inv, 1)} - ${texNum(r.capitalIncrease, 2)} = ${texNum(r.sharePremium, 2)}${c.texM}`}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">{c.before}</p>
            <BalanceSheetChart columns={sheet(false)} height={Math.max(48, (height * (s.fixedAssets + s.cash)) / totalAfter)} format={m1} />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">{c.after}</p>
            <BalanceSheetChart columns={sheet(true)} height={height} format={m1} />
          </div>
        </div>
      </Panel>

      <JCurve />
    </>
  )
}

/** Schéma du cours (p. 459) : flux d'exploitation d'une start-up qui réussit et ses investisseurs successifs. */
function JCurve() {
  const c = useCopy(copy)
  // Allure seulement : un creux pendant la conception, puis une croissance qui passe le point mort.
  const cf = (t: number) => -8 * t * Math.exp(-t / 1.6) + 0.6 * t
  const data = Array.from({ length: 81 }, (_, i) => ({ t: i / 8, cf: cf(i / 8) }))
  const breakEven = 1.6 * Math.log(8 / 0.6)
  const points = [0.4, 1, 1.9, breakEven, 7]
  const here = 1
  const phases: [number, number][] = [
    [0, 1.5],
    [1.5, breakEven + 0.5],
    [breakEven + 0.5, 10],
  ]
  const phaseColors = [series.yellow, series.orange, series.aqua]
  return (
    <Panel title={c.jTitle} subtitle={c.jSubtitle}>
      <ChartLegend items={c.jPhases.map((label, i) => ({ label, color: phaseColors[i], shape: 'square' as const }))} />
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 16, right: 16, bottom: 4, left: 4 }}>
            {phases.map(([x1, x2], i) => (
              <ReferenceArea key={i} x1={x1} x2={x2} fill={phaseColors[i]} fillOpacity={0.12} />
            ))}
            <XAxis dataKey="t" type="number" domain={[0, 10]} {...axisProps} tick={false} />
            <YAxis {...axisProps} tick={false} width={8} />
            <ReferenceLine y={0} stroke={chrome.axis} />
            <Line dataKey="cf" stroke={chrome.ink} strokeWidth={2} dot={false} isAnimationActive={false} />
            {points.map((t, i) => (
              <ReferenceDot
                key={t}
                x={t}
                y={cf(t)}
                r={i === here ? 7 : 5}
                fill={i === here ? series.blue : chrome.ink}
                stroke={chrome.surface}
                strokeWidth={2}
                label={{ value: String(i + 1), position: i < 3 ? 'bottom' : 'top', fill: chrome.ink, fontSize: 11, fontWeight: 600 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ol className="grid gap-x-6 gap-y-1 text-xs text-secondary sm:grid-cols-2">
        {c.jPoints.map((label, i) => (
          <li key={label} className={i === here ? 'font-semibold text-ink' : ''}>
            {i + 1}. {label}
            {i === here && ` · ${c.jHere}`}
          </li>
        ))}
      </ol>
    </Panel>
  )
}

// --- Plan B : la liquidation -------------------------------------------------------------------

function Liquidation({ proceeds, setProceeds, founderShare }: { proceeds: number; setProceeds: (v: number) => void; founderShare: number }) {
  const c = useCopy(copy)
  const scenario = useContent().adidas.scenarios.liquidation
  const paid = f.liquidationWaterfall(proceeds, l.claims)
  const rows = l.claims.map((claim, i) => ({
    name: c.classes[i],
    paid: paid[i],
    unpaid: claim - paid[i],
    label: c.paidLabel(formatMillions(paid[i], 0), formatMillions(claim, 0), formatPercent(paid[i] / claim, 0)),
  }))
  const creditorClaims = l.claims.slice(0, -1).reduce((a, b) => a + b, 0)
  const creditorsPaid = paid.slice(0, -1).reduce((a, b) => a + b, 0)
  const toShareholders = paid[paid.length - 1]
  const total = l.claims.reduce((a, b) => a + b, 0)

  return (
    <Panel title={scenario.title} subtitle={scenario.story}>
      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <InteractiveSlider label={c.proceeds} value={proceeds} min={0} max={total + 10} step={1} onChange={setProceeds} format={(v) => formatMillions(v, 0)} />
          <StatTile label={c.creditors} value={formatMillions(creditorsPaid, 0)} sub={c.creditorsSub(formatMillions(creditorClaims, 0))} tone={creditorsPaid >= creditorClaims ? 'good' : 'warning'} />
          <StatTile
            label={c.shareholders}
            value={formatMillions(toShareholders, 1)}
            sub={
              toShareholders > 0
                ? c.shareholdersSub(formatMillions(toShareholders * founderShare, 1), formatMillions(toShareholders * (1 - founderShare), 1))
                : c.shareholdersZero
            }
            tone={toShareholders > 0 ? 'good' : 'critical'}
          />
        </div>
        <figure className="flex min-w-0 flex-col gap-2">
          <ChartLegend
            items={[
              { label: c.paid, color: series.aqua, shape: 'square' },
              { label: c.unpaid, color: chrome.grid, shape: 'square' },
            ]}
          />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 4, bottom: 4, left: 4 }} barCategoryGap={8}>
                <CartesianGrid horizontal={false} stroke={chrome.grid} />
                <XAxis type="number" {...axisProps} tickFormatter={(v: number) => formatNumber(v)} />
                <YAxis yAxisId="name" type="category" dataKey="name" {...axisProps} width={170} interval={0} />
                {/* Second axe de catégories, à droite : l'étiquette « remboursé / créance » de chaque rang. */}
                <YAxis yAxisId="label" orientation="right" type="category" dataKey="label" {...axisProps} width={130} interval={0} />
                <Bar yAxisId="name" dataKey="paid" stackId="claim" fill={series.aqua} barSize={20} isAnimationActive={false} />
                <Bar yAxisId="name" dataKey="unpaid" stackId="claim" fill={chrome.grid} barSize={20} radius={[0, 3, 3, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </figure>
      </div>
    </Panel>
  )
}
