import { Suspense } from 'react'
import FormulaCard from '../components/FormulaCard'
import ModuleLayout from '../components/layout/ModuleLayout'
import QuizEngine from '../components/QuizEngine'
import type { ModuleId } from '../data'
import { useContent } from '../i18n/content'
import { useCopy } from '../i18n/lang'
import { labs } from '../labs'

const copy = {
  fr: { loading: 'Chargement du labo', quiz: (n: number) => `Quiz express · ${n} questions` },
  en: { loading: 'Loading the lab', quiz: (n: number) => `Quick quiz · ${n} questions` },
}

export default function ModulePage({ moduleId }: { moduleId: ModuleId }) {
  const c = useCopy(copy)
  const { getModule, getFormula, questionsFor } = useContent()
  const mod = getModule(moduleId)
  const Lab = labs[mod.lab.kind]
  const questions = questionsFor(moduleId)

  const toolbox = (
    <div className="flex flex-col gap-6">
      {mod.toolbox.map((group) => (
        <div key={group.title} className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">{group.title}</h3>
          <div className="grid gap-3 xl:grid-cols-2">
            {group.formulaIds.map((id) => (
              <FormulaCard key={id} formula={getFormula(id)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )

  const lab = (
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="font-semibold">{mod.lab.title}</h3>
        <p className="mt-1 max-w-prose text-sm text-secondary">{mod.lab.goal}</p>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-neutral-100" aria-label={c.loading} />}>
        <Lab />
      </Suspense>
      <QuizEngine key={moduleId} questions={questions} storageKey={moduleId} title={c.quiz(questions.length)} />
    </div>
  )

  return <ModuleLayout module={mod} toolbox={toolbox} lab={lab} />
}
