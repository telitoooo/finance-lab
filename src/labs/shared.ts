import type { MeterZone } from '../components/ui/ThresholdMeter'
import type { Lang } from '../i18n/lang'
import { status } from '../lib/chartTheme'

const zoneLabels = {
  fr: ['R.I.P.', 'Risque élevé', 'Moyen, acceptable', 'Très bon', 'Idéal'],
  en: ['R.I.P.', 'High risk', 'Medium, acceptable', 'Very good', 'Ideal'],
}

/** Grille du ratio ressources stables / capitaux employés (p. 268), en décimal. */
export function stableRatioZones(lang: Lang): MeterZone[] {
  const l = zoneLabels[lang]
  return [
    { from: -Infinity, to: 0.5, label: l[0], color: status.critical },
    { from: 0.5, to: 0.7, label: l[1], color: status.serious },
    { from: 0.7, to: 0.9, label: l[2], color: status.warning },
    { from: 0.9, to: 1, label: l[3], color: '#7fcf7f' },
    { from: 1, to: Infinity, label: l[4], color: status.good },
  ]
}

/** Bornes affichées de la jauge (les zones extrêmes sont ouvertes). */
export const stableRatioRange = { min: 0.3, max: 1.3 }

export const stableRatioVerdict = (ratio: number, lang: Lang) =>
  stableRatioZones(lang).find((z) => ratio >= z.from && ratio < z.to)!.label

const leverageLabels = {
  fr: ['Moins de 3 : aucun problème', "Jusqu'à 4 : c'est OK", 'Entre 4 et 5 : à surveiller', 'Plus de 5 : risque élevé de faillite'],
  en: ['Below 3: no problem', "Up to 4: it's OK", 'Between 4 and 5: keep an eye on it', 'Above 5: high risk of bankruptcy'],
}

/** Grille dette nette / EBITDA (p. 270). */
export function netDebtToEbitdaVerdict(multiple: number, lang: Lang): { label: string; tone: 'good' | 'warning' | 'critical' } {
  const l = leverageLabels[lang]
  if (multiple < 3) return { label: l[0], tone: 'good' }
  if (multiple <= 4) return { label: l[1], tone: 'good' }
  if (multiple <= 5) return { label: l[2], tone: 'warning' }
  return { label: l[3], tone: 'critical' }
}
