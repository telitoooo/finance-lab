import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
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
import { axisProps, chrome, series } from '../lib/chartTheme'
import { chartTooltip } from '../lib/chartTooltip'
import * as f from '../lib/finance'
import { formatEuros, formatMillions, formatNumber, texNum } from '../lib/format'

const p = adidas.scenarios.rubberHedge.data as Record<string, number>
const Q = p.quantity
const F = p.futurePrice
const K = p.strike
const PREMIUM = p.premium
const SPOT_MIN = 900
const SPOT_MAX = 2400

type Strategy = 'none' | 'future' | 'call'

/** Résultat du dérivé pour Adidas (acheteuse), en euros, selon le prix au comptant à l'échéance. */
function hedge(strategy: Strategy, spot: number) {
  const spotCost = Q * spot
  const derivative = strategy === 'future' ? f.futurePayoff(Q, spot, F) : strategy === 'call' ? Q * f.callPayoff(spot, K, PREMIUM) : 0
  const netCost = spotCost - derivative
  return { spotCost, derivative, netCost, perTonne: netCost / Q }
}

/** Coût net par tonne de chaque stratégie : la droite, le plateau et la courbe plafonnée du cours. */
const costPerTonne = (strategy: Strategy, spot: number) => hedge(strategy, spot).perTonne
/** Gain par tonne de l'acheteur du dérivé (le vendeur réalise l'inverse). */
const buyerPayoff = (strategy: Strategy, spot: number) => (strategy === 'future' ? spot - F : f.callPayoff(spot, K, PREMIUM))

const m = (euros: number, digits = 1) => formatMillions(euros / 1e6, digits)
const signedM = (euros: number) => `${euros > 0 ? '+' : euros < 0 ? '−' : ''}${m(Math.abs(euros))}`

