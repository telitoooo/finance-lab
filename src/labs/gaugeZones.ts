import type { GaugeZone } from '../components/GaugeChart'
import type { Lang } from '../i18n/lang'
import { status } from '../lib/chartTheme'
import { stableRatioZones } from './shared'

/** Vert clair des zones « bonnes mais pas idéales », comme dans la grille du ratio de solvabilité. */
const lightGood = '#7fcf7f'

const labels = {
  fr: {
    ebitda: ['Aucun problème', "C'est OK", 'À surveiller', 'Risque élevé de faillite'],
    cfo: ['Excellent', 'Bon', 'Moyen mais acceptable', 'Risque élevé de faillite', 'R.I.P.'],
  },
  en: {
    ebitda: ['No problem', "It's OK", 'Keep an eye on it', 'High risk of bankruptcy'],
    cfo: ['Excellent', 'Good', 'Medium but acceptable', 'High risk of bankruptcy', 'R.I.P.'],
  },
}

/** Dette nette / EBITDA (p. 270) : < 3 aucun problème, jusqu'à 4 OK, au-delà de 5 risque élevé. */
export function netDebtToEbitdaZones(lang: Lang): GaugeZone[] {
  const l = labels[lang].ebitda
  return [
    { from: -Infinity, to: 3, label: l[0], color: status.good, tone: 'good' },
    { from: 3, to: 4, label: l[1], color: lightGood, tone: 'good' },
    { from: 4, to: 5, label: l[2], color: status.warning, tone: 'warning' },
    { from: 5, to: Infinity, label: l[3], color: status.critical, tone: 'critical' },
  ]
}

/** Dette nette / CFO en années (p. 269), pour une maturité moyenne de la dette de 3 ans. */
export function netDebtToCfoZones(lang: Lang): GaugeZone[] {
  const l = labels[lang].cfo
  return [
    { from: -Infinity, to: 1, label: l[0], color: status.good, tone: 'good' },
    { from: 1, to: 2, label: l[1], color: lightGood, tone: 'good' },
    { from: 2, to: 3, label: l[2], color: status.warning, tone: 'warning' },
    { from: 3, to: 5, label: l[3], color: status.serious, tone: 'critical' },
    { from: 5, to: Infinity, label: l[4], color: status.critical, tone: 'critical' },
  ]
}

/** Ressources stables / capitaux employés (p. 268) : la grille du labo Bilan, avec le ton de chaque zone. */
export function stableRatioGaugeZones(lang: Lang): GaugeZone[] {
  const tones: GaugeZone['tone'][] = ['critical', 'critical', 'warning', 'good', 'good']
  return stableRatioZones(lang).map((z, i) => ({ ...z, tone: tones[i] }))
}
