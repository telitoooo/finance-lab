import { LANGS, useLang, useSetLang } from '../../i18n/lang'

const labels = { fr: 'Français', en: 'English' }

/** Sélecteur FR / EN ; le choix est mémorisé par le LanguageProvider. */
export default function LanguageSwitch() {
  const lang = useLang()
  const setLang = useSetLang()
  return (
    <div role="radiogroup" aria-label={lang === 'fr' ? 'Langue' : 'Language'} className="inline-flex rounded-md bg-neutral-100 p-0.5">
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={l === lang}
          aria-label={labels[l]}
          lang={l}
          onClick={() => setLang(l)}
          className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase ${l === lang ? 'bg-white text-ink shadow-sm' : 'text-secondary hover:text-ink'}`}
        >
          {l}
        </button>
      ))}
    </div>
  )
}
