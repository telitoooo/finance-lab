// Vérifie la cohérence des JSON de src/data et recalcule chaque chiffre « attendu »
// avec src/lib/finance.ts. Lancement : npm run check:data
import { readFileSync } from 'node:fs'
import * as f from '../src/lib/finance.ts'
import type { AdidasDataset, CourseModule, Formula, QuizBank } from '../src/data/types.ts'

const load = <T>(name: string): T =>
  JSON.parse(readFileSync(new URL(`../src/data/${name}.json`, import.meta.url), 'utf8')) as T

const formulas = load<Formula[]>('formulas')
const { modules } = load<{ modules: CourseModule[] }>('modules')
const quiz = load<QuizBank>('quiz')
const adidas = load<AdidasDataset>('adidas')

let failures = 0
function check(label: string, actual: number, expected: number, tolerance = 0.5) {
  const ok = Math.abs(actual - expected) <= tolerance
  if (!ok) failures++
  console.log(`${ok ? '✓' : '✗'} ${label}: ${round(actual)} (attendu ${expected})`)
}
function assert(label: string, condition: boolean) {
  if (!condition) failures++
  console.log(`${condition ? '✓' : '✗'} ${label}`)
}
const round = (x: number) => Math.round(x * 10000) / 10000
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

// --- Intégrité des références -------------------------------------------------
const formulaIds = new Set(formulas.map((x) => x.id))
assert('ids de formules uniques', formulaIds.size === formulas.length)
for (const mod of modules) {
  const ids = mod.toolbox.flatMap((g) => g.formulaIds)
  const missing = ids.filter((id) => !formulaIds.has(id))
  assert(`${mod.id} : formules référencées existantes ${missing.join(' ')}`, missing.length === 0)
  const words = mod.concept.split(/[\s']+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length
  assert(`${mod.id} : concept ≤ 150 mots (${words})`, words <= 150)
}
const moduleIds = new Set(modules.map((m) => m.id))
assert('ids de QCM uniques', new Set(quiz.questions.map((q) => q.id)).size === quiz.questions.length)
for (const q of quiz.questions) {
  const valid =
    moduleIds.has(q.module) && q.choices.length >= 2 && q.choices.length <= 5 && q.answer >= 0 && q.answer < q.choices.length
  if (!valid) assert(`QCM ${q.id} valide`, false)
}
console.log(`  ${quiz.questions.length} QCM contrôlés`)

// --- Bilan Adidas ---------------------------------------------------------------
const block = (side: 'assets' | 'liabilities', id: string) =>
  sum(adidas.balanceSheet[side].find((b) => b.id === id)!.lines.map((l) => l.value))
const line = (side: 'assets' | 'liabilities', id: string) =>
  adidas.balanceSheet[side].flatMap((b) => b.lines).find((l) => l.id === id)!.value

const totalAssets = sum(adidas.balanceSheet.assets.flatMap((b) => b.lines.map((l) => l.value)))
const totalLiabilities = sum(adidas.balanceSheet.liabilities.flatMap((b) => b.lines.map((l) => l.value)))
check('Adidas : total actif = 20 262', totalAssets, 20262, 0)
check('Adidas : Σ actif = Σ passif', totalLiabilities, totalAssets, 0)

const fixedAssets = block('assets', 'fixed-assets')
const workingCapital = f.wcr(block('assets', 'operating-current-assets'), block('liabilities', 'operating-current-liabilities'))
const ltDebt = block('liabilities', 'lt-debt')
const cashLiabilities = block('liabilities', 'cash-liabilities')
const cashAssets = block('assets', 'cash-assets')
const stable = block('liabilities', 'equity') + ltDebt + block('liabilities', 'lt-provisions')
const d = adidas.derived
check('BFR approché', f.wcrApprox(line('assets', 'inventories'), line('assets', 'receivables'), line('liabilities', 'payables')), d.wcrApprox, 0)
check('BFR complet', workingCapital, d.wcr, 0)
check('Dette nette', f.netDebt(ltDebt, cashLiabilities, cashAssets), d.netDebt, 0)
check('Capitaux employés', f.capitalEmployed(fixedAssets, workingCapital), d.capitalEmployed, 0)
check('Ressources stables', stable, d.stableResources, 0)
check('Trésorerie nette (actif − passif)', f.netCash(cashAssets, cashLiabilities), d.netCash, 0)
check('Trésorerie nette (propriété)', f.netCashFromStructure(stable, d.capitalEmployed), d.netCash, 0)
check('Dette nette + provisions', d.netDebt + block('liabilities', 'lt-provisions'), d.debtWithProvisions, 0)

// --- Compte de résultat Adidas : la cascade doit retomber sur les sous-totaux publiés ---
const pnl = adidas.incomeStatement
const pnlEbitda = pnl.revenue - pnl.cogs + pnl.otherOperatingIncome - pnl.operatingExpensesExDA
check('Cascade : EBITDA', pnlEbitda, pnl.ebitda, 1)
check('Cascade : EBIT', f.ebit(pnl.ebitda, pnl.depreciation), pnl.ebit, 0)
check('Cascade : résultat avant impôt', f.grossResult(pnl.ebit, pnl.financialResult), pnl.incomeBeforeTax, 0)
check('Cascade : résultat net', pnl.incomeBeforeTax - pnl.incomeTax + pnl.discontinuedOperations, pnl.netIncome, 0)
check('Taux d\'impôt effectif', pnl.incomeTax / pnl.incomeBeforeTax, pnl.taxRate, 0.0005)
check('Marge brute', 1 - pnl.cogs / pnl.revenue, pnl.grossMarginRate, 0.0005)

// --- Rentabilité Adidas : la formule du levier retrouve le ROE réel ---------------
const adidasNopat = f.nopat(pnl.ebit, pnl.taxRate)
const adidasRoce = f.roce(adidasNopat, d.capitalEmployed)
const adidasKd = f.costOfNetDebt(-pnl.financialResult, pnl.taxRate, d.debtWithProvisions)
const continuingNetIncome = pnl.netIncome - pnl.discontinuedOperations
check('CE = E + D', block('liabilities', 'equity') + d.debtWithProvisions, d.capitalEmployed, 0)
check('ROCE Adidas', adidasRoce, 0.144, 0.0005)
check('NOPAT − FFN = résultat net (activités poursuivies)', adidasNopat + pnl.financialResult * (1 - pnl.taxRate), continuingNetIncome, 1)
check(
  'ROE par le levier = ROE réel',
  f.leverageRoe(adidasRoce, adidasKd, d.debtWithProvisions, block('liabilities', 'equity')),
  f.roe(continuingNetIncome, block('liabilities', 'equity')),
  0.0005,
)

check('Délai clients (j)', (line('assets', 'receivables') / pnl.revenue) * 365, adidas.wcrDays.dso, 0.5)
check('Durée de stockage (j)', (line('assets', 'inventories') / pnl.cogs) * 365, adidas.wcrDays.dio, 0.5)
check('Délai fournisseurs (j)', (line('liabilities', 'payables') / pnl.cogs) * 365, adidas.wcrDays.dpo, 0.5)

// --- Scénarios : mêmes résultats que les corrigés du PDF --------------------------------
const s = adidas.scenarios
const num = (x: number | number[]) => x as number
const arr = (x: number | number[]) => x as number[]

{
  const p = s.popUpStore.data
  const e = s.popUpStore.expected
  const monthly = (pairs: number) => {
    const sales = pairs * num(p.unitPrice)
    const depreciation = num(p.fitOut) / num(p.lifeYears) / 12
    const cashOut = pairs * num(p.unitCost) + num(p.salariesPerMonth) + num(p.miscPerMonth)
    return { sales, depreciation, gross: sales - cashOut - depreciation, cash: sales - cashOut }
  }
  const jan = monthly(num(p.pairsPerMonth))
  check('Pop-up : ventes de janvier', jan.sales, e.janSales, 0)
  check('Pop-up : résultat brut de janvier', jan.gross, e.janGrossResult, 0)
  check('Pop-up : résultat net de janvier', f.netResult(jan.gross, num(p.taxRate)), e.janNetResult, 0)
  check('Pop-up : variation de trésorerie de janvier', jan.cash, e.janCashChange, 0)
  check('Pop-up : résultat net annuel', f.netResult(12 * jan.gross, num(p.taxRate)), e.yearNetResult, 0)
  check('Pop-up : trésorerie fin d\'année', num(p.minCash) + 12 * jan.cash, e.yearCashEnd, 0)
  const bad = monthly(num(p.pairsPerMonthBad))
  check('Pop-up pessimiste : résultat annuel', f.netResult(12 * bad.gross, num(p.taxRate)), e.badYearNetResult, 0)
  check('Pop-up pessimiste : découvert', -(num(p.minCash) + 12 * bad.cash), e.badOverdraft, 0)
}
{
  const p = s.runningWorkshop.data
  const e = s.runningWorkshop.expected
  const staff = num(p.salaries) + num(p.socialContributions)
  const sold = num(p.produced) - (num(p.finalFinishedUnits) - num(p.initialFinishedUnits))
  const sales = sold * num(p.unitPrice)
  const cogs = sold * num(p.componentCostPerPair) + staff * (sold / num(p.produced))
  const depreciation = num(p.premisesCost) / num(p.premisesLifeYears)
  const ebitValue = sales - cogs - depreciation
  const financial = -num(p.loan) * num(p.loanRate)
  const bookValue = num(p.premisesCost) - num(p.premisesAgeYears) * depreciation
  const nonRecurring = num(p.premisesSalePrice) - bookValue
  const gross = f.grossResult(ebitValue, financial, nonRecurring)
  check('Atelier : CA', sales, e.sales, 0)
  check('Atelier : COGS', cogs, e.cogs, 0.5)
  check('Atelier : EBIT', ebitValue, e.ebit, 0.5)
  check('Atelier : résultat exceptionnel', nonRecurring, e.nonRecurringResult, 0)
  check('Atelier : IS', f.corporateTax(gross, num(p.taxRate)), e.tax, 0.5)
  check('Atelier : résultat net', f.netResult(gross, num(p.taxRate)), e.netProfit, 0.5)
  const fgUnits = num(p.finalFinishedUnits) - num(p.initialFinishedUnits)
  check('Atelier : variation de stock de produits finis', fgUnits * num(p.componentCostPerPair) + staff * (fgUnits / num(p.produced)), e.finishedGoodsChange, 0.5)
  check('Atelier : consommation de composants', num(p.produced) * num(p.componentCostPerPair), e.rawMaterialConsumption, 0)
}
{
  const p = s.twinSubsidiaries.data
  const e = s.twinSubsidiaries.expected
  const w = (prefix: string, i: number) =>
    f.wcrApprox(arr(p[`${prefix}Inventory`])[i], arr(p[`${prefix}Receivables`])[i], arr(p[`${prefix}Payables`])[i])
  check('adidas.com : BFR Y', w('dtc', 0), e.dtcWcrY, 0)
  check('adidas.com : BFR Y+1', w('dtc', 1), e.dtcWcrY1, 0)
  check('Wholesale : BFR Y', w('wholesale', 0), e.wholesaleWcrY, 0)
  check('Wholesale : BFR Y+1', w('wholesale', 1), e.wholesaleWcrY1, 0)
  for (const prefix of ['dtc', 'wholesale']) {
    for (const i of [0, 1]) {
      const assets = ['FixedAssets', 'Inventory', 'Receivables', 'Cash'].map((k) => arr(p[`${prefix}${k}`])[i])
      const liabilities = ['Capital', 'Result', 'Payables', 'Overdraft']
        .filter((k) => p[`${prefix}${k}`])
        .map((k) => arr(p[`${prefix}${k}`])[i])
      check(`${prefix} année ${i} : bilan équilibré`, sum(liabilities), sum(assets), 0)
    }
  }
}
{
  const p = s.waccCase.data
  const e = s.waccCase.expected
  const kd = f.afterTaxCostOfDebt(num(p.kdBeforeTax), num(p.taxRate))
  check('WACC : kD après impôt', kd, e.kd, 0.0001)
  check('WACC', f.wacc(num(p.ke), kd, num(p.equity), num(p.netDebt)), e.wacc, 0.0001)
  for (const c of ['A', 'B', 'C']) {
    const netProfit = num(p[`nopat${c}`]) - num(p.netDebt) * kd
    const equityValue = f.perpetuityValue(netProfit, num(p.ke))
    check(`Cas ${c} : résultat net`, netProfit, e[`netProfit${c}`], 0.001)
    check(`Cas ${c} : ROE`, f.roe(netProfit, num(p.equity)), e[`roe${c}`], 0.0001)
    check(`Cas ${c} : valeur des capitaux propres`, equityValue, e[`equityValue${c}`], 0.01)
  }
  check('Cas B : goodwill', f.perpetuityValue(num(p.nopatB) - num(p.netDebt) * kd, num(p.ke)) - num(p.equity), e.goodwillB, 0.01)
  check('Cas C : badwill', f.perpetuityValue(num(p.nopatC) - num(p.netDebt) * kd, num(p.ke)) - num(p.equity), e.goodwillC, 0.01)
}
{
  const p = s.soleRnD.data
  const e = s.soleRnD.expected
  check('Semelle : NPV à 10 %', f.npv(num(p.rateHigh), arr(p.flows)), e.npvAt10, 0.005)
  check('Semelle : NPV à 5 %', f.npv(num(p.rateLow), arr(p.flows)), e.npvAt5, 0.005)
  check('Semelle : IRR', f.irr(arr(p.flows)) ?? NaN, e.irr, 0.0001)
  check('Semelle : payback', f.paybackPeriod(arr(p.flows)) ?? NaN, e.payback, 0)
}
{
  const p = s.flagshipStore.data
  const e = s.flagshipStore.expected
  const flows = [-num(p.capex)]
  for (let year = 1; year <= num(p.lifeYears); year++) {
    const depreciation = year <= num(p.depreciationYears) ? num(p.capex) / num(p.depreciationYears) : 0
    const ebitValue = f.ebit(num(p.ebitdaPerYear), depreciation)
    const wcrChange = year === 1 ? num(p.wcrIncrease) : year === num(p.lifeYears) ? -num(p.wcrIncrease) : 0
    flows.push(f.fcff(f.operatingCashFlow(num(p.ebitdaPerYear), ebitValue, num(p.taxRate), wcrChange), 0))
  }
  assert('Flagship : flux reconstruits = flux du JSON', flows.every((x, i) => Math.abs(x - arr(p.flows)[i]) < 1e-9))
  check('Flagship : NPV', f.npv(num(p.rate), flows), e.npv, 0.005)
  check('Flagship : IRR', f.irr(flows) ?? NaN, e.irr, 0.0001)
}
{
  const p = s.exclusiveProjects.data
  const e = s.exclusiveProjects.expected
  check('Shanghai : NPV', f.npv(num(p.shanghaiRate), arr(p.shanghaiFlows)), e.shanghaiNpv, 0.005)
  check('Padel : NPV', f.npv(num(p.padelRate), arr(p.padelFlows)), e.padelNpv, 0.005)
}

// --- Exercice « Guess which company » : chaque colonne fait 100 % de chaque côté ----------
{
  const g = adidas.guessCompany
  for (const col of g.columns) {
    const side = (rows: { id: string }[]) => sum(rows.map((r) => col.values[r.id] ?? 0))
    check(`Bilan ${col.id} (${col.answer}) : actif`, side(g.rows.assets), 100, 1)
    check(`Bilan ${col.id} (${col.answer}) : passif`, side(g.rows.liabilities), 100, 1)
  }
  assert('Chaque réponse fait partie des entreprises proposées', g.columns.every((c) => g.companies.includes(c.answer)))
}

// --- Traductions anglaises : chaque texte français a son équivalent ---------------------
{
  const en = <T>(name: string): T =>
    JSON.parse(readFileSync(new URL(`../src/data/en/${name}.json`, import.meta.url), 'utf8')) as T
  type Text = Record<string, unknown>
  const fEn = en<Record<string, Text & { symbols?: Text[] }>>('formulas')
  const mEn = en<{ views: Record<string, Text>; modules: Record<string, Text & { toolbox: string[]; concept: string }> }>('modules')
  const qEn = en<Record<string, Text & { choices: string[] }>>('quiz')
  const aEn = en<{
    balanceSheet: Record<string, { label: string; lines: Record<string, { label: string; detail?: string }> }>
    scenarios: Record<string, Text>
    guessCompany: { rows: Record<string, string>; hints: Record<string, string> }
  }>('adidas')
  const filled = (v: unknown) => typeof v === 'string' && v.trim().length > 0
  const missing: string[] = []

  for (const x of formulas) {
    const t = fEn[x.id]
    if (!t || !filled(t.name) || !filled(t.latex)) missing.push(`formule ${x.id}`)
    else {
      if (x.note && !filled(t.note)) missing.push(`note de ${x.id}`)
      if ((x.symbols?.length ?? 0) !== (t.symbols?.length ?? 0)) missing.push(`symboles de ${x.id}`)
    }
  }
  for (const v of load<{ views: { id: string }[] }>('modules').views) if (!filled(mEn.views[v.id]?.title)) missing.push(`vue ${v.id}`)
  for (const mod of modules) {
    const t = mEn.modules[mod.id]
    if (!t || !filled(t.title) || !filled(t.concept) || t.toolbox.length !== mod.toolbox.length) {
      missing.push(`module ${mod.id}`)
      continue
    }
    const words = t.concept.split(/[\s']+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length
    assert(`${mod.id} : concept anglais ≤ 150 mots (${words})`, words <= 150)
  }
  for (const q of quiz.questions) {
    const t = qEn[q.id]
    if (!t || !filled(t.question) || !filled(t.explanation) || t.choices.length !== q.choices.length) missing.push(`QCM ${q.id}`)
  }
  for (const side of ['assets', 'liabilities'] as const) {
    for (const blockData of adidas.balanceSheet[side]) {
      const t = aEn.balanceSheet[blockData.id]
      if (!t || !filled(t.label)) missing.push(`bloc ${blockData.id}`)
      else for (const l of blockData.lines) if (!filled(t.lines[l.id]?.label) || (l.detail && !filled(t.lines[l.id]?.detail))) missing.push(`ligne ${l.id}`)
    }
  }
  for (const key of Object.keys(adidas.scenarios)) if (!filled(aEn.scenarios[key]?.story)) missing.push(`scénario ${key}`)
  for (const r of [...adidas.guessCompany.rows.assets, ...adidas.guessCompany.rows.liabilities])
    if (!filled(aEn.guessCompany.rows[r.id])) missing.push(`ligne d'exercice ${r.id}`)
  for (const col of adidas.guessCompany.columns) if (!filled(aEn.guessCompany.hints[col.id])) missing.push(`indice ${col.id}`)
  assert(`Traductions anglaises complètes${missing.length ? ` (manquent : ${missing.join(', ')})` : ''}`, missing.length === 0)
}

// --- Autres corrigés du PDF cités dans les QCM ------------------------------------
check('Annuité constante 100 000 € à 5 % sur 5 ans', f.constantAnnuity(100000, 0.05, 5), 23097, 0.5)
check('Exercice 2 : NPV à 10 %', f.npv(0.1, [-100, 110, -30, 25, 50, 100]), 90.23, 0.005)
check('Exercice 2 : IRR', f.irr([-100, 110, -30, 25, 50, 100]) ?? NaN, 0.4264, 0.0001)
assert('Flux 4, −7, 4 : aucun IRR', f.irrAll([4, -7, 4]).length === 0)
assert('Flux −1 ; 7,2 ; −7,2 : deux IRR', f.irrAll([-1, 7.2, -7.2]).length === 2)
check('Payback projet A (2 ans 2 mois)', f.paybackPeriod([-1000, 500, 400, 600]) ?? NaN, 2 + 100 / 600, 0.0001)
check('Effet de levier (QCM prof-03)', f.leverageRoe(0.12, 0.04, 0.5, 1), 0.16, 0.0001)
check('Point mort (QCM is-05)', f.breakEven(2, 1, 0.6), 5, 0.0001)
check('Europcar : ressources stables / CE', f.stableResourcesRatio(837 + 2547, 2897 + (4727 - 1904)), 0.59, 0.005)

console.log(failures === 0 ? '\nToutes les vérifications passent.' : `\n${failures} vérification(s) en échec.`)
process.exit(failures === 0 ? 0 : 1)
