import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { setFormatLocale } from '../lib/format'
import { readJson, writeJson } from '../lib/storage'
import { LangContext, type Lang } from './lang'

/**
 * Langue du site, mémorisée localement. Changer de langue remonte l'arbre (key) :
 * tous les composants se re-rendent avec les bons textes et les bons formats de nombres.
 */
export default function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => (readJson<string>('lang', 'fr') === 'en' ? 'en' : 'fr'))
  // Avant le rendu des enfants : les fonctions de format lisent la langue courante.
  setFormatLocale(lang)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((next: Lang) => {
    writeJson('lang', next)
    setLangState(next)
  }, [])
  const value = useMemo(() => ({ lang, setLang }), [lang, setLang])

  return (
    <LangContext.Provider value={value}>
      <Fragment key={lang}>{children}</Fragment>
    </LangContext.Provider>
  )
}
