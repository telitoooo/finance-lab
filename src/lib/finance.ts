// Fonctions pures, une par formule de formulas.json. Taux en décimal (0,1 = 10 %).
// Les simulateurs n'appellent que ces fonctions : une formule = une seule implémentation.

// --- Bilan ---------------------------------------------------------------

/** BFR approché (p. 83) : stocks + créances clients − dettes fournisseurs. */
export const wcrApprox = (inventories: number, receivables: number, payables: number) =>
  inventories + receivables - payables

/** BFR (p. 83) : actif circulant d'exploitation − passif circulant d'exploitation. */
export const wcr = (operatingCurrentAssets: number, operatingCurrentLiabilities: number) =>
  operatingCurrentAssets - operatingCurrentLiabilities

/** Capitaux employés (p. 106) : actif immobilisé + BFR. */
export const capitalEmployed = (fixedAssets: number, workingCapitalReq: number) =>
  fixedAssets + workingCapitalReq

/** Dette nette (p. 118) : dettes MT/LT + trésorerie passive − trésorerie active. */
export const netDebt = (ltDebt: number, cashLiabilities: number, cashAssets: number) =>
  ltDebt + cashLiabilities - cashAssets

/** Trésorerie nette (p. 263) : trésorerie active − trésorerie passive. */
export const netCash = (cashAssets: number, cashLiabilities: number) => cashAssets - cashLiabilities

/** Propriété (p. 264) : trésorerie nette = ressources stables − capitaux employés. */
export const netCashFromStructure = (stableResources: number, employedCapital: number) =>
  stableResources - employedCapital

export const gearing = (debt: number, equity: number) => debt / equity

export const stableResourcesRatio = (stableResources: number, employedCapital: number) =>
  stableResources / employedCapital

export type SolvencyLevel = 'ideal' | 'very-good' | 'acceptable' | 'high-risk' | 'rip'

/** Grille du ratio ressources stables / capitaux employés (p. 268). */
export function stableRatioLevel(ratio: number): SolvencyLevel {
  if (ratio >= 1) return 'ideal'
  if (ratio >= 0.9) return 'very-good'
  if (ratio >= 0.7) return 'acceptable'
  if (ratio >= 0.5) return 'high-risk'
  return 'rip'
}

/** Grille dette nette / CFO en années (p. 269). */
export function netDebtToCfoLevel(years: number): SolvencyLevel {
  if (years <= 1) return 'ideal'
  if (years <= 2) return 'very-good'
  if (years <= 3) return 'acceptable'
  if (years <= 5) return 'high-risk'
  return 'rip'
}

/** Grille dette nette / EBITDA (p. 270) : < 3 aucun problème, ≤ 4 OK, > 5 risque élevé. */
export function netDebtToEbitdaLevel(multiple: number): 'no-problem' | 'ok' | 'watch' | 'high-risk' {
  if (multiple < 3) return 'no-problem'
  if (multiple <= 4) return 'ok'
  if (multiple <= 5) return 'watch'
  return 'high-risk'
}

export const currentRatio = (currentAssets: number, currentLiabilities: number) =>
  currentAssets / currentLiabilities

export const quickRatio = (currentAssets: number, inventories: number, currentLiabilities: number) =>
  (currentAssets - inventories) / currentLiabilities

export const cashRatio = (cashAssets: number, currentLiabilities: number) => cashAssets / currentLiabilities

// --- Compte de résultat -----------------------------------------------------

/** Consommation (p. 155) : achats + (stock initial − stock final). */
export const consumption = (purchases: number, initialStock: number, finalStock: number) =>
  purchases + (initialStock - finalStock)

export const ebit = (ebitdaValue: number, depreciation: number) => ebitdaValue - depreciation

export const grossResult = (ebitValue: number, financialResult: number, nonRecurringResult = 0) =>
  ebitValue + financialResult + nonRecurringResult

/** IS (p. 251). Pas d'impôt sur une perte, comme dans le scénario pessimiste du food truck. */
export const corporateTax = (grossResultValue: number, taxRate: number) =>
  Math.max(0, grossResultValue) * taxRate

