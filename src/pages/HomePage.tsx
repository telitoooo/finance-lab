import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { moduleIcon } from '../components/layout/icons'
import { useContent } from '../i18n/content'
import { useCopy } from '../i18n/lang'
import { formatMoney } from '../lib/format'
import { bestScoreKey, missionsKey, readJson, type BestScore, type MissionProgress } from '../lib/storage'

const copy = {
  fr: {
    kicker: 'Corporate Finance · révision',
    title: "Toute la finance d'entreprise, racontée par Adidas",
    intro: (n: number) =>
      `${n} modules, chacun en trois temps : le concept appliqué à Adidas, les formules exactes du cours, puis un labo pour manipuler les chiffres.`,
    revenue: "Chiffre d'affaires",
    netIncome: 'Résultat net',
    capitalEmployed: 'Capitaux employés',
    fiscalYear: (year: number) => `Adidas, exercice ${year}.`,
    best: (score: number, max: number) => `Meilleur score au quiz : ${score} / ${max}`,
    quiz: (n: number) => `Quiz : ${n} questions`,
    missions: (done: number, total: number) => `Missions : ${done} / ${total}`,
  },
  en: {
    kicker: 'Corporate Finance · revision',
    title: 'All of corporate finance, told through Adidas',
    intro: (n: number) =>
      `${n} modules, each in three steps: the concept applied to Adidas, the exact formulas from the course, then a lab to play with the numbers.`,
    revenue: 'Revenue',
    netIncome: 'Net income',
    capitalEmployed: 'Capital employed',
    fiscalYear: (year: number) => `Adidas, financial year ${year}.`,
    best: (score: number, max: number) => `Best quiz score: ${score} / ${max}`,
    quiz: (n: number) => `Quiz: ${n} questions`,
    missions: (done: number, total: number) => `Missions: ${done} / ${total}`,
  },
}

export default function HomePage() {
  const c = useCopy(copy)
  const { adidas, modules, questionsFor } = useContent()
  const { incomeStatement: pnl, derived, meta } = adidas
  const keyFigures = [
    { label: c.revenue, value: formatMoney(pnl.revenue) },
    { label: 'EBIT', value: formatMoney(pnl.ebit) },
    { label: c.netIncome, value: formatMoney(pnl.netIncome) },
    { label: c.capitalEmployed, value: formatMoney(derived.capitalEmployed) },
  ]

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-semibold tracking-wider text-neutral-400 uppercase">{c.kicker}</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{c.title}</h1>
        <p className="max-w-prose text-lg text-neutral-600">{c.intro(modules.length)}</p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {keyFigures.map((k) => (
          <div key={k.label} className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs text-neutral-500">{k.label}</p>
            <p className="mt-1 text-xl font-semibold">{k.value}</p>
          </div>
        ))}
        <p className="col-span-full text-xs text-neutral-400">
          {c.fiscalYear(meta.fiscalYear)} {meta.disclaimer}
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {modules.map((mod) => {
          const Icon = moduleIcon(mod.icon)
          const best = readJson<BestScore | null>(bestScoreKey(mod.id), null)
          const missions = readJson<MissionProgress | null>(missionsKey(mod.id), null)
          return (
            <Link
              key={mod.id}
              to={mod.path}
              className="group flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-ink"
            >
              <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
              <div className="flex-1">
                <p className="font-semibold">{mod.title}</p>
                <p className="text-sm text-neutral-500">{mod.lab.title}</p>
                <p className="mt-1 text-xs text-muted">
                  {best ? c.best(best.score, best.max) : c.quiz(questionsFor(mod.id).length)}
                  {missions && ` · ${c.missions(missions.achieved.length, missions.total)}`}
                </p>
              </div>
              <ArrowRight className="size-4 text-neutral-300 transition-colors group-hover:text-ink" aria-hidden />
            </Link>
          )
        })}
      </section>
    </div>
  )
}
