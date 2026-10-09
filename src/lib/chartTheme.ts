// Palette catégorielle validée (contrôle daltonisme passé dans cet ordre) et chrome des graphiques.
// Une couleur suit une entité, jamais un rang : chaque poste du bilan garde sa couleur partout.

export const series = {
  blue: '#2a78d6',
  orange: '#eb6834',
  aqua: '#1baf7a',
  yellow: '#eda100',
  magenta: '#e87ba4',
  green: '#008300',
  violet: '#4a3aa7',
  red: '#e34948',
} as const

export const status = {
  good: '#0ca30c',
  goodInk: '#006300',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
} as const

export const chrome = {
  surface: '#fcfcfb',
  ink: '#0b0b0b',
  secondary: '#52514e',
  muted: '#898781',
  grid: '#e1e0d9',
  axis: '#c3c2b7',
} as const

/**
 * Couleur de chaque grande masse du bilan. L'ordre des emplois (1-2-3) et des ressources (4 à 8)
 * suit l'ordre validé de la palette, pour que deux blocs voisins restent distincts.
 * En vision économique, le BFR prend la couleur de l'actif circulant d'exploitation dont il est
 * le solde, et la dette nette celle des dettes financières.
 */
export const balanceColors: Record<string, string> = {
  'fixed-assets': series.blue,
  'operating-current-assets': series.orange,
  wcr: series.orange,
  'cash-assets': series.aqua,
  'net-cash': series.aqua,
  equity: series.yellow,
  'lt-provisions': series.magenta,
  'lt-debt': series.green,
  'net-debt': series.green,
  'operating-current-liabilities': series.violet,
  'cash-liabilities': series.red,
  'net-cash-liability': series.red,
}

/**
 * Encre lisible sur un aplat : noir ou blanc, celle qui offre le meilleur contraste.
 * Les deux contrastes s'égalisent vers une luminance de 0,186.
 */
export function inkOn(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  return luminance > 0.186 ? chrome.ink : '#ffffff'
}

/** Props communes des axes Recharts : traits fins, texte discret. */
export const axisProps = {
  stroke: chrome.axis,
  tick: { fill: chrome.muted, fontSize: 12 },
  tickLine: false,
} as const
