import { BookOpen, FlaskConical, Wrench } from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import type { CourseModule } from '../../data'
import { useContent } from '../../i18n/content'
import { useCopy } from '../../i18n/lang'

const copy = {
  fr: { concept: 'Le concept', toolbox: 'La boîte à outils', lab: 'Le labo', pages: 'PDF p.' },
  en: { concept: 'The concept', toolbox: 'The toolbox', lab: 'The lab', pages: 'PDF p.' },
}

/**
 * Gabarit imposé à chaque module : 1. Le concept · 2. La boîte à outils · 3. Le labo.
 * Le contenu des parties 2 et 3 est injecté par la page (FormulaCard, simulateurs, QuizEngine).
 */
export default function ModuleLayout({
  module: mod,
  toolbox,
  lab,
}: {
  module: CourseModule
  toolbox: ReactNode
  lab: ReactNode
}) {
  const c = useCopy(copy)
  const { views, modules } = useContent()
  const view = views.find((v) => v.id === mod.view)!
  const siblings = view.modules.map((id) => modules.find((m) => m.id === id)!)

  return (
    <article className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-semibold tracking-wider text-neutral-400 uppercase">{view.title}</p>
        {siblings.length > 1 && (
          <div className="flex gap-1 self-start rounded-lg bg-neutral-100 p-1" role="tablist">
            {siblings.map((s) => (
              <NavLink
                key={s.id}
                to={s.path}
                role="tab"
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-white shadow-sm' : 'text-neutral-500 hover:text-ink'}`
                }
              >
                {s.title}
              </NavLink>
            ))}
          </div>
        )}
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{mod.title}</h1>
        <p className="text-neutral-500">
          {mod.altTitle} · {c.pages} {mod.pages[0]}–{mod.pages[mod.pages.length - 1]}
        </p>
      </header>

      <Section step={1} title={c.concept} icon={<BookOpen className="size-4" />}>
        <p className="max-w-prose text-lg leading-relaxed text-neutral-800">{mod.concept}</p>
      </Section>

      <Section step={2} title={c.toolbox} icon={<Wrench className="size-4" />}>
        {toolbox}
      </Section>

      <Section step={3} title={c.lab} icon={<FlaskConical className="size-4" />}>
        {lab}
      </Section>
    </article>
  )
}

function Section({ step, title, icon, children }: { step: number; title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wider text-neutral-500 uppercase">
        <span className="flex size-6 items-center justify-center rounded-full bg-ink text-xs text-white">{step}</span>
        {icon}
        {title}
      </h2>
      {children}
    </section>
  )
}