export const netResult = (grossResultValue: number, taxRate: number) =>
  grossResultValue - corporateTax(grossResultValue, taxRate)

export const relativeMargin = (absoluteMargin: number, turnover: number) => absoluteMargin / turnover

/** Point mort en CA (p. 170) : coûts fixes / taux de marge sur coûts variables. */
export function breakEven(fixedCosts: number, sales: number, variableCosts: number) {
  const contributionRate = (sales - variableCosts) / sales
  return fixedCosts / contributionRate
}

// --- Trésorerie --------------------------------------------------------------

/** CFO, méthode indirecte (p. 212) : EBITDA − IS − ΔBFR. */
export const cfoIndirect = (ebitdaValue: number, tax: number, wcrIncrease: number) =>
  ebitdaValue - tax - wcrIncrease

/** CFO avec impôt calculé sur l'EBIT (p. 394), utilisé pour les FCFF. */
export const operatingCashFlow = (ebitdaValue: number, ebitValue: number, taxRate: number, wcrIncrease: number) =>
  ebitdaValue - taxRate * ebitValue - wcrIncrease

/** FCFF (p. 394) : CFO + CFI, avec CFI = −CAPEX. */
export const fcff = (cfo: number, capex: number) => cfo - capex

// --- Rentabilité ---------------------------------------------------------------

export const nopat = (ebitValue: number, taxRate: number) => ebitValue * (1 - taxRate)

export const roce = (nopatValue: number, employedCapital: number) => nopatValue / employedCapital

export const roe = (netIncome: number, equity: number) => netIncome / equity

/** kD après impôt (p. 295) : frais financiers nets × (1 − T) / dette nette. */
export const costOfNetDebt = (netFinancialExpenses: number, taxRate: number, debt: number) =>
  (netFinancialExpenses * (1 - taxRate)) / debt

/** Effet de levier (p. 291) : ROE = ROCE + (ROCE − kD) × D/E. */
export const leverageRoe = (roceValue: number, kd: number, debt: number, equity: number) =>
  roceValue + (roceValue - kd) * (debt / equity)

// --- WACC ------------------------------------------------------------------------

export const afterTaxCostOfDebt = (kdBeforeTax: number, taxRate: number) => kdBeforeTax * (1 - taxRate)

/** WACC (p. 316) : kE·E/(D+E) + kD·D/(D+E), kD après impôt. */
export const wacc = (ke: number, kd: number, equity: number, debt: number) =>
  ke * (equity / (debt + equity)) + kd * (debt / (debt + equity))

/** MEDAF (p. 339, hors examen) : kE = RF + βE × prime de risque du marché. */
export const capm = (riskFree: number, beta: number, marketPremium: number) => riskFree + beta * marketPremium

/** Valeur d'une rente perpétuelle (p. 323) : flux annuel / taux exigé. */
export const perpetuityValue = (annualFlow: number, rate: number) => annualFlow / rate

// --- NPV / IRR ---------------------------------------------------------------------

export const compound = (presentValue: number, rate: number, years: number) => presentValue * (1 + rate) ** years

export const discount = (futureValue: number, rate: number, years: number) => futureValue / (1 + rate) ** years

/** NPV (p. 373). flows[0] est le flux de l'année 0 (l'investissement, négatif). */
export const npv = (rate: number, flows: number[]) =>
  flows.reduce((sum, flow, year) => sum + discount(flow, rate, year), 0)

/** Valeurs actuelles année par année, pour les graphiques. */
export const discountedFlows = (rate: number, flows: number[]) =>
  flows.map((flow, year) => discount(flow, rate, year))

/**
 * IRR (p. 380) : taux annulant la NPV. Balaye [-99 %, 1000 %] pour repérer les
 * changements de signe puis affine par dichotomie. Renvoie toutes les racines,
 * car le cours montre des projets sans IRR ou avec deux IRR (p. 385).
 */
export function irrAll(flows: number[], step = 0.001, maxRate = 10): number[] {
  const roots: number[] = []
  let a = -0.99
  let fa = npv(a, flows)
  for (let b = a + step; b <= maxRate; b += step) {
    const fb = npv(b, flows)
    if (fa === 0) roots.push(a)
    else if (fa * fb < 0) roots.push(bisect(flows, a, b))
    a = b
    fa = fb
  }
  return roots
}

