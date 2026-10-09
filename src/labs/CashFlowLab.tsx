import { Eye, Factory, RotateCcw } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import InteractiveSlider from '../components/InteractiveSlider'
import MissionBoard from '../components/MissionBoard'
import Panel from '../components/ui/Panel'
import SegmentedControl from '../components/ui/SegmentedControl'
import StatTile from '../components/ui/StatTile'
import Tex from '../components/ui/Tex'
import Toggle from '../components/ui/Toggle'
import WaterfallChart, { type WaterfallStep } from '../components/WaterfallChart'
import { adidas } from '../data'
import { useContent } from '../i18n/content'
import { useCopy } from '../i18n/lang'
import { adidasBalance as b } from '../lib/balanceSheet'
import * as f from '../lib/finance'
import { formatDays, formatEurosCents, formatMillions, formatMoney, formatNumber, formatPercent, texNum } from '../lib/format'

const pnl = adidas.incomeStatement
const cfs = adidas.cashFlowStatement
const share = adidas.share

/** Délais exacts au 31/12/2025, recalculés depuis le bilan comme dans le labo BFR. */
const base = {
  dso: (b.receivables / pnl.revenue) * 365,
  dio: (b.inventories / pnl.cogs) * 365,
  dpo: (b.payables / pnl.cogs) * 365,
  capex: cfs.capex,
  disposals: 0,
  newBorrowings: 0,
}
type Inputs = typeof base

/** Le surcoût d'une nouvelle usine automatisée (hypothèse du labo). */
const FACTORY_CAPEX = 1000

/**
 * Flux de financement de l'année simulée : intérêts 2025 nets de l'économie d'impôt (présentation
 * « puriste », p. 223), dividende proposé au titre de 2025 (versé en 2026) et remboursement des
 * dettes de loyers au niveau de 2025. Seuls les nouveaux emprunts sont pilotables.
 */
const financing = {
  interest: cfs.interestPaid * (1 - pnl.taxRate),
  dividends: share.dividendPerShare * share.sharesOutstanding,
  leases: cfs.leaseRepayments,
}

/**
 * Modèle du simulateur : une année d'activité identique à 2025 (EBITDA et EBIT inchangés), impôt
 * calculé sur l'EBIT, BFR recalculé avec les délais choisis (créances sur le CA, stocks et dettes
 * fournisseurs sur le coût des ventes, autres postes inchangés). La variation de BFR est mesurée
 * par rapport au bilan du 31/12/2025.
 */
function model(x: Inputs) {
  const receivables = (x.dso / 365) * pnl.revenue
  const inventories = (x.dio / 365) * pnl.cogs
  const payables = (x.dpo / 365) * pnl.cogs
  const wcr = f.wcr(inventories + receivables + b.otherReceivables, payables + b.otherPayables)
  const wcrIncrease = wcr - b.wcr
  const tax = pnl.taxRate * pnl.ebit
  const cfo = f.operatingCashFlow(pnl.ebitda, pnl.ebit, pnl.taxRate, wcrIncrease)
  const cfi = f.cfi(x.capex, x.disposals)
  const fcff = cfo + cfi
  const cff = f.cff({ newLoans: x.newBorrowings, repayments: financing.leases, interest: financing.interest, dividends: financing.dividends })
  const cashVariation = f.cashVariation(cfo, cfi, cff)
  return { wcr, wcrIncrease, tax, cfo, cfi, fcff, cff, cashVariation, cashEnd: cfs.cashClosing + cashVariation }
}

const presetApply: ((x: Inputs) => Inputs)[] = [
  () => base,
  (x) => ({ ...x, dio: base.dio + 30, dso: base.dso + 30, dpo: base.dpo - 30 }),
  (x) => ({ ...x, dio: base.dio - 40, dpo: base.dpo + 20 }),
]

