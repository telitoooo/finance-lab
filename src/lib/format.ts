// Formats de nombres selon la langue du site. La langue courante est posée par le
// LanguageProvider avant le rendu de l'arbre (setFormatLocale), ce qui évite de la passer
// à chacun des centaines d'appels de formatage.

export type Locale = 'fr' | 'en'

let locale: Locale = 'fr'
export const setFormatLocale = (next: Locale) => {
  locale = next
}
export const getFormatLocale = () => locale

const formatters = new Map<string, Intl.NumberFormat>()
function nf(options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(options)}`
  let formatter = formatters.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', options)
    formatters.set(key, formatter)
  }
  return formatter
}

/** Nombre simple : 10 799 (fr) ou 10,799 (en). */
export const formatNumber = (value: number, maxDigits = 0, minDigits = 0) =>
  nf({ minimumFractionDigits: minDigits, maximumFractionDigits: maxDigits }).format(value)

const sign = (value: number) => (value < 0 ? '-' : '')

/** Montant en M€ ; bascule en Md€ (€bn) au-delà de 10 000 M€ pour rester lisible. */
export function formatMoney(millions: number): string {
  if (Math.abs(millions) >= 10000) return formatBillions(millions / 1000, 1)
  return formatMillions(millions)
}

/** Montant toujours en millions (pour comparer des blocs d'un même graphique). */
export const formatMillions = (millions: number, digits = 0) =>
  locale === 'fr'
    ? `${formatNumber(millions, digits, digits)} M€`
    : `${sign(millions)}€${formatNumber(Math.abs(millions), digits, digits)}m`

/** Montant en milliards. */
export const formatBillions = (billions: number, digits = 2) =>
  locale === 'fr'
    ? `${formatNumber(billions, digits, digits)} Md€`
    : `${sign(billions)}€${formatNumber(Math.abs(billions), digits, digits)}bn`

/** Montant en euros (scénario du pop-up store). */
export const formatEuros = (euros: number) =>
  locale === 'fr' ? `${formatNumber(euros)} €` : `${sign(euros)}€${formatNumber(Math.abs(euros))}`

export const formatPercent = (rate: number, digits = 1) =>
  nf({ style: 'percent', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(rate)

export const formatDays = (days: number) => (locale === 'fr' ? `${formatNumber(days)} j` : `${formatNumber(days)} days`)

/** Nombre prêt pour KaTeX : 10\,799 et 0{,}5 en français ; 10{,}799 et 0.5 en anglais. */
export function texNum(value: number, digits = 0): string {
  const [int, dec] = Math.abs(value).toFixed(digits).split('.')
  const thousands = int.replace(/\B(?=(\d{3})+(?!\d))/g, locale === 'fr' ? '\\,' : '{,}')
  const decimals = dec ? (locale === 'fr' ? `{,}${dec}` : `.${dec}`) : ''
  return `${value < 0 ? '-' : ''}${thousands}${decimals}`
}

/** Pourcentage pour KaTeX : 12{,}3\,\% (fr) ou 12.3\% (en). */
export const texPct = (rate: number, digits = 1) => `${texNum(rate * 100, digits)}${locale === 'fr' ? '\\,' : ''}\\%`

/** Montant en millions pour KaTeX : 20\,827\text{ M€} (fr) ou \text{€}20{,}827\text{m} (en). */
export const texMillions = (millions: number) =>
  locale === 'fr' ? `${texNum(millions)}\\text{ M€}` : `${millions < 0 ? '-' : ''}\\text{€}${texNum(Math.abs(millions))}\\text{m}`

/** Prix en euros avec décimales : 169,05 € (fr) ou €169.05 (en). */
export const formatEurosCents = (euros: number, digits = 2) =>
  locale === 'fr'
    ? `${formatNumber(euros, digits, digits)} €`
    : `${sign(euros)}€${formatNumber(Math.abs(euros), digits, digits)}`

/** Multiple ou ratio en nombre de fois : 1,3x (fr) ou 1.3x (en). */
export const formatTimes = (value: number, digits = 1) => `${formatNumber(value, digits, digits)}x`