/** IRR unique le plus proche de 0 %, ou null s'il n'existe pas (comme =IRR() d'Excel). */
export function irr(flows: number[]): number | null {
  const roots = irrAll(flows)
  if (roots.length === 0) return null
  return roots.reduce((best, r) => (Math.abs(r) < Math.abs(best) ? r : best))
}

function bisect(flows: number[], low: number, high: number): number {
  let a = low
  let b = high
  for (let i = 0; i < 100; i++) {
    const mid = (a + b) / 2
    if (npv(a, flows) * npv(mid, flows) <= 0) b = mid
    else a = mid
  }
  return (a + b) / 2
}

/**
 * Délai de récupération (p. 389) : année où le cumul des flux atteint zéro,
 * interpolé linéairement dans l'année. null si jamais récupéré.
 */
export function paybackPeriod(flows: number[]): number | null {
  let cumulative = flows[0]
  if (cumulative >= 0) return 0
  for (let year = 1; year < flows.length; year++) {
    const next = cumulative + flows[year]
    if (next >= 0) return year - 1 + -cumulative / flows[year]
    cumulative = next
  }
  return null
}

/** Annuité constante d'un emprunt (p. 398) : capital = Σ annuité / (1 + i)^k. */
export const constantAnnuity = (principal: number, rate: number, years: number) =>
  (principal * rate) / (1 - (1 + rate) ** -years)

/** Valeur terminale de Gordon-Shapiro (p. 416), valable si WACC > g. */
export const terminalValue = (nextFcff: number, waccRate: number, growth: number) => nextFcff / (waccRate - growth)

// --- Tableau des flux de trésorerie ----------------------------------------------------

/** CFI (p. 214) : − acquisitions d'immobilisations + cessions. */
export const cfi = (acquisitions: number, disposals: number) => -acquisitions + disposals

/** CFF (p. 216) : nouveaux emprunts − remboursements − intérêts + augmentation de capital − réduction − dividendes. */
export const cff = (x: {
  newLoans: number
  repayments: number
  interest: number
  capitalIncrease?: number
  capitalDecrease?: number
  dividends: number
}) => x.newLoans - x.repayments - x.interest + (x.capitalIncrease ?? 0) - (x.capitalDecrease ?? 0) - x.dividends

/** CFO après intérêts, à partir du résultat net (p. 218) : résultat net + dotations − hausse du BFR. */
export const cfoFromNetProfit = (netProfit: number, depreciationAndProvisions: number, wcrIncrease: number) =>
  netProfit + depreciationAndProvisions - wcrIncrease

/** Variation de trésorerie (p. 210) : CFO + CFI + CFF. */
export const cashVariation = (cfo: number, cfiValue: number, cffValue: number) => cfo + cfiValue + cffValue

// --- Solvabilité -------------------------------------------------------------------------

/** Dette nette / EBITDA (p. 270), en nombre de fois. */
export const netDebtToEbitda = (netDebtValue: number, ebitdaValue: number) => netDebtValue / ebitdaValue

/** Dette nette / CFO (p. 269), en années de flux d'exploitation. */
export const netDebtToCfo = (netDebtValue: number, cfo: number) => netDebtValue / cfo

// --- Valorisation ------------------------------------------------------------------------

/**
 * DCF (p. 412-416) : flows[0] est le FCFF de l'année 1, le dernier celui de l'horizon explicite n.
 * Valeur terminale de Gordon-Shapiro en n, FCFF(n+1) / (WACC − g), actualisée comme le flux de
 * l'année n. Par défaut FCFF(n+1) = FCFF(n) × (1 + g). null si WACC ≤ g.
 */
