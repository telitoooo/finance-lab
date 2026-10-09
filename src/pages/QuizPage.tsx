import { useMemo, useState } from 'react'
import QuizEngine, { type QuizMode } from '../components/QuizEngine'
import SegmentedControl from '../components/ui/SegmentedControl'
import type { ModuleId } from '../data'
import { useContent } from '../i18n/content'
import { useCopy } from '../i18n/lang'

const LENGTHS = [10, 20, 0] as const

const copy = {
  fr: {
    title: 'Révision QCM',
    intro: (n: number, correct: number, wrong: number, blank: number) =>
      `${n} questions tirées du cours, au format de l'examen final : une seule bonne réponse, barème +${correct} / −${wrong} / ${blank}. Dans le doute, mieux vaut ne pas répondre.`,
    modules: 'Modules',
    mode: 'Mode',
    modeLabel: 'Mode du quiz',
    practice: 'Entraînement (correction immédiate)',
    exam: 'Examen blanc (correction à la fin)',
    questions: 'Questions',
    countLabel: 'Nombre de questions',
    all: (n: number) => `Toutes (${n})`,
    newDraw: 'Nouveau tirage',
    examTitle: 'Examen blanc',
    practiceTitle: 'Entraînement',
  },
  en: {
    title: 'MCQ review',
    intro: (n: number, correct: number, wrong: number, blank: number) =>
      `${n} questions drawn from the course, in the final exam format: exactly one right answer, scored +${correct} / −${wrong} / ${blank}. When in doubt, better not to answer.`,
    modules: 'Modules',
    mode: 'Mode',
    modeLabel: 'Quiz mode',
    practice: 'Practice (instant feedback)',
    exam: 'Mock exam (corrected at the end)',
    questions: 'Questions',
    countLabel: 'Number of questions',
    all: (n: number) => `All (${n})`,
    newDraw: 'New draw',
    examTitle: 'Mock exam',
    practiceTitle: 'Practice',
  },
}

export default function QuizPage() {
  const c = useCopy(copy)
  const { modules, quiz } = useContent()
  const [selected, setSelected] = useState<ModuleId[]>(modules.map((m) => m.id))
  const [mode, setMode] = useState<QuizMode>('practice')
  const [length, setLength] = useState<(typeof LENGTHS)[number]>(20)
  const [session, setSession] = useState(0)

  const pool = useMemo(() => quiz.questions.filter((q) => selected.includes(q.module)), [quiz, selected])
  const toggle = (id: ModuleId) =>
    setSelected((prev) => (prev.includes(id) ? (prev.length > 1 ? prev.filter((x) => x !== id) : prev) : [...prev, id]))

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{c.title}</h1>
        <p className="max-w-prose text-secondary">
          {c.intro(quiz.questions.length, quiz.scoring.correct, Math.abs(quiz.scoring.wrong), quiz.scoring.blank)}
        </p>
      </header>

      <div className="flex flex-col gap-4 rounded-2xl border border-hairline bg-surface p-4 sm:p-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">{c.modules}</p>
          <div className="flex flex-wrap gap-2">
            {modules.map((m) => {
              const on = selected.includes(m.id)
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(m.id)}
                  className={`rounded-full border px-3 py-1 text-sm ${on ? 'border-ink bg-ink text-white' : 'border-hairline bg-white text-secondary hover:border-ink'}`}
                >
                  {m.title}
                </button>
              )
            })}
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">{c.mode}</p>
            <SegmentedControl
              label={c.modeLabel}
              value={mode}
              onChange={setMode}
              options={[
                { value: 'practice', label: c.practice },
                { value: 'exam', label: c.exam },
              ]}
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">{c.questions}</p>
            <SegmentedControl
              label={c.countLabel}
              value={String(length)}
              onChange={(v) => setLength(Number(v) as (typeof LENGTHS)[number])}
              options={LENGTHS.map((n) => ({ value: String(n), label: n === 0 ? c.all(pool.length) : String(n) }))}
            />
          </div>
          <button
            type="button"
            onClick={() => setSession((s) => s + 1)}
            className="rounded-lg border border-hairline bg-white px-4 py-2 text-sm font-medium hover:border-ink"
          >
            {c.newDraw}
          </button>
        </div>
      </div>

      <QuizEngine
        key={`${selected.join(',')}|${mode}|${length}|${session}`}
        questions={pool}
        mode={mode}
        shuffle
        limit={length === 0 ? undefined : length}
        storageKey={selected.length === modules.length && length === 0 ? `all-${mode}` : undefined}
        title={mode === 'exam' ? c.examTitle : c.practiceTitle}
      />
    </div>
  )
}
