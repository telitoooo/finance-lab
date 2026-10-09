import { BookMarked, Info } from 'lucide-react'
import type { Formula } from '../data'
import { useCopy } from '../i18n/lang'
import { symbolToTex } from '../lib/tex'
import Tex from './ui/Tex'

const copy = {
  fr: { bonus: 'Hors examen', pages: 'Pages du PDF source' },
  en: { bonus: 'Not for the exam', pages: 'Pages of the source PDF' },
}

/** Encart « Boîte à outils » : la formule exacte du PDF, ses symboles, sa règle d'usage et sa source. */
export default function FormulaCard({ formula }: { formula: Formula }) {
  const c = useCopy(copy)
  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-xl border border-formula/30 border-l-4 border-l-formula bg-white p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h4 className="text-sm font-semibold">{formula.name}</h4>
        <div className="flex items-center gap-1.5">
          {formula.bonus && (
            <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-medium text-secondary">{c.bonus}</span>
          )}
          <span className="flex items-center gap-1 text-[11px] text-muted" title={c.pages}>
            <BookMarked className="size-3" aria-hidden />
            p. {formula.pages.join(', ')}
          </span>
        </div>
      </header>

      <div className="-mx-1 overflow-x-auto px-1 py-1 text-[0.8rem] sm:text-[0.95rem]">
        <Tex math={formula.latex} display />
      </div>

      {formula.symbols && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          {formula.symbols.map((s) => {
            const tex = symbolToTex(s.symbol)
            return (
              <div key={s.symbol} className="contents">
                <dt className="font-medium whitespace-nowrap">{tex ? <Tex math={tex} /> : s.symbol}</dt>
                <dd className="text-secondary">{s.meaning}</dd>
              </div>
            )
          })}
        </dl>
      )}

      {formula.note && (
        <p className="flex gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-secondary">
          <Info className="mt-px size-3.5 shrink-0 text-formula" aria-hidden />
          <span>{formula.note}</span>
        </p>
      )}
    </article>
  )
}
