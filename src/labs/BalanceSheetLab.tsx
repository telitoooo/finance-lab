import { Check, X } from 'lucide-react'
import { useState } from 'react'
import BalanceSheetChart from '../components/BalanceSheetChart'
import Panel from '../components/ui/Panel'
import SegmentedControl from '../components/ui/SegmentedControl'
import StatTile from '../components/ui/StatTile'
import Tex from '../components/ui/Tex'
import ThresholdMeter from '../components/ui/ThresholdMeter'
import { useContent } from '../i18n/content'
import { useCopy, useLang } from '../i18n/lang'
import { accountingColumns, adidasBalance as b, economicColumns } from '../lib/balanceSheet'
import * as f from '../lib/finance'
import { formatMoney, formatNumber, formatPercent, texNum } from '../lib/format'
import { netDebtToEbitdaVerdict, stableRatioRange, stableRatioVerdict, stableRatioZones } from './shared'

type View = 'accounting' | 'economic'

const n = (v: number) => texNum(v)
const ratio = (v: number) => formatNumber(v, 2, 2)

const copy = {
  fr: {
    title: 'Le bilan Adidas au 31/12/2025',
    subtitle: 'En M€. Survole un bloc (ou parcours-les au clavier) pour voir les postes regroupés.',
    reading: 'Lecture du bilan',
    accounting: 'Vision comptable',
    economic: 'Vision économique',
    source: 'Source :',
    total: 'Total du bilan',
    equality: 'Σ Actif = Σ Passif',
    liquidity: (
      <>
        L'actif est classé par <strong className="text-ink">liquidité croissante</strong> (des immobilisations au cash), le passif par{' '}
        <strong className="text-ink">exigibilité croissante</strong> (des capitaux propres au découvert).
      </>
    ),
    payables: (amount: string) =>
      `Les dettes fournisseurs (${amount}) sont « gratuites » si elles sont payées à temps. Les dettes financières, elles, coûtent des intérêts.`,
    switchHint: 'Bascule en vision économique pour voir le BFR et la dette nette apparaître.',
    step1: "1. Les dettes d'exploitation passent dans le BFR",
    step2: '2. La trésorerie se déduit des dettes financières',
    step3: "3. Les deux colonnes s'équilibrent",
    texWcr: '\\text{BFR}',
    texNetDebt: '\\text{Dette nette}',
    gearing: 'Gearing (dette nette / capitaux propres)',
    leases: 'Dettes de loyers incluses (normes IFRS 16).',
    solvencyTitle: 'Adidas est-il solvable ?',
    solvencySubtitle: 'Le diagnostic du cours, appliqué au bilan 2025.',
    stableRatio: 'Ressources stables / capitaux employés',
    meterLabel: 'Ratio de solvabilité à moyen terme',
    verdict: 'Verdict :',
    verdictText: (cash: string) => `Les ressources stables couvrent tout le capital employé, la trésorerie nette est positive (${cash}).`,
    netDebtEbitda: 'Dette nette / EBITDA',
    liquidityRatios: "Ratios de liquidité (à connaître pour s'en méfier)",
    liquidityWarning: 'Horizon de 3 mois, postes volatils, et une hausse du BFR peut les améliorer : le cours conseille de les éviter.',
    guessTitle: 'Exercice : à qui appartient ce bilan ?',
    guessSubtitle: "Structure en % du total. Quatre bilans viennent du cours, le cinquième est celui d'Adidas (p. 74-76).",
    yourAnswer: 'Ta réponse',
    companyOf: (id: string) => `Entreprise du bilan ${id}`,
    right: 'Juste',
    check: 'Corriger',
    score: (s: number, t: number) => `${s} / ${t} bonnes réponses`,
    assets: 'Actif',
    liabilities: 'Passif',
  },
  en: {
    title: "Adidas's balance sheet at 31/12/2025",
    subtitle: 'In €m. Hover over a block (or tab through them) to see the grouped items.',
    reading: 'Balance sheet reading',
    accounting: 'Accounting view',
    economic: 'Economic view',
    source: 'Source:',
    total: 'Balance sheet total',
    equality: 'Σ Assets = Σ Liabilities',
    liquidity: (
      <>
        Assets are listed by <strong className="text-ink">increasing liquidity</strong> (from fixed assets to cash), liabilities by{' '}
        <strong className="text-ink">increasing payability</strong> (from equity to overdraft).
      </>
    ),
    payables: (amount: string) => `Trade payables (${amount}) are "free" if paid on time. Financial debts, on the other hand, cost interest.`,
    switchHint: 'Switch to the economic view to see the WCR and the net debt appear.',
    step1: '1. Operating debts move into the WCR',
    step2: '2. Cash is deducted from financial debts',
    step3: '3. Both columns balance',
    texWcr: '\\text{WCR}',
    texNetDebt: '\\text{Net debt}',
    gearing: 'Gearing (net debt / equity)',
    leases: 'Lease liabilities included (IFRS 16).',
    solvencyTitle: 'Is Adidas solvent?',
    solvencySubtitle: "The course's diagnosis, applied to the 2025 balance sheet.",
    stableRatio: 'Stable resources / capital employed',
    meterLabel: 'Medium-term solvency ratio',
    verdict: 'Verdict:',
    verdictText: (cash: string) => `Stable resources cover all the capital employed, net cash is positive (${cash}).`,
    netDebtEbitda: 'Net debt / EBITDA',
    liquidityRatios: 'Liquidity ratios (know them to distrust them)',
    liquidityWarning: '3-month horizon, volatile items, and a WCR increase can improve them: the course advises avoiding them.',
    guessTitle: 'Exercise: whose balance sheet is this?',
    guessSubtitle: "Structure as a % of the total. Four balance sheets come from the course, the fifth is Adidas's (p. 74-76).",
    yourAnswer: 'Your answer',
    companyOf: (id: string) => `Company of balance sheet ${id}`,
    right: 'Right',
    check: 'Check',
    score: (s: number, t: number) => `${s} / ${t} right answers`,
    assets: 'Assets',
    liabilities: 'Liabilities',
  },
}

