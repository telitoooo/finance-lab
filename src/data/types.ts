// Schéma des fichiers JSON de src/data. Les JSON portent le contenu ;
// ces types garantissent que les vues et les simulateurs les lisent correctement.

export type ModuleId =
  | 'balance-sheet'
  | 'income-statement'
  | 'wcr'
  | 'profitability'
  | 'wacc'
  | 'npv-irr'
  | 'cash-flow'
  | 'solvency'
  | 'valuation'
  | 'derivatives'
  | 'startup'

/** Les vues de la barre latérale ; une vue regroupe un ou deux modules. */
export type ViewId =
  | 'financial-statements'
  | 'wcr'
  | 'profitability'
  | 'wacc-npv'
  | 'cash-solvency'
  | 'valuation'
  | 'market-finance'
  | 'startup'

/** Composant interactif branché dans la partie « Labo » d'un module (étape 3). */
export type LabKind =
  | 'balance-sheet-explorer'
  | 'pnl-waterfall'
  | 'wcr-simulator'
  | 'leverage-simulator'
  | 'wacc-simulator'
  | 'npv-simulator'
  | 'cash-flow-waterfall'
  | 'solvency-gauges'
  | 'dcf-simulator'
  | 'hedging-simulator'
  | 'fundraising-simulator'

/** Pages du PDF source (numérotation du fichier, 1 à 513). */
export type PdfPages = number[]

export interface FormulaSymbol {
  symbol: string
  meaning: string
}

export interface Formula {
  id: string
  /** Nom français, avec le terme anglais du cours entre parenthèses quand il existe. */
  name: string
  /** Expression KaTeX, recopiée du PDF sans réécriture mathématique. */
  latex: string
  symbols?: FormulaSymbol[]
  /** Règle d'interprétation donnée par le PDF (seuils, signe, piège). */
  note?: string
  /** true si le PDF marque la notion « Bonus : not for the final exam ». */
  bonus?: boolean
  pages: PdfPages
}

export interface ModuleLab {
  kind: LabKind
  title: string
  /** Ce que l'étudiant manipule et ce qu'il doit observer. */
  goal: string
}

export interface CourseModule {
  id: ModuleId
  view: ViewId
  /** Chemin complet de la page, ex. /financial-statements/balance-sheet */
  path: string
  title: string
  /** Nom du module dans l'autre langue (terme anglais du cours, ou équivalent français). */
  altTitle: string
  /** Icône lucide-react (nom du composant). */
  icon: string
  /** Partie 1 : LE CONCEPT, 150 mots maximum, appliqué à Adidas. */
  concept: string
  /** Partie 2 : LA BOÎTE À OUTILS, ids de formulas.json groupés par sous-thème. */
  toolbox: { title: string; formulaIds: string[] }[]
  /** Partie 3 : LE LABO. */
  lab: ModuleLab
  /** Exemple du PDF transposé à Adidas (traçabilité du mapping). */
  pdfExample: { original: string; adidas: string }
  pages: PdfPages
}

export interface View {
  id: ViewId
  path: string
  title: string
  modules: ModuleId[]
}

export interface QuizQuestion {
  id: string
  module: ModuleId
  /** Sous-thème pour filtrer (ex. « liquidité », « solvabilité »). */
  topic: string
  question: string
  /** 2 à 5 propositions, une seule bonne réponse (format de l'examen final). */
  choices: string[]
  answer: number
  explanation: string
  pages: PdfPages
}

export interface QuizBank {
  /** Barème de l'examen final (PDF p. 13). */
  scoring: { correct: number; wrong: number; blank: number }
  questions: QuizQuestion[]
}

export interface BalanceLine {
  id: string
  label: string
  value: number
  /** Postes du rapport annuel regroupés dans cette ligne. */
  detail?: string
}

export interface BalanceBlock {
  id: string
  label: string
  lines: BalanceLine[]
}

export interface AdidasDataset {
  meta: {
    unit: string
    fiscalYear: number
    source: string
    sourceUrl: string
    disclaimer: string
    /** Regroupement du tableau des flux publié dans la grille du cours. */
    cashFlowNote: string
  }
  incomeStatement: {
    revenue: number
    grossMarginRate: number
    cogs: number
    /** Redevances, commissions et autres produits d'exploitation. */
    otherOperatingIncome: number
    /** Charges opérationnelles (marketing, distribution, frais généraux) hors amortissements. */
    operatingExpensesExDA: number
    ebitda: number
    depreciation: number
    ebit: number
    financialResult: number
    incomeBeforeTax: number
    incomeTax: number
    discontinuedOperations: number
    netIncome: number
    taxRate: number
    taxRateNote: string
  }
  /** Bilan 31/12 reclassé selon la grille du cours (PDF p. 43). */
  balanceSheet: {
    assets: BalanceBlock[]
    liabilities: BalanceBlock[]
  }
  /** Agrégats du bilan économique, recalculés par src/lib/finance.ts. */
  derived: {
    wcrApprox: number
    wcr: number
    netDebt: number
    capitalEmployed: number
    stableResources: number
    netCash: number
    /**
     * Dette nette + provisions non courantes (retraites incluses). Dans les simulateurs de
     * rentabilité, elle tient le rôle de D pour que CE = E + D (p. 293) tombe juste.
     */
    debtWithProvisions: number
  }
  /** Tableau des flux de trésorerie 2025 publié, regroupé dans la grille du cours (p. 217, 223). */
  cashFlowStatement: CashFlowStatement
  /** Données boursières au 31/12 (valorisation). */
  share: {
    sharesOutstanding: number
    yearEndPrice: number
    marketCap: number
    /** Dividende proposé au titre de l'exercice, versé l'année suivante (€ par action). */
    dividendPerShare: number
  }
  /** Valeurs par défaut des curseurs du simulateur BFR. */
  wcrDays: {
    dso: number
    dio: number
    dpo: number
    note: string
  }
  /** Scénarios transposés des exemples du PDF. */
  scenarios: Record<string, AdidasScenario>
  /** Exercice « Guess which company it is », enrichi du bilan d'Adidas. */
  guessCompany: GuessCompanyExercise
}

export interface CashFlowStatement {
  /** Impôt sur les sociétés effectivement payé. */
  taxPaid: number
  /** Hausse du BFR : créances + stocks + baisse des dettes d'exploitation. */
  wcrIncrease: number
  wcrDetail: { receivables: number; inventories: number; payables: number }
  /** Autres éléments sans décaissement et effets de change du flux d'exploitation. */
  otherOperating: number
  cfo: number
  capex: number
  disposals: number
  /** Investissements financiers et intérêts reçus (classés en investissement par Adidas). */
  otherInvesting: number
  cfi: number
  newBorrowings: number
  repayments: number
  leaseRepayments: number
  interestPaid: number
  dividends: number
  otherFinancing: number
  cff: number
  fxEffect: number
  cashOpening: number
  cashClosing: number
}

export interface GuessCompanyExercise {
  title: string
  pdfOrigin: string
  companies: string[]
  rows: { assets: { id: string; label: string }[]; liabilities: { id: string; label: string }[] }
  /** Structure du bilan en % du total, par colonne anonymisée. */
  columns: { id: string; answer: string; values: Record<string, number>; hint: string }[]
  pages: PdfPages
}

export interface AdidasScenario {
  title: string
  pdfOrigin: string
  story: string
  data: Record<string, number | number[]>
  /** Résultats attendus, identiques au corrigé du PDF. */
  expected: Record<string, number>
  pages: PdfPages
}
