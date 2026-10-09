/** Convertit un symbole de formulas.json (« k_D », « β_E », « S_i ») en LaTeX, ou null si c'est du texte. */
export function symbolToTex(symbol: string): string | null {
  if (!/^[A-Za-zβ]{1,3}_[A-Za-z]{1,3}'?$/.test(symbol)) return null
  return symbol.replace('β', '\\beta ')
}