export default function BalanceSheetLab() {
  const c = useCopy(copy)
  const lang = useLang()
  const { adidas } = useContent()
  const [view, setView] = useState<View>('accounting')
  const columns =
    view === 'accounting'
      ? accountingColumns(adidas, lang)
      : economicColumns({ fixedAssets: b.fixedAssets, wcr: b.wcr, equity: b.equity, provisions: b.provisions, netDebt: b.netDebt }, lang)

  return (
    <div className="flex flex-col gap-6">
      <Panel
        title={c.title}
        subtitle={c.subtitle}
        actions={
          <SegmentedControl
            label={c.reading}
            value={view}
            onChange={setView}
            options={[
              { value: 'accounting', label: c.accounting },
              { value: 'economic', label: c.economic },
            ]}
          />
        }
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <BalanceSheetChart columns={columns} caption={`${c.source} ${adidas.meta.source}.`} />
          {view === 'accounting' ? <AccountingNotes /> : <EconomicNotes />}
        </div>
      </Panel>

      <SolvencyPanel />
      <GuessCompany />
    </div>
  )
}

function AccountingNotes() {
  const c = useCopy(copy)
  return (
    <aside className="flex flex-col gap-3 text-sm">
      <StatTile label={c.total} value={formatMoney(b.total)} sub={c.equality} tone="good" />
      <p className="text-secondary">{c.liquidity}</p>
      <p className="text-secondary">{c.payables(formatMoney(b.payables))}</p>
      <p className="text-xs text-muted">{c.switchHint}</p>
    </aside>
  )
}

function EconomicNotes() {
  const c = useCopy(copy)
  return (
    <aside className="flex flex-col gap-3 text-sm">
      <div className="rounded-xl border border-hairline bg-white p-3">
        <p className="mb-1 text-xs text-secondary">{c.step1}</p>
        <Tex math={`${c.texWcr} = ${n(b.operatingCurrentAssets)} - ${n(b.operatingCurrentLiabilities)} = \\mathbf{${n(b.wcr)}}`} />
      </div>
      <div className="rounded-xl border border-hairline bg-white p-3">
        <p className="mb-1 text-xs text-secondary">{c.step2}</p>
        <Tex math={`${c.texNetDebt} = ${n(b.ltDebt)} + ${n(b.cashLiabilities)} - ${n(b.cashAssets)} = \\mathbf{${n(b.netDebt)}}`} />
      </div>
      <div className="rounded-xl border border-hairline bg-white p-3">
        <p className="mb-1 text-xs text-secondary">{c.step3}</p>
        <Tex math={`${n(b.fixedAssets)} + ${n(b.wcr)} = ${n(b.equity)} + ${n(b.provisions)} + ${n(b.netDebt)} = \\mathbf{${n(b.capitalEmployed)}}`} />
      </div>
      <StatTile label={c.gearing} value={ratio(f.gearing(b.netDebt, b.equity))} sub={c.leases} />
    </aside>
  )
}

