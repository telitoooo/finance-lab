// Construit les colonnes du BalanceSheetChart à partir du bilan Adidas (vision comptable)
// ou d'agrégats recalculés (vision économique, emplois / ressources stables).
import type { BalanceColumn, BalanceSegment } from '../components/BalanceSheetChart'
import { adidas, type AdidasDataset } from '../data'
import type { Lang } from '../i18n/lang'
import { balanceColors } from './chartTheme'
import * as f from './finance'
import { formatNumber } from './format'

const labels = {
  fr: {
    short: {
      'fixed-assets': 'Immobilisations',
      'operating-current-assets': 'Actif circ. exploitation',
      'cash-assets': 'Trésorerie active',
      equity: 'Capitaux propres',
      'lt-provisions': 'Provisions LT',
      'lt-debt': 'Dettes MT/LT',
      'operating-current-liabilities': 'Passif circ. exploitation',
      'cash-liabilities': 'Trésorerie passive',
    } as Record<string, string>,
    assets: 'Actif',
    liabilities: 'Passif',
    fixedAssets: 'Actif immobilisé',
    equity: 'Capitaux propres',
    provisions: 'Provisions et retraites',
    provisionsShort: 'Provisions',
    wcr: 'BFR',
    wcrDetail: "Actif circulant d'exploitation − passif circulant d'exploitation",
    negativeWcr: 'BFR négatif (une ressource)',
    negativeWcrShort: 'BFR négatif',
    netDebt: 'Dette nette',
    netDebtDetail: 'Dettes financières MT/LT + trésorerie passive − trésorerie active',
    excessCash: 'Trésorerie nette excédentaire',
    excessCashShort: 'Trésorerie excéd.',
    employed: 'Capitaux employés',
    invested: 'Capitaux investis',
    ltDebt: 'Dettes financières MT/LT',
    ltDebtShort: 'Dettes MT/LT',
    positiveCash: 'Trésorerie nette positive',
    positiveCashShort: 'Trésorerie nette',
    overdraft: 'Trésorerie nette négative (découvert)',
    overdraftShort: 'Découvert net',
    uses: 'Emplois',
    resources: 'Ressources',
  },
  en: {
    short: {
      'fixed-assets': 'Fixed assets',
      'operating-current-assets': 'Op. current assets',
      'cash-assets': 'Cash assets',
      equity: 'Equity',
      'lt-provisions': 'LT provisions',
      'lt-debt': 'MT/LT debts',
      'operating-current-liabilities': 'Op. current liabilities',
      'cash-liabilities': 'Cash liabilities',
    } as Record<string, string>,
    assets: 'Assets',
    liabilities: 'Liabilities',
    fixedAssets: 'Fixed assets',
    equity: 'Equity',
    provisions: 'Provisions and pensions',
    provisionsShort: 'Provisions',
    wcr: 'WCR',
    wcrDetail: 'Operating current assets − operating current liabilities',
    negativeWcr: 'Negative WCR (a resource)',
    negativeWcrShort: 'Negative WCR',
    netDebt: 'Net debt',
    netDebtDetail: 'MT/LT financial debts + cash liabilities − cash assets',
    excessCash: 'Excess net cash',
    excessCashShort: 'Excess cash',
    employed: 'Capital employed',
    invested: 'Invested capital',
    ltDebt: 'MT/LT financial debts',
    ltDebtShort: 'MT/LT debts',
    positiveCash: 'Positive net cash',
    positiveCashShort: 'Net cash',
    overdraft: 'Negative net cash (overdraft)',
    overdraftShort: 'Net overdraft',
    uses: 'Uses',
    resources: 'Resources',
  },
}

const sumBlock = (side: 'assets' | 'liabilities', id: string) =>
  adidas.balanceSheet[side].find((b) => b.id === id)!.lines.reduce((s, l) => s + l.value, 0)
const lineValue = (id: string) =>
  [...adidas.balanceSheet.assets, ...adidas.balanceSheet.liabilities].flatMap((b) => b.lines).find((l) => l.id === id)!.value

