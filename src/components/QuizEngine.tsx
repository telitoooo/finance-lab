import { ArrowLeft, ArrowRight, BookMarked, Check, RotateCcw, Trophy, X } from 'lucide-react'
import { useEffect, useMemo, useReducer, useRef, useState, type KeyboardEvent, type RefObject } from 'react'
import { quiz, type QuizQuestion } from '../data'
import { useCopy } from '../i18n/lang'
import { bestScoreKey, readJson, writeJson, type BestScore } from '../lib/storage'

export type QuizMode = 'practice' | 'exam'

const LETTERS = ['A', 'B', 'C', 'D', 'E']
const { scoring } = quiz

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`
const copy = {
  fr: {
    empty: 'Aucune question pour ce filtre.',
    exam: 'Examen blanc',
    practice: 'Quiz express',
    question: 'Question',
    score: 'score',
    answered: (n: number) => plural(n, 'répondue'),
    correctIcon: 'Bonne réponse',
    wrongIcon: 'Votre réponse, incorrecte',
    previous: 'Précédente',
    skip: 'Je ne sais pas',
    finish: 'Terminer et corriger',
    seeScore: 'Voir mon score',
    next: 'Suivante',
    shortcuts: (last: string, c: string, w: string, b: string) =>
      `Raccourcis : touches A à ${last} pour répondre. Barème de l'examen : bonne réponse ${c}, mauvaise ${w}, sans réponse ${b}.`,
    right: 'Bonne réponse',
    blank: 'Sans réponse',
    expected: (letter: string) => `Réponse attendue : ${letter}`,
    course: 'Cours, p.',
    finalScore: 'Score final',
    tally: (c: number, w: number, b: number) => `${plural(c, 'juste')} · ${plural(w, 'fausse')} · ${b} sans réponse`,
    best: 'Meilleur score :',
    restart: 'Recommencer',
    retry: (n: number) => `Retravailler mes ${plural(n, 'erreur')}`,
    ok: 'Juste',
    ko: 'Fausse',
    yourAnswer: 'Votre réponse :',
    none: 'aucune',
    rightAnswer: 'Bonne réponse :',
  },
  en: {
    empty: 'No questions for this filter.',
    exam: 'Mock exam',
    practice: 'Quick quiz',
    question: 'Question',
    score: 'score',
    answered: (n: number) => `${n} answered`,
    correctIcon: 'Right answer',
    wrongIcon: 'Your answer, wrong',
    previous: 'Previous',
    skip: "I don't know",
    finish: 'Finish and correct',
    seeScore: 'See my score',
    next: 'Next',
    shortcuts: (last: string, c: string, w: string, b: string) =>
      `Shortcuts: keys A to ${last} to answer. Exam scoring: right answer ${c}, wrong ${w}, no answer ${b}.`,
    right: 'Right answer',
    blank: 'No answer',
    expected: (letter: string) => `Expected answer: ${letter}`,
    course: 'Course, p.',
    finalScore: 'Final score',
    tally: (c: number, w: number, b: number) => `${c} right · ${w} wrong · ${b} unanswered`,
    best: 'Best score:',
    restart: 'Start again',
    retry: (n: number) => `Rework my ${plural(n, 'mistake')}`,
    ok: 'Right',
    ko: 'Wrong',
    yourAnswer: 'Your answer:',
    none: 'none',
    rightAnswer: 'Right answer:',
  },
}

interface State {
  order: string[]
  index: number
  /** null = question passée (0 point). */
  answers: Record<string, number | null>
  finished: boolean
}

type Action =
  | { type: 'answer'; id: string; choice: number }
  | { type: 'skip'; id: string }
  | { type: 'go'; index: number }
  | { type: 'finish' }
  | { type: 'restart'; order: string[] }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'answer':
      return { ...state, answers: { ...state.answers, [action.id]: action.choice } }
    case 'skip':
      return { ...state, answers: { ...state.answers, [action.id]: null } }
    case 'go':
      return { ...state, index: Math.max(0, Math.min(state.order.length - 1, action.index)) }
    case 'finish':
      return { ...state, finished: true }
    case 'restart':
      return { order: action.order, index: 0, answers: {}, finished: false }
  }
}

