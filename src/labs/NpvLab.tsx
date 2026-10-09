import { Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
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
import InteractiveSlider from '../components/InteractiveSlider'
import Panel from '../components/ui/Panel'
import StatTile from '../components/ui/StatTile'
import Tex from '../components/ui/Tex'
import { adidas } from '../data'
import { useContent } from '../i18n/content'
import { useCopy } from '../i18n/lang'
import { axisProps, chrome, series } from '../lib/chartTheme'
import { chartTooltip } from '../lib/chartTooltip'
import * as f from '../lib/finance'
import { formatMillions, formatNumber, formatPercent, texNum, texPct } from '../lib/format'

type Group = 'adidas' | 'traps'

interface ProjectDef {
  id: string
  flows: number[]
  rate: number
  group: Group
}

const sc = adidas.scenarios
const arr = (v: number | number[]) => v as number[]
const num = (v: number | number[]) => v as number

/** Flux et taux des projets ; les noms et les notes sont dans `copy`. */
const projectDefs: ProjectDef[] = [
  { id: 'sole', flows: arr(sc.soleRnD.data.flows), rate: num(sc.soleRnD.data.rateHigh), group: 'adidas' },
  { id: 'flagship', flows: arr(sc.flagshipStore.data.flows), rate: num(sc.flagshipStore.data.rate), group: 'adidas' },
  { id: 'shanghai', flows: arr(sc.exclusiveProjects.data.shanghaiFlows), rate: num(sc.exclusiveProjects.data.shanghaiRate), group: 'adidas' },
  { id: 'padel', flows: arr(sc.exclusiveProjects.data.padelFlows), rate: num(sc.exclusiveProjects.data.padelRate), group: 'adidas' },
  { id: 'two-step', flows: [-100, 110, -30, 25, 50, 100], rate: 0.1, group: 'traps' },
  { id: 'irr-a', flows: [-5, 6, 0.5], rate: 0.05, group: 'traps' },
  { id: 'irr-b', flows: [-7.5, 2, 3, 0, 0, 2.1, 0, 5.1], rate: 0.05, group: 'traps' },
  { id: 'no-irr', flows: [4, -7, 4], rate: 0.05, group: 'traps' },
  { id: 'two-irr', flows: [-1, 7.2, -7.2], rate: 0.05, group: 'traps' },
]

/** Projets exclusifs du cours : charger l'un affiche l'autre en comparaison. */
const pairs: Record<string, string> = { 'irr-a': 'irr-b', 'irr-b': 'irr-a', shanghai: 'padel', padel: 'shanghai' }

const meur = (v: number, digits = 1) => formatMillions(v, digits)

const copy = {
  fr: {
    names: {
      sole: 'R&D semelle',
      flagship: 'Flagship store',
      shanghai: 'Flagship Shanghai',
      padel: 'Ligne padel',
      'two-step': 'Investissement en deux temps',
      'irr-a': 'Projet A : IRR 28 %',
      'irr-b': 'Projet B : NPV 2,4',
      'no-irr': 'Aucun IRR',
      'two-irr': 'Deux IRR',
    } as Record<string, string>,
    notes: {
      shanghai: 'Peu risqué : rentabilité exigée de 5 %. Exclusif avec la ligne padel.',
      padel: 'Modérément risqué : rentabilité exigée de 7 %. Exclusif avec Shanghai.',
      'two-step': 'Exercice 2 (p. 391-392) : un second investissement en année 2 rend le payback ambigu.',
      'irr-a': 'p. 386 : meilleur IRR mais plus petite NPV que le projet B. Compare-les.',
      'irr-b': "p. 386 : IRR plus faible, mais c'est lui qui crée le plus de valeur.",
      'no-irr': "p. 385 : la NPV est positive à tous les taux, l'équation NPV = 0 n'a pas de solution.",
      'two-irr': "p. 385 : la NPV s'annule deux fois (20 % et 500 %).",
    } as Record<string, string>,
    groups: { adidas: 'Adidas', traps: 'Pièges du cours' },
    pickTitle: 'Choisis un projet',
    custom: 'Projet personnalisé',
    customNote: 'Projet personnalisé : modifie les flux librement.',
    decision: "Décision d'investissement",
    rate: "Taux d'actualisation (rentabilité exigée)",
    rateHint: "Le WACC pour un projet au risque habituel de l'entreprise, plus si le projet est plus risqué.",
    go: 'Le projet crée de la valeur : GO',
    stop: 'Le projet détruit de la valeur : STOP',
    none: 'Aucun',
    and: ' et ',
    irrAbove: (r: string) => `IRR > ${r} exigés : même conclusion que la NPV`,
    irrBelow: (r: string) => `IRR < ${r} exigés : même conclusion que la NPV`,
    noIrr: "NPV = 0 n'a pas de solution : le critère IRR est inutilisable ici.",
    manyIrr: 'Plusieurs IRR : le critère ne permet pas de conclure, fie-toi à la NPV.',
    payback: 'Délai de récupération',
    never: 'Jamais',
    years: (v: number) => `${formatNumber(v, 1)} an${v >= 2 ? 's' : ''}`,
    ambiguous: 'Flux qui changent plusieurs fois de signe : payback ambigu.',
    paybackLimit: "Ignore la valeur temps de l'argent et les flux après le payback.",
    profileCaption: "NPV selon le taux d'actualisation (M€). Elle coupe zéro à l'IRR.",
    chosenRate: 'taux retenu',
    rateTitle: (r: string) => `Taux ${r}`,
    compareWith: 'Comparer avec',
    noProject: 'aucun projet',
    flowsTitle: 'Flux nominaux et flux actualisés',
    flowsSubtitle: (r: string) => `Au taux de ${r}, en M€. Un euro lointain pèse moins qu'un euro proche.`,
    yearFlow: "Flux de l'année",
    presentValue: 'Valeur actuelle',
    yearShort: (y: number) => `A${y}`,
    yearLong: (y: number) => `Année ${y}`,
    head: ['Année', 'Flux', 'Facteur', 'Valeur actuelle', 'Cumul actualisé'],
    lastRow: 'La dernière ligne du cumul actualisé est la NPV au taux de',
    editorTitle: 'Flux de trésorerie disponibles (M€)',
    removeYear: 'Retirer la dernière année',
    addYear: 'Ajouter une année',
  },
  en: {
    names: {
      sole: 'R&D sole',
      flagship: 'Flagship store',
      shanghai: 'Shanghai flagship',
      padel: 'Padel line',
      'two-step': 'Two-step investment',
      'irr-a': 'Project A: IRR 28%',
      'irr-b': 'Project B: NPV 2.4',
      'no-irr': 'No IRR',
      'two-irr': 'Two IRRs',
    } as Record<string, string>,
    notes: {
      shanghai: 'Low risk: required return of 5%. Mutually exclusive with the padel line.',
      padel: 'Moderate risk: required return of 7%. Mutually exclusive with Shanghai.',
      'two-step': 'Exercise 2 (p. 391-392): a second investment in year 2 makes the payback ambiguous.',
      'irr-a': 'p. 386: better IRR but smaller NPV than project B. Compare them.',
      'irr-b': 'p. 386: lower IRR, yet it is the one that creates the most value.',
      'no-irr': 'p. 385: the NPV is positive at every rate, the equation NPV = 0 has no solution.',
      'two-irr': 'p. 385: the NPV crosses zero twice (20% and 500%).',
    } as Record<string, string>,
    groups: { adidas: 'Adidas', traps: 'Course traps' },
    pickTitle: 'Pick a project',
    custom: 'Custom project',
    customNote: 'Custom project: edit the cash flows freely.',
    decision: 'Investment decision',
    rate: 'Discount rate (required return)',
    rateHint: "The WACC for a project with the company's usual risk, more if the project is riskier.",
    go: 'The project creates value: GO',
    stop: 'The project destroys value: STOP',
    none: 'None',
    and: ' and ',
    irrAbove: (r: string) => `IRR > ${r} required: same conclusion as the NPV`,
    irrBelow: (r: string) => `IRR < ${r} required: same conclusion as the NPV`,
    noIrr: 'NPV = 0 has no solution: the IRR criterion is unusable here.',
    manyIrr: 'Several IRRs: the criterion cannot conclude, rely on the NPV.',
    payback: 'Payback period',
    never: 'Never',
    years: (v: number) => `${formatNumber(v, 1)} year${v >= 2 ? 's' : ''}`,
    ambiguous: 'Cash flows change sign several times: ambiguous payback.',
    paybackLimit: 'Ignores the time value of money and the flows after the payback.',
    profileCaption: 'NPV as a function of the discount rate (€m). It crosses zero at the IRR.',
    chosenRate: 'chosen rate',
    rateTitle: (r: string) => `Rate ${r}`,
    compareWith: 'Compare with',
    noProject: 'no project',
    flowsTitle: 'Nominal and discounted cash flows',
    flowsSubtitle: (r: string) => `At a rate of ${r}, in €m. A distant euro weighs less than a near one.`,
    yearFlow: 'Cash flow of the year',
    presentValue: 'Present value',
    yearShort: (y: number) => `Y${y}`,
    yearLong: (y: number) => `Year ${y}`,
    head: ['Year', 'Flow', 'Factor', 'Present value', 'Cumulated PV'],
    lastRow: 'The last row of the cumulated present value is the NPV at a rate of',
    editorTitle: 'Free cash flows (€m)',
    removeYear: 'Remove the last year',
    addYear: 'Add a year',
  },
}

export default function NpvLab() {
  const c = useCopy(copy)
  const { scenarios } = useContent().adidas
  const projects = projectDefs.map((p) => ({
    ...p,
    name: c.names[p.id],
    note: p.id === 'sole' ? scenarios.soleRnD.story : p.id === 'flagship' ? scenarios.flagshipStore.story : c.notes[p.id],
  }))
  const [projectId, setProjectId] = useState('sole')
  const [flows, setFlows] = useState<number[]>(projectDefs[0].flows)
  const [rate, setRate] = useState(projectDefs[0].rate)
  const [compareId, setCompareId] = useState<string>('')
  const project = projects.find((p) => p.id === projectId)
  const compare = projects.find((p) => p.id === compareId)

  function load(id: string) {
    const p = projectDefs.find((x) => x.id === id)!
    setProjectId(id)
    setFlows(p.flows)
    setRate(p.rate)
    setCompareId(pairs[id] ?? '')
  }

  const value = f.npv(rate, flows)
  const irrs = f.irrAll(flows)
  const payback = f.paybackPeriod(flows)
  const signChanges = countSignChanges(flows)
  const compareIrrs = compare ? f.irrAll(compare.flows) : []

  const xMax = Math.min(7, Math.max(0.3, rate * 1.6, ...irrs.map((r) => r * 1.25), ...compareIrrs.map((r) => r * 1.25)))
  const profile = Array.from({ length: 121 }, (_, i) => {
    const r = (xMax * i) / 120
    return { rate: r, npv: f.npv(r, flows), compare: compare ? f.npv(r, compare.flows) : undefined }
  })
  const discounted = f.discountedFlows(rate, flows)
  const table = flows.map((flow, year) => ({
    year,
    flow,
    factor: 1 / (1 + rate) ** year,
    pv: discounted[year],
    cumulative: discounted.slice(0, year + 1).reduce((a, b) => a + b, 0),
  }))

  const irrText = irrs.length === 0 ? c.none : irrs.length === 1 ? formatPercent(irrs[0]) : irrs.map((r) => formatPercent(r, 0)).join(c.and)
  // Décimales utiles seulement : 25 et non 25,0 ; 1,1 et non 1,100.
  const decimals = (v: number, max: number) => (String(Number(v.toFixed(max))).split('.')[1] ?? '').length
  const flowTex = (v: number) => texNum(v, decimals(v, 2))
  const factorTex = texNum(1 + rate, decimals(1 + rate, 3))
  const npvExpression = [
    flowTex(flows[0]),
    ...flows.slice(1, 4).map((flow, i) => `\\frac{${flowTex(flow)}}{${factorTex}${i > 0 ? `^{${i + 1}}` : ''}}`),
  ]
    .join(' + ')
    .replace(/\+ \\frac\{-/g, '- \\frac{')
  const projectName = project?.name ?? c.custom

  return (
    <div className="flex flex-col gap-6">
      <Panel title={c.pickTitle} subtitle={project?.note ?? c.customNote}>
        {(['adidas', 'traps'] as const).map((group) => (
          <div key={group} className="flex flex-wrap items-center gap-2">
            <span className="w-32 text-xs font-semibold tracking-wide text-muted uppercase">{c.groups[group]}</span>
            {projects
              .filter((p) => p.group === group)
              .map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => load(p.id)}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${p.id === projectId ? 'border-ink bg-ink text-white' : 'border-hairline bg-white hover:border-ink'}`}
                >
                  {p.name}
                </button>
              ))}
          </div>
        ))}

        <FlowEditor
          flows={flows}
          onChange={(next) => {
            setFlows(next)
            setProjectId('custom')
          }}
        />
      </Panel>

      <Panel title={c.decision}>
        <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <InteractiveSlider label={c.rate} value={rate} min={0} max={0.5} step={0.005} onChange={setRate} format={(v) => formatPercent(v)} hint={c.rateHint} />
            <StatTile label="NPV" value={meur(value, 2)} tone={value >= 0 ? 'good' : 'critical'} sub={value >= 0 ? c.go : c.stop} />
            <StatTile
              label="IRR"
              value={irrText}
              tone={irrs.length === 1 ? (irrs[0] >= rate ? 'good' : 'critical') : 'warning'}
              sub={
                irrs.length === 1
                  ? irrs[0] >= rate
                    ? c.irrAbove(formatPercent(rate))
                    : c.irrBelow(formatPercent(rate))
                  : irrs.length === 0
                    ? c.noIrr
                    : c.manyIrr
              }
            />
            <StatTile
              label={c.payback}
              value={payback === null ? c.never : c.years(payback)}
              sub={signChanges > 1 ? c.ambiguous : c.paybackLimit}
              tone={signChanges > 1 ? 'warning' : 'neutral'}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <div className="overflow-x-auto rounded-xl border border-hairline bg-white p-3 text-[11px] sm:text-base">
              <Tex display math={`\\text{NPV} = ${npvExpression}${flows.length > 4 ? ' + \\cdots' : ''} = \\mathbf{${texNum(value, 2)}}`} />
            </div>
            <figure className="flex flex-col gap-2">
              <figcaption className="flex flex-wrap items-center justify-between gap-2 text-sm text-secondary">
                <span>{c.profileCaption}</span>
                <ChartLegend
                  items={[{ label: projectName, color: series.blue }, ...(compare ? [{ label: compare.name, color: series.orange }] : [])]}
                />
              </figcaption>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={profile} margin={{ top: 16, right: 16, bottom: 4, left: 4 }}>
                    <CartesianGrid vertical={false} stroke={chrome.grid} />
                    <XAxis dataKey="rate" type="number" domain={[0, xMax]} {...axisProps} tickFormatter={(v) => formatPercent(v, 0)} />
                    <YAxis {...axisProps} width={56} tickFormatter={(v) => formatNumber(v, 1)} />
                    <ReferenceLine y={0} stroke={chrome.axis} />
                    <ReferenceLine x={rate} stroke={chrome.muted} label={{ value: c.chosenRate, position: 'top', fill: chrome.secondary, fontSize: 11 }} />
                    <Tooltip content={chartTooltip({ format: (v) => meur(v, 2), title: (r) => c.rateTitle(formatPercent(Number(r))) })} />
                    <Line dataKey="npv" name={projectName} stroke={series.blue} strokeWidth={2} dot={false} isAnimationActive={false} />
                    {compare && <Line dataKey="compare" name={compare.name} stroke={series.orange} strokeWidth={2} dot={false} isAnimationActive={false} />}
                    {irrs
                      .filter((r) => r <= xMax)
                      .map((r) => (
                        <ReferenceDot key={r} x={r} y={0} r={5} fill={series.blue} stroke={chrome.surface} strokeWidth={2} />
                      ))}
                    <ReferenceDot x={rate} y={value} r={5} fill={chrome.ink} stroke={chrome.surface} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <label className="flex flex-wrap items-center gap-2 text-sm text-secondary">
                {c.compareWith}
                <select value={compareId} onChange={(e) => setCompareId(e.target.value)} className="rounded-md border border-hairline bg-white px-2 py-1 text-sm">
                  <option value="">{c.noProject}</option>
                  {projects
                    .filter((p) => p.id !== projectId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </label>
            </figure>
          </div>
        </div>
      </Panel>

      <Panel title={c.flowsTitle} subtitle={c.flowsSubtitle(formatPercent(rate))}>
        <ChartLegend
          items={[
            { label: c.yearFlow, color: series.blue, shape: 'square' },
            { label: c.presentValue, color: series.orange, shape: 'square' },
          ]}
        />
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={table} margin={{ top: 8, right: 8, bottom: 4, left: 4 }} barGap={2}>
              <CartesianGrid vertical={false} stroke={chrome.grid} />
              <XAxis dataKey="year" {...axisProps} tickFormatter={c.yearShort} />
              <YAxis {...axisProps} width={48} tickFormatter={(v) => formatNumber(v, 1)} />
              <ReferenceLine y={0} stroke={chrome.axis} />
              <Tooltip cursor={{ fill: chrome.grid, opacity: 0.4 }} content={chartTooltip({ format: (v) => meur(v, 2), title: (y) => c.yearLong(Number(y)) })} />
              <Bar dataKey="flow" name={c.yearFlow} fill={series.blue} barSize={14} radius={2} isAnimationActive={false} />
              <Bar dataKey="pv" name={c.presentValue} fill={series.orange} barSize={14} radius={2} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-sm tabular-nums">
            <thead className="text-xs text-secondary">
              <tr className="text-right">
                <th className="py-1 text-left font-medium">{c.head[0]}</th>
                <th className="py-1 font-medium">{c.head[1]}</th>
                <th className="py-1 font-medium">
                  {c.head[2]} <Tex math={`\\tfrac{1}{(1+i)^k}`} />
                </th>
                <th className="py-1 font-medium">{c.head[3]}</th>
                <th className="py-1 font-medium">{c.head[4]}</th>
              </tr>
            </thead>
            <tbody>
              {table.map((row) => (
                <tr key={row.year} className="border-t border-hairline text-right">
                  <td className="py-1.5 text-left">{row.year}</td>
                  <td className="py-1.5">{formatNumber(row.flow, 2)}</td>
                  <td className="py-1.5">{formatNumber(row.factor, 3)}</td>
                  <td className="py-1.5">{formatNumber(row.pv, 2)}</td>
                  <td className={`py-1.5 ${row.cumulative < 0 ? 'text-critical' : 'text-good-ink'}`}>{formatNumber(row.cumulative, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted">
          {c.lastRow} <Tex math={texPct(rate)} />.
        </p>
      </Panel>
    </div>
  )
}

/** Nombre de changements de signe des flux (zéros ignorés) : au-delà d'un, payback et IRR deviennent ambigus. */
function countSignChanges(flows: number[]): number {
  const signs = flows.filter((v) => v !== 0).map(Math.sign)
  return signs.slice(1).filter((sign, i) => sign !== signs[i]).length
}

function FlowEditor({ flows, onChange }: { flows: number[]; onChange: (flows: number[]) => void }) {
  const c = useCopy(copy)
  const update = (i: number, v: number) => onChange(flows.map((x, j) => (j === i ? v : x)))
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{c.editorTitle}</p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onChange(flows.slice(0, -1))}
            disabled={flows.length <= 2}
            className="rounded-md border border-hairline bg-white p-1.5 hover:border-ink disabled:opacity-40"
            aria-label={c.removeYear}
          >
            <Minus className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onChange([...flows, flows[flows.length - 1] ?? 0])}
            disabled={flows.length >= 16}
            className="rounded-md border border-hairline bg-white p-1.5 hover:border-ink disabled:opacity-40"
            aria-label={c.addYear}
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2">
        {flows.map((flow, i) => (
          <label key={i} className="flex flex-col gap-0.5 text-xs text-secondary">
            {c.yearLong(i)}
            <input
              type="number"
              step="any"
              value={Number.isFinite(flow) ? flow : ''}
              onChange={(e) => update(i, e.target.value === '' ? 0 : Number(e.target.value))}
              className={`rounded-md border border-hairline bg-white px-2 py-1.5 text-sm text-ink tabular-nums ${flow < 0 ? 'text-critical' : ''}`}
            />
          </label>
        ))}
      </div>
    </div>
  )
}