/** Grandes masses du bilan Adidas au 31/12, et agrégats du cours recalculés avec finance.ts. */
export const adidasBalance = (() => {
  const fixedAssets = sumBlock('assets', 'fixed-assets')
  const operatingCurrentAssets = sumBlock('assets', 'operating-current-assets')
  const cashAssets = sumBlock('assets', 'cash-assets')
  const equity = sumBlock('liabilities', 'equity')
  const ltDebt = sumBlock('liabilities', 'lt-debt')
  const provisions = sumBlock('liabilities', 'lt-provisions')
  const operatingCurrentLiabilities = sumBlock('liabilities', 'operating-current-liabilities')
  const cashLiabilities = sumBlock('liabilities', 'cash-liabilities')
  const wcr = f.wcr(operatingCurrentAssets, operatingCurrentLiabilities)
  const capitalEmployed = f.capitalEmployed(fixedAssets, wcr)
  const stableResources = equity + provisions + ltDebt
  return {
    fixedAssets,
    operatingCurrentAssets,
    cashAssets,
    equity,
    ltDebt,
    provisions,
    operatingCurrentLiabilities,
    cashLiabilities,
    inventories: lineValue('inventories'),
    receivables: lineValue('receivables'),
    otherReceivables: lineValue('other-receivables'),
    payables: lineValue('payables'),
    otherPayables: lineValue('other-payables'),
    total: fixedAssets + operatingCurrentAssets + cashAssets,
    wcr,
    netDebt: f.netDebt(ltDebt, cashLiabilities, cashAssets),
    capitalEmployed,
    stableResources,
    netCash: f.netCash(cashAssets, cashLiabilities),
  }
})()

/** Bilan comptable : actif par liquidité croissante, passif par exigibilité croissante (p. 44). */
export function accountingColumns(data: AdidasDataset, lang: Lang): BalanceColumn[] {
  const t = labels[lang]
  const toSegments = (side: 'assets' | 'liabilities'): BalanceSegment[] =>
    data.balanceSheet[side].map((block) => ({
      id: block.id,
      label: block.label,
      short: t.short[block.id],
      value: block.lines.reduce((s, l) => s + l.value, 0),
      color: balanceColors[block.id],
      detail: block.lines.map((l) => `${l.label} ${formatNumber(l.value)}`).join(' · '),
    }))
  return [
    { id: 'assets', label: t.assets, segments: toSegments('assets') },
    { id: 'liabilities', label: t.liabilities, segments: toSegments('liabilities') },
  ]
}

const segment = (id: string, label: string, value: number, short?: string, detail?: string): BalanceSegment => ({
  id,
  label,
  short,
  value,
  color: balanceColors[id],
  detail,
})

/** Bilan économique (p. 116) : capitaux employés = capitaux investis. Un solde négatif change de côté. */
export function economicColumns(
  x: { fixedAssets: number; wcr: number; equity: number; provisions: number; netDebt: number },
  lang: Lang,
): BalanceColumn[] {
  const t = labels[lang]
  const employed = [segment('fixed-assets', t.fixedAssets, x.fixedAssets, t.short['fixed-assets'])]
  const invested = [segment('equity', t.equity, x.equity), segment('lt-provisions', t.provisions, x.provisions, t.provisionsShort)]
  if (x.wcr >= 0) employed.push(segment('wcr', t.wcr, x.wcr, t.wcr, t.wcrDetail))
  else invested.push(segment('wcr', t.negativeWcr, -x.wcr, t.negativeWcrShort))
  if (x.netDebt >= 0) invested.push(segment('net-debt', t.netDebt, x.netDebt, t.netDebt, t.netDebtDetail))
  else employed.push(segment('net-cash', t.excessCash, -x.netDebt, t.excessCashShort))
  return [
    { id: 'employed', label: t.employed, segments: employed },
    { id: 'invested', label: t.invested, segments: invested },
  ]
}

/** Emplois et ressources stables : la trésorerie nette est le solde (p. 264). */
export function fundingColumns(
  x: { fixedAssets: number; wcr: number; equity: number; provisions: number; ltDebt: number },
  lang: Lang,
): BalanceColumn[] {
  const t = labels[lang]
  const netCash = f.netCashFromStructure(x.equity + x.provisions + x.ltDebt, f.capitalEmployed(x.fixedAssets, x.wcr))
  const uses = [segment('fixed-assets', t.fixedAssets, x.fixedAssets, t.short['fixed-assets'])]
  const resources = [
    segment('equity', t.equity, x.equity),
    segment('lt-provisions', t.provisions, x.provisions, t.provisionsShort),
    segment('lt-debt', t.ltDebt, x.ltDebt, t.ltDebtShort),
  ]
  if (x.wcr >= 0) uses.push(segment('wcr', t.wcr, x.wcr))
  else resources.push(segment('wcr', t.negativeWcr, -x.wcr, t.negativeWcrShort))
  if (netCash >= 0) uses.push(segment('net-cash', t.positiveCash, netCash, t.positiveCashShort))
  else resources.push(segment('net-cash-liability', t.overdraft, -netCash, t.overdraftShort))
  return [
    { id: 'uses', label: t.uses, segments: uses },
    { id: 'resources', label: t.resources, segments: resources },
  ]
}
