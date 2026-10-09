import { createContext, useContext } from 'react'

export type Lang = 'fr' | 'en'
export const LANGS: Lang[] = ['fr', 'en']

export const LangContext = createContext<{ lang: Lang; setLang: (lang: Lang) => void }>({
  lang: 'fr',
  setLang: () => {},
})

export const useLang = () => useContext(LangContext).lang
export const useSetLang = () => useContext(LangContext).setLang

/** Textes d'interface d'un fichier : la version anglaise doit avoir exactement les clés de la française. */
export function useCopy<T>(copy: { fr: T; en: T }): T {
  return copy[useLang()]
}