export function dcf(flows: number[], waccRate: number, growth: number, nextFlow = flows[flows.length - 1] * (1 + growth)) {
  const n = flows.length
  const pvFlows = flows.map((flow, i) => discount(flow, waccRate, i + 1))
  const pvExplicit = pvFlows.reduce((sum, v) => sum + v, 0)
  if (waccRate <= growth) return null
  const tv = terminalValue(nextFlow, waccRate, growth)
  const pvTerminal = discount(tv, waccRate, n)
  return { pvFlows, pvExplicit, terminalValue: tv, pvTerminal, enterpriseValue: pvExplicit + pvTerminal }
}

/**
 * FCFF projetés à partir d'une année de base (p. 414) : EBITDA, impôt calculé sur l'EBIT et CAPEX
 * croissent au rythme de l'activité, et le BFR aussi, si bien que sa hausse consomme du cash chaque
 * année. Renvoie les FCFF des années 1 à n, puis celui de l'année n + 1 (croissance perpétuelle g).
 */
export function projectFcff(
  x: { ebitda: number; ebit: number; taxRate: number; capex: number; wcr: number },
  growth: number,
  years: number,
  perpetualGrowth: number,
) {
  const unlevered = x.ebitda - x.taxRate * x.ebit - x.capex
  const flowAt = (scale: number, rate: number) => unlevered * scale - x.wcr * (scale / (1 + rate)) * rate
  const flows = Array.from({ length: years }, (_, i) => flowAt((1 + growth) ** (i + 1), growth))
  const last = (1 + growth) ** years
  return { flows, nextFlow: flowAt(last * (1 + perpetualGrowth), perpetualGrowth) }
}

/** Étape 3 (p. 407) : valeur des capitaux propres = valeur de l'actif économique − dette nette. */
export const equityValue = (enterpriseValue: number, netDebtValue: number) => enterpriseValue - netDebtValue

/** Multiples (p. 419) : VE = agrégat (ex. EBIT) × multiple des comparables. */
export const multipleValue = (aggregate: number, multiple: number) => aggregate * multiple

/** DDM, Gordon-Shapiro sur les dividendes (p. 433) : Div0 × (1 + g) / (kE − g). */
export const dividendDiscount = (lastDividend: number, ke: number, growth: number) => (lastDividend * (1 + growth)) / (ke - growth)

// --- Produits dérivés ------------------------------------------------------------------------

/** Future / forward (p. 504) : gain de l'acheteur = Q × (p − F) ; le vendeur réalise l'inverse. */
export const futurePayoff = (quantity: number, spotAtMaturity: number, agreedPrice: number) =>
  quantity * (spotAtMaturity - agreedPrice)

/** Call à l'échéance (p. 499-500), par unité : max(S − K ; 0) − prime. */
export const callPayoff = (spot: number, strike: number, premium: number) => Math.max(spot - strike, 0) - premium

/** Put à l'échéance (p. 498), par unité : max(K − S ; 0) − prime. */
export const putPayoff = (spot: number, strike: number, premium: number) => Math.max(strike - spot, 0) - premium

// --- Start-up et faillite ------------------------------------------------------------------

/**
 * Levée de fonds (p. 460-462). Les investisseurs reçoivent INV / POST du capital social après
 * l'opération ; le reste de leur apport va en prime d'émission. Le nombre d'actions nouvelles
 * n'est pas arrondi : le cours raisonne en montants.
 */
export function fundraising(x: { shares: number; nominal: number; pre: number; inv: number }) {
  const post = x.pre + x.inv
  const investorShare = x.inv / post
  const pricePerShare = x.pre / x.shares
  const newShares = x.inv / pricePerShare
  const capitalIncrease = newShares * x.nominal
  return {
    post,
    investorShare,
    founderShare: 1 - investorShare,
    pricePerShare,
    newShares,
    capitalIncrease,
    sharePremium: x.inv - capitalIncrease,
  }
}

/**
 * Liquidation (p. 469) : le produit de cession rembourse chaque rang dans l'ordre de priorité,
 * entièrement avant de passer au suivant. Renvoie le montant récupéré par rang.
 */
export function liquidationWaterfall(proceeds: number, claims: number[]): number[] {
  let left = Math.max(0, proceeds)
  return claims.map((claim) => {
    const paid = Math.min(claim, left)
    left -= paid
    return paid
  })
}