function SolvencyPanel() {
  const c = useCopy(copy)
  const lang = useLang()
  const { adidas } = useContent()
  const stable = f.stableResourcesRatio(b.stableResources, b.capitalEmployed)
  const ebitda = adidas.incomeStatement.ebitda
  const leverage = b.netDebt / ebitda
  const verdict = netDebtToEbitdaVerdict(leverage, lang)
  const currentAssets = b.operatingCurrentAssets + b.cashAssets
  const currentLiabilities = b.operatingCurrentLiabilities + b.cashLiabilities

  return (
    <Panel title={c.solvencyTitle} subtitle={c.solvencySubtitle}>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">{c.stableRatio}</p>
        <Tex
          math={`\\frac{${n(b.equity)} + ${n(b.provisions)} + ${n(b.ltDebt)}}{${n(b.fixedAssets)} + ${n(b.wcr)}} = \\frac{${n(b.stableResources)}}{${n(b.capitalEmployed)}}`}
        />
        <ThresholdMeter
          label={c.meterLabel}
          value={stable}
          min={stableRatioRange.min}
          max={stableRatioRange.max}
          zones={stableRatioZones(lang)}
          format={(v) => formatPercent(v, 0)}
        />
        <p className="text-sm text-secondary">
          {c.verdict} <strong className="text-ink">{stableRatioVerdict(stable, lang)}</strong>. {c.verdictText(formatMoney(b.netCash))}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <StatTile
          label={c.netDebtEbitda}
          value={ratio(leverage)}
          sub={`${verdict.label} (${formatMoney(b.netDebt)} / ${formatMoney(ebitda)})`}
          tone={verdict.tone}
        />
        <StatTile
          label={c.liquidityRatios}
          value={
            <span className="text-base font-medium">
              Current {ratio(f.currentRatio(currentAssets, currentLiabilities))} · Quick{' '}
              {ratio(f.quickRatio(currentAssets, b.inventories, currentLiabilities))} · Cash {ratio(f.cashRatio(b.cashAssets, currentLiabilities))}
            </span>
          }
          sub={c.liquidityWarning}
          tone="warning"
        />
      </div>
    </Panel>
  )
}

function GuessCompany() {
  const c = useCopy(copy)
  const { adidas } = useContent()
  const g = adidas.guessCompany
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [checked, setChecked] = useState(false)
  const score = g.columns.filter((col) => answers[col.id] === col.answer).length

  return (
    <Panel title={c.guessTitle} subtitle={c.guessSubtitle}>
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[34rem] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="w-48" />
              {g.columns.map((col) => (
                <th key={col.id} className="px-2 pb-2 text-center font-semibold">
                  {col.id}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(['assets', 'liabilities'] as const).map((side) => (
              <SideRows key={side} side={side} />
            ))}
            <tr>
              <td className="pt-3 text-xs text-secondary">{c.yourAnswer}</td>
              {g.columns.map((col) => {
                const ok = answers[col.id] === col.answer
                return (
                  <td key={col.id} className="px-1 pt-3 align-top">
                    <select
                      value={answers[col.id] ?? ''}
                      onChange={(e) => {
                        setAnswers({ ...answers, [col.id]: e.target.value })
                        setChecked(false)
                      }}
                      aria-label={c.companyOf(col.id)}
                      className={`w-full rounded-md border bg-white px-1 py-1 text-xs ${
                        checked ? (ok ? 'border-good' : 'border-critical') : 'border-hairline'
                      }`}
                    >
                      <option value="">…</option>
                      {g.companies.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                    {checked && (
                      <p className={`mt-1 flex items-center gap-1 text-[11px] ${ok ? 'text-good-ink' : 'text-critical'}`}>
                        {ok ? <Check className="size-3" aria-hidden /> : <X className="size-3" aria-hidden />}
                        {ok ? c.right : col.answer}
                      </p>
                    )}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setChecked(true)}
          disabled={Object.keys(answers).length < g.columns.length}
          className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {c.check}
        </button>
        {checked && <p className="text-sm font-medium">{c.score(score, g.columns.length)}</p>}
      </div>
      {checked && (
        <ul className="flex flex-col gap-1.5 text-sm text-secondary">
          {g.columns.map((col) => (
            <li key={col.id}>
              <strong className="text-ink">
                {col.id} = {col.answer}.
              </strong>{' '}
              {col.hint}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function SideRows({ side }: { side: 'assets' | 'liabilities' }) {
  const c = useCopy(copy)
  const { adidas } = useContent()
  const g = adidas.guessCompany
  return (
    <>
      <tr>
        <td colSpan={g.columns.length + 1} className="pt-2 pb-1 text-xs font-semibold tracking-wide text-muted uppercase">
          {side === 'assets' ? c.assets : c.liabilities}
        </td>
      </tr>
      {g.rows[side].map((row) => (
        <tr key={row.id}>
          <td className="border-t border-hairline py-1 pr-2 text-secondary">{row.label}</td>
          {g.columns.map((col) => {
            const v = col.values[row.id] ?? 0
            return (
              <td
                key={col.id}
                className="border-t border-hairline px-2 py-1 text-center tabular-nums"
                // Intensité séquentielle (un seul bleu) : plus la part est forte, plus la case est foncée.
                style={{ background: `rgba(42, 120, 214, ${Math.min(v, 90) / 220})` }}
              >
                {v ? formatPercent(Math.round(v) / 100, 0) : '–'}
              </td>
            )
          })}
        </tr>
      ))}
    </>
  )
}