const copy = {
  fr: {
    tabs: 'Choix de la vue',
    tabSim: "Simulateur : de l'EBITDA au FCFF",
    tabReal: 'Le vrai tableau 2025',
    simTitle: 'Une année de plus chez Adidas',
    simSubtitle:
      "Même activité qu'en 2025 (EBITDA 3 124 M€, EBIT 2 056 M€). Les délais partent du bilan au 31/12/2025 : toute variation crée un ΔBFR. Impôt calculé sur l'EBIT, présentation « puriste » du cours.",
    presets: ['Délais 2025', 'Les 3 réflexes « sympas »', 'Chasse aux stocks'],
    factory: 'Construire une usine automatisée',
    factoryHint: (amount: string) =>
      `+${amount} de CAPEX. Adidas a fermé ses deux Speedfactory (Ansbach et Atlanta) en 2020 : et si elle relançait la production en propre ?`,
    reset: 'Tout remettre à 2025',
    dso: 'Délai de paiement des clients',
    dio: 'Durée de stockage',
    dpo: 'Délai de paiement des usines',
    capex: 'CAPEX',
    capexHint: "Acquisitions d'immobilisations : magasins, entrepôts, logiciels, usines.",
    disposals: "Cessions d'immobilisations",
    newBorrowings: 'Nouveaux emprunts',
    showFinancing: "Aller jusqu'à la variation de trésorerie : ajouter le flux de financement (CFF)",
    steps: {
      ebitda: 'EBITDA',
      tax: "IS calculé sur l'EBIT",
      wcr: 'Variation du BFR',
      cfo: "Flux d'exploitation (CFO)",
      capex: 'CAPEX',
      disposals: 'Cessions',
      fcff: 'Free cash flow (FCFF)',
      interest: "Intérêts (nets d'impôt)",
      dividends: 'Dividendes',
      leases: 'Loyers remboursés (IFRS 16)',
      borrowings: 'Nouveaux emprunts',
      cashVariation: 'Variation de trésorerie',
    },
    cfo: "Flux d'exploitation (CFO)",
    cfoSub: (amount: string, up: boolean) => `BFR ${up ? '+' : '−'}${amount} : cash ${up ? 'consommé' : 'libéré'}`,
    cfoSame: 'BFR inchangé',
    fcff: 'Free cash flow (FCFF)',
    fcffSub: 'CFO + CFI : le cash disponible une fois les investissements payés',
    fcffNegative: 'FCFF négatif : il faudra emprunter, lever des fonds ou puiser dans la trésorerie',
    conversion: 'Conversion FCFF / EBITDA',
    conversionSub: "La part de l'EBITDA qui finit en cash disponible",
    cashEnd: "Trésorerie en fin d'année",
    cashEndSub: (opening: string) => `Ouverture : ${opening} (31/12/2025)`,
    overdraft: 'Trésorerie négative : découvert bancaire',
    financingNote: (interest: string, dividends: string, dps: string, leases: string) =>
      `Financement retenu : intérêts 2025 nets d'impôt (${interest}), dividende proposé de ${dps} par action (${dividends}), loyers remboursés au niveau de 2025 (${leases}).`,
    texFcff: '\\text{FCFF}',
    texCfo: '\\text{CFO}',
    texCfi: '\\text{CFI}',
    missions: [
      {
        label: 'Libère au moins 500 M€ de cash grâce au BFR, sans toucher aux CAPEX',
        hint: 'Réduis la durée de stockage, encaisse les clients plus vite ou négocie des délais fournisseurs plus longs.',
        lesson: 'Une baisse du BFR est un encaissement : CFO = EBITDA − IS − ΔBFR.',
      },
      {
        label: "Construis l'usine (CAPEX ≥ 1,5 Md€) en gardant un FCFF positif",
        hint: 'Le bouton « usine » ajoute 1 Md€ de CAPEX ; compense avec le BFR.',
        lesson: "Le FCFF finance les investissements sans aller voir les banquiers ni les actionnaires.",
      },
      {
        label: 'Rejoue 2025 : fais chuter le CFO sous 1 Md€ avec les seuls délais',
        hint: 'Les 3 réflexes « sympas » : plus de stock, plus de délai aux clients, fournisseurs payés plus vite.',
        lesson: "C'est exactement ce qui s'est passé en 2025 : 3,1 Md€ d'EBITDA, 0,75 Md€ de CFO.",
      },
      {
        label: "Avec le flux de financement affiché, fais passer la trésorerie de fin d'année dans le rouge",
        hint: 'Active le flux de financement, puis investis ou laisse filer le BFR sans emprunter.',
        lesson: 'Cash is king : un bon résultat ne protège pas du découvert.',
      },
    ],
    badge: 'Gardien du cash',
    realTitle: 'Adidas 2025 : le vrai tableau des flux',
    realSubtitle: 'Tableau des flux consolidé publié (M€), regroupé dans la grille du cours.',
    realSteps: {
      ebitda: 'EBITDA',
      tax: 'Impôt payé',
      wcr: 'Hausse du BFR',
      other: "Autres éléments d'exploitation",
      cfo: "Flux d'exploitation (CFO)",
      capex: 'CAPEX',
      disposals: 'Cessions',
      otherInvesting: "Autres flux d'investissement",
      fcff: 'FCFF (CFO + CFI)',
      lenders: 'Prêteurs (net)',
      shareholders: 'Actionnaires',
      fx: 'Effet de change',
      cashVariation: 'Variation de trésorerie',
    },
    cashLine: (open: string, close: string) => `Trésorerie : ${open} au 1er janvier, ${close} au 31 décembre 2025.`,
    questionsTitle: (origin: string) => `Les questions du cours (${origin}), appliquées à Adidas`,
    reveal: 'Révéler la réponse',
    revealed: (n: number, total: number) => `${n} / ${total} réponses révélées`,
    q1: "Pourquoi le CFO est-il si loin de l'EBITDA ?",
    a1: (wcr: string, inv: string, rec: string, pay: string) =>
      `Le BFR a avalé ${wcr} : stocks ${inv}, créances clients et autres ${rec}, et ${pay} de dettes d'exploitation en moins. Chez ENGIE, c'était l'inverse : 13,9 Md€ d'amortissements (charges calculées, sans sortie de cash) transformaient un résultat négatif en 10,4 Md€ de CFO.`,
    q2: "À quoi a servi le cash d'exploitation ?",
    usesHead: ['Utilisation', 'M€', '% du CFO'],
    uses: ['Investir (CFI)', 'Rémunérer et rembourser les apporteurs de capitaux (CFF)', 'Effet de change', 'Variation de trésorerie'],
    a2: "Adidas a investi et distribué plus que son CFO : la trésorerie a comblé l'écart. ENGIE, elle, investissait 60 % de son CFO, en rendait 34 % aux apporteurs de capitaux et en gardait 6 %.",
    q3: 'Combien vaut le FCFF 2025 ?',
    a3: 'Contre 4 154 M€ pour ENGIE en 2015.',
    q4: "Comment s'est-il réparti entre apporteurs de capitaux ?",
    a4: (lenders: string, shareholders: string, total: string, times: string) =>
      `Prêteurs : ${lenders} (intérêts et remboursements, loyers compris, moins les nouveaux emprunts). Actionnaires : ${shareholders} (dividendes, actions propres). Total : ${total}, soit ${times} le FCFF : le reste est venu de la trésorerie. Chez ENGIE, 74 % du FCFF allait aux actionnaires, 10 % aux prêteurs et 15 % restait en trésorerie.`,
  },
  en: {
    tabs: 'Choice of view',
    tabSim: 'Simulator: from EBITDA to FCFF',
    tabReal: 'The real 2025 statement',
    simTitle: 'One more year at Adidas',
    simSubtitle:
      'Same business as in 2025 (EBITDA €3,124m, EBIT €2,056m). Payment terms start from the 31/12/2025 balance sheet: any change creates a ΔWCR. Tax computed on EBIT, the course\'s "purist" presentation.',
    presets: ['2025 terms', 'The 3 "nice" reflexes', 'Inventory hunt'],
    factory: 'Build an automated factory',
    factoryHint: (amount: string) =>
      `+${amount} of CAPEX. Adidas closed its two Speedfactories (Ansbach and Atlanta) in 2020: what if it brought production back in-house?`,
    reset: 'Reset everything to 2025',
    dso: 'Customer payment terms',
    dio: 'Storage time',
    dpo: 'Factory payment terms',
    capex: 'CAPEX',
    capexHint: 'Acquisitions of fixed assets: stores, warehouses, software, factories.',
    disposals: 'Disposals of fixed assets',
    newBorrowings: 'New loans',
    showFinancing: 'Go down to the variation of cash: add the cash flows from financing (CFF)',
    steps: {
      ebitda: 'EBITDA',
      tax: 'Tax computed on EBIT',
      wcr: 'Change in WCR',
      cfo: 'Cash flows from operations (CFO)',
      capex: 'CAPEX',
      disposals: 'Disposals',
      fcff: 'Free cash flow (FCFF)',
      interest: 'Interest (net of tax)',
      dividends: 'Dividends',
      leases: 'Lease repayments (IFRS 16)',
      borrowings: 'New loans',
      cashVariation: 'Variation of cash',
    },
    cfo: 'Cash flows from operations (CFO)',
    cfoSub: (amount: string, up: boolean) => `WCR ${up ? '+' : '−'}${amount}: cash ${up ? 'consumed' : 'released'}`,
    cfoSame: 'WCR unchanged',
    fcff: 'Free cash flow (FCFF)',
    fcffSub: 'CFO + CFI: the cash available once investments are paid',
    fcffNegative: 'Negative FCFF: Adidas will have to borrow, raise equity or use its cash',
    conversion: 'FCFF / EBITDA conversion',
    conversionSub: 'The share of EBITDA that ends up as available cash',
    cashEnd: 'Cash at year-end',
    cashEndSub: (opening: string) => `Opening: ${opening} (31/12/2025)`,
    overdraft: 'Negative cash: bank overdraft',
    financingNote: (interest: string, dividends: string, dps: string, leases: string) =>
      `Financing assumed: 2025 interest net of tax (${interest}), proposed dividend of ${dps} per share (${dividends}), lease repayments at their 2025 level (${leases}).`,
    texFcff: '\\text{FCFF}',
    texCfo: '\\text{CFO}',
    texCfi: '\\text{CFI}',
    missions: [
      {
        label: 'Release at least €500m of cash through the WCR, without touching CAPEX',
        hint: 'Cut storage time, collect from customers faster or negotiate longer supplier terms.',
        lesson: 'A WCR decrease is a cash-in: CFO = EBITDA − tax − ΔWCR.',
      },
      {
        label: 'Build the factory (CAPEX ≥ €1.5bn) while keeping a positive FCFF',
        hint: 'The "factory" button adds €1bn of CAPEX; offset it with the WCR.',
        lesson: 'The FCFF funds investments without going to bankers or shareholders.',
      },
      {
        label: 'Replay 2025: push CFO below €1bn with payment terms only',
        hint: 'The 3 "nice" reflexes: more stock, more time for customers, suppliers paid faster.',
        lesson: 'That is exactly what happened in 2025: €3.1bn of EBITDA, €0.75bn of CFO.',
      },
      {
        label: 'With the financing flows shown, push year-end cash into the red',
        hint: 'Turn on the financing flows, then invest or let the WCR slip without borrowing.',
        lesson: 'Cash is king: a good result does not protect you from an overdraft.',
      },
    ],
    badge: 'Cash keeper',
    realTitle: "Adidas 2025: the real cash flow statement",
    realSubtitle: 'Published consolidated cash flow statement (€m), regrouped into the course template.',
    realSteps: {
      ebitda: 'EBITDA',
      tax: 'Tax paid',
      wcr: 'WCR increase',
      other: 'Other operating items',
      cfo: 'Cash flows from operations (CFO)',
      capex: 'CAPEX',
      disposals: 'Disposals',
      otherInvesting: 'Other investment flows',
      fcff: 'FCFF (CFO + CFI)',
      lenders: 'Lenders (net)',
      shareholders: 'Shareholders',
      fx: 'Exchange rate effect',
      cashVariation: 'Variation of cash',
    },
    cashLine: (open: string, close: string) => `Cash: ${open} on 1 January, ${close} on 31 December 2025.`,
    questionsTitle: (origin: string) => `The course questions (${origin}), applied to Adidas`,
    reveal: 'Reveal the answer',
    revealed: (n: number, total: number) => `${n} / ${total} answers revealed`,
    q1: 'Why is CFO so far below EBITDA?',
    a1: (wcr: string, inv: string, rec: string, pay: string) =>
      `The WCR swallowed ${wcr}: inventories ${inv}, trade and other receivables ${rec}, and ${pay} less operating payables. ENGIE was the opposite: €13.9bn of depreciation (calculated expenses, no cash out) turned a negative result into €10.4bn of CFO.`,
    q2: 'What was the operating cash used for?',
    usesHead: ['Use', '€m', '% of CFO'],
    uses: ['Investing (CFI)', 'Paying and repaying capital providers (CFF)', 'Exchange rate effect', 'Variation of cash'],
    a2: 'Adidas invested and paid out more than its CFO: cash filled the gap. ENGIE invested 60% of its CFO, returned 34% to capital providers and kept 6%.',
    q3: 'How much is the 2025 FCFF?',
    a3: 'Versus €4,154m for ENGIE in 2015.',
    q4: 'How was it split among capital providers?',
    a4: (lenders: string, shareholders: string, total: string, times: string) =>
      `Lenders: ${lenders} (interest and repayments, leases included, minus new loans). Shareholders: ${shareholders} (dividends, treasury shares). Total: ${total}, i.e. ${times} the FCFF: the rest came from cash. At ENGIE, 74% of the FCFF went to shareholders, 10% to lenders and 15% stayed in cash.`,
  },
}