const copy = {
  fr: {
    strategy: 'Ta stratégie',
    strategies: { none: 'Sans couverture', future: 'Contrat future (achat à terme)', call: "Option d'achat (call)" },
    strategyHint: {
      none: "Adidas achètera au prix du marché dans 6 mois, quel qu'il soit.",
      future: (f: string) => `Adidas s'engage aujourd'hui à acheter ${formatNumber(Q)} t à ${f}, dans 6 mois.`,
      call: (k: string, prem: string) => `Adidas paie ${prem} de prime pour le droit d'acheter à ${k} dans 6 mois.`,
    },
    spot: 'Prix du caoutchouc dans 6 mois',
    today: "aujourd'hui",
    perTonne: (v: number) => `${formatEuros(v)}/t`,
    presets: ['Flambée · 2 000 €/t', 'Statu quo · 1 550 €/t', 'Effondrement · 1 100 €/t'],
    spotCost: 'Achat au comptant',
    spotCostSub: (price: string) => `${formatNumber(Q)} t à ${price}`,
    derivative: 'Résultat du dérivé',
    derivativeNone: 'Aucun dérivé : Adidas subit le prix du marché',
    derivativeGain: 'Gain qui compense la hausse',
    derivativeLoss: (exercised: boolean): string => (exercised ? 'Perte sur le contrat' : 'Option non exercée : la prime est perdue'),
    netCost: "Coût net d'approvisionnement",
    netCostSub: (perTonne: string) => `Soit ${perTonne}`,
    margin: 'Appels de marge (chambre de compensation)',
    marginPay: (v: string) => `Adidas verse ${v} avant l'échéance : à financer en trésorerie (risque de liquidité)`,
    marginReceive: (v: string) => `Adidas reçoit ${v} au fil des appels de marge`,
    exercise: "L'option est-elle exercée ?",
    exerciseYes: 'Oui : dans la monnaie (S > K)',
    exerciseNo: 'Non : hors de la monnaie (S ≤ K), Adidas achète au comptant',
    exposure: "Écart avec le prix d'aujourd'hui",
    exposureSub: 'Le risque de marché, entièrement supporté',
    costTitle: "Coût net du caoutchouc selon le prix à l'échéance",
    costSubtitle: 'Par tonne, achat au comptant et résultat du dérivé compris. La stratégie choisie est en trait épais.',
    costX: (v: string) => `Prix à l'échéance : ${v}`,
    payoffTitle: 'Le profil de gain, comme dans le cours',
    payoffSubtitle: {
      future: "Gain par tonne à l'échéance : acheteur (Adidas) et vendeur du future, deux droites symétriques qui se croisent au prix convenu.",
      call: "Gain par tonne à l'échéance : la perte de l'acheteur est limitée à la prime, celle du vendeur est illimitée (p. 500).",
    },
    payoffNone: 'Choisis une couverture pour afficher son profil de gain.',
    buyer: 'Acheteur (Adidas)',
    seller: 'Vendeur',
    texGain: "\\text{Gain d'Adidas}",
    texPremium: '\\text{prime}',
    texEuros: (v: number) => `${texNum(v)}\\text{ €}`,
    missions: [
      {
        label: 'Le caoutchouc flambe à 2 000 €/t : couvre-toi avec un future et mesure le gain',
        hint: 'Choisis le contrat future, puis pousse le prix au moins à 2 000 €/t.',
        lesson: 'Gain = 10 000 × (2 000 − 1 550) = 4,5 M€ : le coût total reste figé à 15,5 M€.',
      },
      {
        label: "Fais perdre de l'argent au future… et vérifie que le coût net ne bouge pas",
        hint: 'Avec le future, descends sous le prix convenu.',
        lesson: 'Le contrat perd, mais Adidas achète moins cher au comptant : le total reste Q × F. Attention aux appels de marge à payer en route.',
      },
      {
        label: "Trouve le prix à l'échéance où le call et le future coûtent exactement pareil (à 10 €/t près)",
        hint: "Compare les courbes : sous le prix d'exercice, le call coûte S + prime.",
        lesson: 'Sous F − prime = 1 470 €/t, le call (non exercé) gagne ; au-dessus, le future : la prime est le prix de la flexibilité.',
      },
      {
        label: "Avec le call, laisse l'option hors de la monnaie : quelle est ta perte maximale ?",
        hint: "Choisis le call, puis descends sous le prix d'exercice.",
        lesson: "La perte de l'acheteur d'un call est limitée à la prime : 10 000 × 80 € = 0,8 M€.",
      },
    ],
    badge: 'Maître de la couverture',
  },
  en: {
    strategy: 'Your strategy',
    strategies: { none: 'No hedge', future: 'Futures contract (forward purchase)', call: 'Call option' },
    strategyHint: {
      none: 'Adidas will buy at the market price in 6 months, whatever it is.',
      future: (f: string) => `Adidas commits today to buy ${formatNumber(Q)} t at ${f}, in 6 months.`,
      call: (k: string, prem: string) => `Adidas pays a ${prem} premium for the right to buy at ${k} in 6 months.`,
    },
    spot: 'Rubber price in 6 months',
    today: 'today',
    perTonne: (v: number) => `${formatEuros(v)}/t`,
    presets: ['Spike · €2,000/t', 'Status quo · €1,550/t', 'Collapse · €1,100/t'],
    spotCost: 'Spot purchase',
    spotCostSub: (price: string) => `${formatNumber(Q)} t at ${price}`,
    derivative: 'Result of the derivative',
    derivativeNone: 'No derivative: Adidas bears the market price',
    derivativeGain: 'A gain that offsets the rise',
    derivativeLoss: (exercised: boolean): string => (exercised ? 'Loss on the contract' : 'Option not exercised: the premium is lost'),
    netCost: 'Net procurement cost',
    netCostSub: (perTonne: string) => `i.e. ${perTonne}`,
    margin: 'Margin calls (clearing house)',
    marginPay: (v: string) => `Adidas pays ${v} before maturity: to be funded from cash (liquidity risk)`,
    marginReceive: (v: string) => `Adidas receives ${v} through margin calls`,
    exercise: 'Is the option exercised?',
    exerciseYes: 'Yes: in the money (S > K)',
    exerciseNo: 'No: out of the money (S ≤ K), Adidas buys on the spot market',
    exposure: "Gap with today's price",
    exposureSub: 'Market risk, borne in full',
    costTitle: 'Net cost of rubber as a function of the price at maturity',
    costSubtitle: 'Per tonne, spot purchase and result of the derivative included. The chosen strategy is drawn thick.',
    costX: (v: string) => `Price at maturity: ${v}`,
    payoffTitle: 'The payoff profile, as in the course',
    payoffSubtitle: {
      future: 'Gain per tonne at maturity: buyer (Adidas) and seller of the futures contract, two symmetric lines crossing at the agreed price.',
      call: "Gain per tonne at maturity: the buyer's loss is limited to the premium, the seller's is unlimited (p. 500).",
    },
    payoffNone: 'Choose a hedge to display its payoff profile.',
    buyer: 'Buyer (Adidas)',
    seller: 'Seller',
    texGain: "\\text{Adidas's gain}",
    texPremium: '\\text{premium}',
    texEuros: (v: number) => `${v < 0 ? '-' : ''}\\text{€}${texNum(Math.abs(v))}`,
    missions: [
      {
        label: 'Rubber spikes to €2,000/t: hedge with a futures contract and measure the gain',
        hint: 'Choose the futures contract, then push the price to at least €2,000/t.',
        lesson: 'Gain = 10,000 × (2,000 − 1,550) = €4.5m: the total cost stays locked at €15.5m.',
      },
      {
        label: 'Make the futures contract lose money… and check the net cost does not move',
        hint: 'With the futures, go below the agreed price.',
        lesson: 'The contract loses, but Adidas buys cheaper on the spot market: the total stays Q × F. Watch out for the margin calls to pay along the way.',
      },
      {
        label: 'Find the price at maturity where the call and the futures cost exactly the same (within €10/t)',
        hint: 'Compare the curves: below the strike, the call costs S + premium.',
        lesson: 'Below F − premium = €1,470/t, the (unexercised) call wins; above it, the futures does: the premium is the price of flexibility.',
      },
      {
        label: 'With the call, leave the option out of the money: what is your maximum loss?',
        hint: 'Choose the call, then go below the strike.',
        lesson: "A call buyer's loss is limited to the premium: 10,000 × €80 = €0.8m.",
      },
    ],
    badge: 'Hedging master',
  },
}