function shuffled<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

const points = (q: QuizQuestion, answer: number | null | undefined) =>
  answer === null || answer === undefined ? scoring.blank : answer === q.answer ? scoring.correct : scoring.wrong

/**
 * Moteur de QCM au format de l'examen final : une seule bonne réponse, barème +1 / −1 / 0.
 * - practice : correction immédiate après chaque réponse, avec l'explication et la page du cours.
 * - exam : réponses modifiables, correction à la fin.
 * Pour réinitialiser après un changement de questions, le parent change la `key`.
 */
export default function QuizEngine({
  questions,
  mode = 'practice',
  shuffle = false,
  limit,
  storageKey,
  title,
}: {
  questions: QuizQuestion[]
  mode?: QuizMode
  shuffle?: boolean
  /** Nombre de questions tirées (après mélange) ; toutes par défaut. */
  limit?: number
  storageKey?: string
  title?: string
}) {
  const c = useCopy(copy)
  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions])
  const makeOrder = (ids: string[]) => (shuffle ? shuffled(ids) : ids).slice(0, limit)
  const [state, dispatch] = useReducer(reducer, undefined, (): State => ({
    order: makeOrder(questions.map((q) => q.id)),
    index: 0,
    answers: {},
    finished: false,
  }))
  const [best, setBest] = useState<BestScore | null>(() => (storageKey ? readJson(bestScoreKey(storageKey), null) : null))

  const headingRef = useRef<HTMLParagraphElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    headingRef.current?.focus()
  }, [state.index, state.finished])

  // Après une correction, le focus passe sur « Suivante » : Entrée enchaîne au clavier.
  const currentId = state.order[state.index]
  const currentRevealed = mode === 'practice' && !state.finished && currentId in state.answers
  useEffect(() => {
    if (currentRevealed) nextRef.current?.focus()
  }, [currentRevealed, currentId])

  const total = state.order.length
  const score = state.order.reduce((sum, id) => sum + points(byId.get(id)!, state.answers[id]), 0)

  function finish() {
    dispatch({ type: 'finish' })
    if (storageKey && (!best || score > best.score)) {
      const record = { score, max: total }
      writeJson(bestScoreKey(storageKey), record)
      setBest(record)
    }
  }

  if (total === 0) return <p className="text-sm text-secondary">{c.empty}</p>

  if (state.finished) {
    return (
      <QuizSummary
        order={state.order}
        byId={byId}
        answers={state.answers}
        score={score}
        best={best}
        headingRef={headingRef}
        onRestart={() => dispatch({ type: 'restart', order: makeOrder(questions.map((q) => q.id)) })}
        onRetryMistakes={(ids) => dispatch({ type: 'restart', order: makeOrder(ids) })}
      />
    )
  }

  const question = byId.get(state.order[state.index])!
  const answer = state.answers[question.id]
  const answered = question.id in state.answers
  const revealed = mode === 'practice' && answered
  const isLast = state.index === total - 1
  const answeredCount = Object.keys(state.answers).length

  function choose(choice: number) {
    if (revealed) return
    dispatch({ type: 'answer', id: question.id, choice })
  }
  function next() {
    if (isLast) finish()
    else dispatch({ type: 'go', index: state.index + 1 })
  }
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const letter = LETTERS.indexOf(e.key.toUpperCase())
    const digit = Number(e.key) - 1
    const choice = letter >= 0 ? letter : digit >= 0 && digit < 5 ? digit : -1
    if (choice >= 0 && choice < question.choices.length) {
      e.preventDefault()
      choose(choice)
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-hairline bg-surface p-4 sm:p-6" onKeyDown={onKeyDown}>
      <header className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-semibold">{title ?? (mode === 'exam' ? c.exam : c.practice)}</span>
        <span className="text-secondary tabular-nums">
          {c.question} {state.index + 1} / {total}
          {mode === 'practice' && <> · {c.score} {formatScore(score)}</>}
          {mode === 'exam' && <> · {c.answered(answeredCount)}</>}
        </span>
      </header>
      <div className="h-1 overflow-hidden rounded-full bg-hairline" aria-hidden>
        <div className="h-full bg-ink transition-[width]" style={{ width: `${((state.index + (answered ? 1 : 0)) / total) * 100}%` }} />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium tracking-wide text-muted uppercase">{question.topic}</span>
        <p ref={headingRef} tabIndex={-1} className="text-lg leading-snug font-medium outline-none">
          {question.question}
        </p>
      </div>

      <ul className="flex flex-col gap-2" role="list">
        {question.choices.map((choice, i) => {
          const isChosen = answer === i
          const isCorrect = i === question.answer
          let style = 'border-hairline bg-white hover:border-ink'
          let icon = null
          if (revealed && isCorrect) {
            style = 'border-good bg-good/10'
            icon = <Check className="size-4 text-good-ink" aria-label={c.correctIcon} />
          } else if (revealed && isChosen) {
            style = 'border-critical bg-critical/10'
            icon = <X className="size-4 text-critical" aria-label={c.wrongIcon} />
          } else if (revealed) {
            style = 'border-hairline bg-white opacity-60'
          } else if (isChosen) {
            style = 'border-ink bg-white ring-2 ring-ink/10'
          }
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => choose(i)}
                disabled={revealed}
                aria-pressed={isChosen}
                className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors disabled:cursor-default ${style}`}
              >
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                    isChosen && !revealed ? 'border-ink bg-ink text-white' : 'border-hairline'
                  }`}
                >
                  {LETTERS[i]}
                </span>
                <span className="flex-1 pt-0.5">{choice}</span>
                {icon && <span className="pt-0.5">{icon}</span>}
              </button>
            </li>
          )
        })}
      </ul>

      <div aria-live="polite">
        {revealed && (
          <Feedback question={question} answer={answer ?? null} />
        )}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2">
        {mode === 'exam' ? (
          <button
            type="button"
            onClick={() => dispatch({ type: 'go', index: state.index - 1 })}
            disabled={state.index === 0}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-secondary hover:text-ink disabled:opacity-40"
          >
            <ArrowLeft className="size-4" aria-hidden /> {c.previous}
          </button>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap gap-2">
          {!answered && (
            <button
              type="button"
              onClick={() => {
                dispatch({ type: 'skip', id: question.id })
                if (mode === 'exam') next()
              }}
              className="rounded-lg px-3 py-2 text-sm text-secondary hover:text-ink"
            >
              {c.skip} ({formatScore(scoring.blank)})
            </button>
          )}
          {mode === 'exam' && isLast && (
            <button type="button" onClick={finish} className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white">
              {c.finish}
            </button>
          )}
          {((mode === 'practice' && answered) || (mode === 'exam' && !isLast)) && (
            <button
              ref={nextRef}
              type="button"
              onClick={next}
              className="inline-flex items-center gap-1 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white"
            >
              {isLast ? c.seeScore : c.next} <ArrowRight className="size-4" aria-hidden />
            </button>
          )}
        </div>
      </footer>
      <p className="text-[11px] text-muted">
        {c.shortcuts(
          LETTERS[question.choices.length - 1],
          formatScore(scoring.correct),
          formatScore(scoring.wrong),
          formatScore(scoring.blank),
        )}
      </p>
    </div>
  )
}