type Tab = 'sim' | 'real'

export default function CashFlowLab() {
  const c = useCopy(copy)
  const [tab, setTab] = useState<Tab>('sim')
  return (
    <div className="flex flex-col gap-6">
      <SegmentedControl
        label={c.tabs}
        value={tab}
        onChange={setTab}
        options={[
          { value: 'sim', label: c.tabSim },
          { value: 'real', label: c.tabReal },
        ]}
      />
      {tab === 'sim' ? <Simulator /> : <Real2025 />}
    </div>
  )
}

// --- Simulateur ------------------------------------------------------------------------------

/** « − 500 » ou « + 120 » pour enchaîner des termes dans une formule KaTeX. */
const signed = (v: number) => `${v < 0 ? '+' : '-'} ${texNum(Math.abs(v))}`

function Simulator() {
  const c = useCopy(copy)
  const [x, setX] = useState<Inputs>(base)
  const [showFinancing, setShowFinancing] = useState(false)
  const set = (key: keyof Inputs) => (value: number) => setX((prev) => ({ ...prev, [key]: value }))
  const m = model(x)
  const s = c.steps

  const steps: WaterfallStep[] = [
    { id: 'ebitda', label: s.ebitda, kind: 'total', value: pnl.ebitda },
    { id: 'tax', label: s.tax, kind: 'delta', value: -m.tax },
    { id: 'wcr', label: s.wcr, kind: 'delta', value: -m.wcrIncrease },
    { id: 'cfo', label: s.cfo, kind: 'total', value: m.cfo },
    { id: 'capex', label: s.capex, kind: 'delta', value: -x.capex },
    { id: 'disposals', label: s.disposals, kind: 'delta', value: x.disposals },
    { id: 'fcff', label: s.fcff, kind: 'total', value: m.fcff },
  ]
  if (showFinancing)
    steps.push(
      { id: 'interest', label: s.interest, kind: 'delta', value: -financing.interest },
      { id: 'dividends', label: s.dividends, kind: 'delta', value: -financing.dividends },
      { id: 'leases', label: s.leases, kind: 'delta', value: -financing.leases },
      { id: 'borrowings', label: s.borrowings, kind: 'delta', value: x.newBorrowings },
      { id: 'cash', label: s.cashVariation, kind: 'total', value: m.cashVariation },
    )

  const capexUntouched = Math.abs(x.capex - base.capex) < 1
  const missions = c.missions.map((mission, i) => ({
    ...mission,
    id: ['free-cash', 'factory', 'replay-2025', 'overdraft'][i],
    done: [
      -m.wcrIncrease >= 500 && capexUntouched,
      x.capex >= 1500 && m.fcff > 0,
      m.cfo < 1000,
      showFinancing && m.cashEnd < 0,
    ][i],
  }))
  const wcrMoved = Math.abs(m.wcrIncrease) >= 1

  return (
    <div className="flex flex-col gap-6">
      <Panel
        title={c.simTitle}
        subtitle={c.simSubtitle}
        actions={
          <button
            type="button"
            onClick={() => setX(base)}
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
              onClick={() => setX(presetApply[i](x))}
              className="rounded-lg border border-hairline bg-white px-3 py-1.5 text-sm hover:border-ink"
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setX((p) => ({ ...p, capex: p.capex + FACTORY_CAPEX }))}
            className="inline-flex items-center gap-1.5 rounded-lg border border-ink bg-ink px-3 py-1.5 text-sm text-white hover:bg-neutral-800"
            title={c.factoryHint(formatMoney(FACTORY_CAPEX))}
          >
            <Factory className="size-4" aria-hidden /> {c.factory}
          </button>
        </div>
        <p className="-mt-2 text-xs text-secondary">{c.factoryHint(formatMoney(FACTORY_CAPEX))}</p>

        <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <InteractiveSlider label={c.dso} value={x.dso} min={0} max={120} onChange={set('dso')} format={formatDays} reference={{ value: base.dso, label: '2025' }} />
            <InteractiveSlider label={c.dio} value={x.dio} min={60} max={270} onChange={set('dio')} format={formatDays} reference={{ value: base.dio, label: '2025' }} />
            <InteractiveSlider label={c.dpo} value={x.dpo} min={20} max={180} onChange={set('dpo')} format={formatDays} reference={{ value: base.dpo, label: '2025' }} />
            <InteractiveSlider
              label={c.capex}
              value={x.capex}
              min={0}
              max={3000}
              step={10}
              onChange={set('capex')}
              format={formatMillions}
              reference={{ value: base.capex, label: '2025' }}
              hint={c.capexHint}
            />
            <InteractiveSlider label={c.disposals} value={x.disposals} min={0} max={1000} step={10} onChange={set('disposals')} format={formatMillions} />
            {showFinancing && (
              <InteractiveSlider label={c.newBorrowings} value={x.newBorrowings} min={0} max={3000} step={50} onChange={set('newBorrowings')} format={formatMillions} />
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <WaterfallChart steps={steps} format={formatMillions} />
            <Toggle checked={showFinancing} onChange={setShowFinancing}>
              {c.showFinancing}
            </Toggle>
            {showFinancing && (
              <p className="text-xs text-secondary">
                {c.financingNote(
                  formatMillions(financing.interest),
                  formatMillions(financing.dividends),
                  formatEurosCents(share.dividendPerShare),
                  formatMillions(financing.leases),
                )}
              </p>
            )}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-hairline bg-white p-3 text-[11px] sm:text-sm">
          <Tex
            display
            math={`${c.texFcff} = \\underbrace{${texNum(pnl.ebitda)} - ${texNum(m.tax)} ${signed(m.wcrIncrease)}}_{${c.texCfo}\\,=\\,${texNum(m.cfo)}} \\underbrace{- ${texNum(x.capex)} + ${texNum(x.disposals)}}_{${c.texCfi}\\,=\\,${texNum(m.cfi)}} = \\mathbf{${texNum(m.fcff)}}`}
          />
        </div>

        <div className={`grid gap-3 sm:grid-cols-2 ${showFinancing ? 'xl:grid-cols-4' : 'xl:grid-cols-3'}`}>
          <StatTile
            label={c.cfo}
            value={formatMillions(m.cfo)}
            sub={wcrMoved ? c.cfoSub(formatMoney(Math.abs(m.wcrIncrease)), m.wcrIncrease > 0) : c.cfoSame}
            tone={wcrMoved ? (m.wcrIncrease > 0 ? 'warning' : 'good') : 'neutral'}
          />
          <StatTile
            label={c.fcff}
            value={formatMillions(m.fcff)}
            sub={m.fcff >= 0 ? c.fcffSub : c.fcffNegative}
            tone={m.fcff >= 0 ? 'good' : 'critical'}
          />
          <StatTile label={c.conversion} value={formatPercent(m.fcff / pnl.ebitda, 0)} sub={c.conversionSub} />
          {showFinancing && (
            <StatTile
              label={c.cashEnd}
              value={formatMillions(m.cashEnd)}
              sub={m.cashEnd >= 0 ? c.cashEndSub(formatMillions(cfs.cashClosing)) : c.overdraft}
              tone={m.cashEnd >= 0 ? 'neutral' : 'critical'}
            />
          )}
        </div>
      </Panel>

      <MissionBoard storageId="cash-flow" missions={missions} badge={c.badge} />
    </div>
  )
}

// --- Le vrai tableau 2025 (exercice ENGIE transposé) ----------------------------------------------

function Real2025() {
  const c = useCopy(copy)
  const scenario = useContent().adidas.scenarios.cashFlow2025
  const { meta } = useContent().adidas
  const s = c.realSteps
  const fcff = cfs.cfo + cfs.cfi
  const lenders = cfs.newBorrowings - cfs.repayments - cfs.leaseRepayments - cfs.interestPaid
  const shareholders = -cfs.dividends + cfs.otherFinancing
  const cashVariation = cfs.cashClosing - cfs.cashOpening

  const steps: WaterfallStep[] = [
    { id: 'ebitda', label: s.ebitda, kind: 'total', value: pnl.ebitda },
    { id: 'tax', label: s.tax, kind: 'delta', value: -cfs.taxPaid },
    { id: 'wcr', label: s.wcr, kind: 'delta', value: -cfs.wcrIncrease },
    { id: 'other', label: s.other, kind: 'delta', value: cfs.otherOperating },
    { id: 'cfo', label: s.cfo, kind: 'total', value: cfs.cfo },
    { id: 'capex', label: s.capex, kind: 'delta', value: -cfs.capex },
    { id: 'disposals', label: s.disposals, kind: 'delta', value: cfs.disposals },
    { id: 'other-investing', label: s.otherInvesting, kind: 'delta', value: cfs.otherInvesting },
    { id: 'fcff', label: s.fcff, kind: 'total', value: fcff },
    { id: 'lenders', label: s.lenders, kind: 'delta', value: lenders },
    { id: 'shareholders', label: s.shareholders, kind: 'delta', value: shareholders },
    { id: 'fx', label: s.fx, kind: 'delta', value: cfs.fxEffect },
    { id: 'cash', label: s.cashVariation, kind: 'total', value: cashVariation },
  ]

  const uses = [-cfs.cfi, -cfs.cff, -cfs.fxEffect, cashVariation]
  const pct = (v: number) => formatPercent(v / cfs.cfo, 0)
  const d = cfs.wcrDetail
  const toProviders = -(lenders + shareholders)

  return (
    <Panel title={c.realTitle} subtitle={c.realSubtitle}>
      <p className="max-w-prose text-sm text-secondary">{scenario.story}</p>
      <WaterfallChart steps={steps} format={formatMillions} />
      <p className="text-xs text-muted">
        {c.cashLine(formatMillions(cfs.cashOpening), formatMillions(cfs.cashClosing))} {meta.cashFlowNote}
      </p>

      <RevealList
        title={c.questionsTitle(scenario.pdfOrigin)}
        items={[
          {
            q: c.q1,
            a: <p>{c.a1(formatMillions(cfs.wcrIncrease), `+${formatMillions(d.inventories)}`, `+${formatMillions(d.receivables)}`, formatMillions(d.payables))}</p>,
          },
          {
            q: c.q2,
            a: (
              <div className="flex flex-col gap-2">
                <table className="w-full max-w-md text-left text-xs tabular-nums">
                  <thead className="text-secondary">
                    <tr>
                      {c.usesHead.map((h, i) => (
                        <th key={h} className={`py-1 font-medium ${i > 0 ? 'text-right' : ''}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-hairline font-medium">
                      <td className="py-1">{s.cfo}</td>
                      <td className="text-right">{formatMillions(cfs.cfo)}</td>
                      <td className="text-right">{pct(cfs.cfo)}</td>
                    </tr>
                    {c.uses.map((label, i) => (
                      <tr key={label} className="border-t border-hairline">
                        <td className="py-1 pr-2">{label}</td>
                        <td className="text-right">{formatMillions(uses[i])}</td>
                        <td className="text-right">{pct(uses[i])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p>{c.a2}</p>
              </div>
            ),
          },
          {
            q: c.q3,
            a: (
              <div className="flex flex-col gap-1">
                <Tex math={`\\text{FCFF} = \\text{CFO} + \\text{CFI} = ${texNum(cfs.cfo)} ${signed(-cfs.cfi)} = \\mathbf{${texNum(fcff)}}`} />
                <p>{c.a3}</p>
              </div>
            ),
          },
          {
            q: c.q4,
            a: (
              <p>
                {c.a4(
                  formatMillions(-lenders),
                  formatMillions(-shareholders),
                  formatMillions(toProviders),
                  `${formatNumber(toProviders / fcff, 1)}×`,
                )}
              </p>
            ),
          },
        ]}
      />
    </Panel>
  )
}

/** Questions dont la réponse se dévoile au clic (on réfléchit avant de lire). */
function RevealList({ title, items }: { title: string; items: { q: string; a: ReactNode }[] }) {
  const c = useCopy(copy)
  const [open, setOpen] = useState<number[]>([])
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="font-semibold">{title}</h4>
        <span className="text-xs text-secondary tabular-nums">{c.revealed(open.length, items.length)}</span>
      </div>
      <ol className="flex flex-col gap-2">
        {items.map((item, i) => (
          <li key={item.q} className="rounded-xl border border-hairline bg-white p-3 text-sm">
            <p className="font-medium">
              <span className="text-muted">Q{i + 1}. </span>
              {item.q}
            </p>
            {open.includes(i) ? (
              <div className="mt-2 text-secondary">{item.a}</div>
            ) : (
              <button
                type="button"
                onClick={() => setOpen((prev) => [...prev, i])}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-hairline px-3 py-1 text-xs font-medium hover:border-ink"
              >
                <Eye className="size-3.5" aria-hidden /> {c.reveal}
              </button>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}