const PRESETS = [2000, 1550, 1100]
const strategyColor: Record<Strategy, string> = { none: series.orange, future: series.blue, call: series.aqua }

export default function HedgingLab() {
  const c = useCopy(copy)
  const scenario = useContent().adidas.scenarios.rubberHedge
  const [strategy, setStrategy] = useState<Strategy>('future')
  const [spot, setSpot] = useState(1800)
  const h = hedge(strategy, spot)
  const exercised = spot > K

  const curve = Array.from({ length: 61 }, (_, i) => {
    const s = SPOT_MIN + ((SPOT_MAX - SPOT_MIN) * i) / 60
    return { spot: s, none: costPerTonne('none', s), future: costPerTonne('future', s), call: costPerTonne('call', s) }
  })
  const payoff =
    strategy === 'none'
      ? []
      : Array.from({ length: 61 }, (_, i) => {
          const s = SPOT_MIN + ((SPOT_MAX - SPOT_MIN) * i) / 60
          const buyer = buyerPayoff(strategy, s)
          return { spot: s, buyer, seller: -buyer }
        })

  const missions = c.missions.map((mission, i) => ({
    ...mission,
    id: ['spike', 'future-loss', 'call-equals-future', 'call-max-loss'][i],
    done: [
      strategy === 'future' && spot >= 2000,
      strategy === 'future' && spot < F,
      Math.abs(spot - (F - PREMIUM)) <= 10,
      strategy === 'call' && spot <= K,
    ][i],
  }))

  const perTonne = c.perTonne
  const strategyHint =
    strategy === 'none' ? c.strategyHint.none : strategy === 'future' ? c.strategyHint.future(perTonne(F)) : c.strategyHint.call(perTonne(K), perTonne(PREMIUM))

  return (
    <div className="flex flex-col gap-6">
      <Panel title={scenario.title} subtitle={scenario.story}>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">{c.strategy}</p>
          <SegmentedControl
            label={c.strategy}
            value={strategy}
            onChange={setStrategy}
            options={(['none', 'future', 'call'] as const).map((value) => ({ value, label: c.strategies[value] }))}
          />
          <p className="text-xs text-secondary">{strategyHint}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <InteractiveSlider
              label={c.spot}
              value={spot}
              min={SPOT_MIN}
              max={SPOT_MAX}
              step={10}
              onChange={setSpot}
              format={perTonne}
              reference={{ value: p.spotToday, label: c.today }}
            />
            <div className="flex flex-wrap gap-2">
              {c.presets.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setSpot(PRESETS[i])}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${spot === PRESETS[i] ? 'border-ink bg-ink text-white' : 'border-hairline bg-white hover:border-ink'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {strategy !== 'none' && (
              <div className="overflow-x-auto rounded-xl border border-hairline bg-white p-3 text-[11px] sm:text-xs">
                <Tex
                  math={
                    strategy === 'future'
                      ? `${c.texGain} = ${texNum(Q)} \\times (${texNum(spot)} - ${texNum(F)}) = ${c.texEuros(h.derivative)}`
                      : `${c.texGain} = ${texNum(Q)} \\times [\\max(${texNum(spot)} - ${texNum(K)}\\,;\\,0) - ${texNum(PREMIUM)}] = ${c.texEuros(h.derivative)}`
                  }
                />
              </div>
            )}
          </div>

          <div className="grid content-start gap-3 sm:grid-cols-2">
            <StatTile label={c.spotCost} value={m(h.spotCost)} sub={c.spotCostSub(perTonne(spot))} />
            <StatTile
              label={c.derivative}
              value={strategy === 'none' ? '—' : signedM(h.derivative)}
              sub={strategy === 'none' ? c.derivativeNone : h.derivative >= 0 ? c.derivativeGain : c.derivativeLoss(strategy === 'future' || exercised)}
              tone={strategy === 'none' ? 'neutral' : h.derivative >= 0 ? 'good' : 'warning'}
            />
            <StatTile label={c.netCost} value={m(h.netCost)} sub={c.netCostSub(perTonne(h.perTonne))} tone={strategy === 'none' && spot > p.spotToday ? 'warning' : 'neutral'} />
            {strategy === 'future' && (
              <StatTile
                label={c.margin}
                value={signedM(h.derivative)}
                sub={h.derivative < 0 ? c.marginPay(m(-h.derivative)) : c.marginReceive(m(h.derivative))}
                tone={h.derivative < 0 ? 'critical' : 'good'}
              />
            )}
            {strategy === 'call' && <StatTile label={c.exercise} value={exercised ? '✓' : '✗'} sub={exercised ? c.exerciseYes : c.exerciseNo} tone={exercised ? 'good' : 'neutral'} />}
            {strategy === 'none' && (
              <StatTile
                label={c.exposure}
                value={signedM(Q * (spot - p.spotToday))}
                sub={c.exposureSub}
                tone={spot > p.spotToday ? 'critical' : 'good'}
              />
            )}
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title={c.costTitle} subtitle={c.costSubtitle}>
          <ChartLegend items={(['none', 'future', 'call'] as const).map((s) => ({ label: c.strategies[s], color: strategyColor[s] }))} />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={curve} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
                <CartesianGrid vertical={false} stroke={chrome.grid} />
                <XAxis dataKey="spot" type="number" domain={[SPOT_MIN, SPOT_MAX]} {...axisProps} tickFormatter={(v: number) => formatNumber(v)} />
                <YAxis {...axisProps} domain={[SPOT_MIN, SPOT_MAX]} width={52} tickFormatter={(v: number) => formatNumber(v)} />
                <ReferenceLine x={spot} stroke={chrome.axis} strokeDasharray="4 4" />
                <Tooltip content={chartTooltip({ format: (v) => perTonne(v), title: (s) => c.costX(perTonne(Number(s))) })} />
                {(['none', 'future', 'call'] as const).map((s) => (
                  <Line
                    key={s}
                    dataKey={s}
                    name={c.strategies[s]}
                    stroke={strategyColor[s]}
                    strokeWidth={s === strategy ? 3 : 1.5}
                    strokeOpacity={s === strategy ? 1 : 0.55}
                    dot={false}
                    isAnimationActive={false}
                  />
                ))}
                <ReferenceDot x={spot} y={h.perTonne} r={6} fill={strategyColor[strategy]} stroke={chrome.surface} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title={c.payoffTitle} subtitle={strategy === 'none' ? undefined : c.payoffSubtitle[strategy]}>
          {strategy === 'none' ? (
            <p className="text-sm text-secondary">{c.payoffNone}</p>
          ) : (
            <>
              <ChartLegend
                items={[
                  { label: c.buyer, color: series.blue },
                  { label: c.seller, color: chrome.secondary },
                ]}
              />
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={payoff} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
                    <CartesianGrid vertical={false} stroke={chrome.grid} />
                    <XAxis dataKey="spot" type="number" domain={[SPOT_MIN, SPOT_MAX]} {...axisProps} tickFormatter={(v: number) => formatNumber(v)} />
                    <YAxis {...axisProps} width={52} tickFormatter={(v: number) => formatNumber(v)} />
                    <ReferenceLine y={0} stroke={chrome.axis} />
                    <ReferenceLine x={strategy === 'future' ? F : K} stroke={chrome.axis} strokeDasharray="4 4" />
                    <Tooltip content={chartTooltip({ format: (v) => perTonne(v), title: (s) => c.costX(perTonne(Number(s))) })} />
                    <Line dataKey="buyer" name={c.buyer} stroke={series.blue} strokeWidth={2.5} dot={false} isAnimationActive={false} />
                    <Line dataKey="seller" name={c.seller} stroke={chrome.secondary} strokeWidth={1.5} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
                    <ReferenceDot x={spot} y={buyerPayoff(strategy, spot)} r={6} fill={series.blue} stroke={chrome.surface} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </Panel>
      </div>

      <MissionBoard storageId="derivatives" missions={missions} badge={c.badge} />
    </div>
  )
}