function Feedback({ question, answer }: { question: QuizQuestion; answer: number | null }) {
  const c = useCopy(copy)
  const correct = answer === question.answer
  const pts = points(question, answer)
  return (
    <div className={`rounded-xl px-4 py-3 text-sm ${correct ? 'bg-good/10' : 'bg-neutral-100'}`}>
      <p className={`flex items-center gap-1.5 font-semibold ${correct ? 'text-good-ink' : answer === null ? 'text-secondary' : 'text-critical'}`}>
        {correct ? <Check className="size-4" aria-hidden /> : <X className="size-4" aria-hidden />}
        {correct ? c.right : answer === null ? c.blank : c.expected(LETTERS[question.answer])} ({formatScore(pts)})
      </p>
      <p className="mt-1 leading-relaxed text-secondary">{question.explanation}</p>
      <p className="mt-2 flex items-center gap-1 text-xs text-muted">
        <BookMarked className="size-3" aria-hidden /> {c.course} {question.pages.join(', ')}
      </p>
    </div>
  )
}

function QuizSummary({
  order,
  byId,
  answers,
  score,
  best,
  headingRef,
  onRestart,
  onRetryMistakes,
}: {
  order: string[]
  byId: Map<string, QuizQuestion>
  answers: Record<string, number | null>
  score: number
  best: BestScore | null
  headingRef: RefObject<HTMLParagraphElement | null>
  onRestart: () => void
  onRetryMistakes: (ids: string[]) => void
}) {
  const c = useCopy(copy)
  const correct = order.filter((id) => answers[id] === byId.get(id)!.answer)
  const blank = order.filter((id) => answers[id] === null || answers[id] === undefined)
  const wrong = order.filter((id) => !correct.includes(id) && !blank.includes(id))
  const mistakes = [...wrong, ...blank]

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-hairline bg-surface p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p ref={headingRef} tabIndex={-1} className="text-sm text-secondary outline-none">
            {c.finalScore}
          </p>
          <p className="text-5xl font-semibold tracking-tight">
            {formatScore(score)} <span className="text-2xl text-muted">/ {order.length}</span>
          </p>
          <p className="mt-1 text-sm text-secondary">
            {c.tally(correct.length, wrong.length, blank.length)}
          </p>
        </div>
        {best && (
          <p className="flex items-center gap-1.5 text-sm text-secondary">
            <Trophy className="size-4" aria-hidden /> {c.best} {formatScore(best.score)} / {best.max}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onRestart} className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white">
          <RotateCcw className="size-4" aria-hidden /> {c.restart}
        </button>
        {mistakes.length > 0 && (
          <button
            type="button"
            onClick={() => onRetryMistakes(mistakes)}
            className="rounded-lg border border-hairline bg-white px-4 py-2 text-sm font-medium hover:border-ink"
          >
            {c.retry(mistakes.length)}
          </button>
        )}
      </div>

      <ol className="flex flex-col gap-2">
        {order.map((id, i) => {
          const q = byId.get(id)!
          const a = answers[id]
          const ok = a === q.answer
          return (
            <li key={id}>
              <details className="group rounded-xl border border-hairline bg-white px-4 py-3 text-sm">
                <summary className="flex cursor-pointer list-none items-start gap-2">
                  {ok ? (
                    <Check className="mt-0.5 size-4 shrink-0 text-good-ink" aria-label={c.ok} />
                  ) : (
                    <X className="mt-0.5 size-4 shrink-0 text-critical" aria-label={a === null || a === undefined ? c.blank : c.ko} />
                  )}
                  <span className="flex-1">
                    {i + 1}. {q.question}
                  </span>
                </summary>
                <div className="mt-2 flex flex-col gap-1 pl-6 text-secondary">
                  <p>
                    {c.yourAnswer} {a === null || a === undefined ? c.none : `${LETTERS[a]}. ${q.choices[a]}`}
                  </p>
                  {!ok && (
                    <p className="text-ink">
                      {c.rightAnswer} {LETTERS[q.answer]}. {q.choices[q.answer]}
                    </p>
                  )}
                  <p>{q.explanation}</p>
                  <p className="text-xs text-muted">{c.course} {q.pages.join(', ')}</p>
                </div>
              </details>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

const formatScore = (n: number) => (n > 0 ? `+${n}` : n === 0 ? '0' : `−${Math.abs(n)}`)
