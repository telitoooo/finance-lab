import { CircleCheck, RotateCcw, Target, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useCopy } from '../i18n/lang'
import { missionsKey, readJson, writeJson, type MissionProgress } from '../lib/storage'

export interface Mission {
  id: string
  label: string
  /** Coup de pouce affiché tant que la mission n'est pas accomplie. */
  hint?: string
  /** Condition remplie par l'état courant du labo. */
  done: boolean
  /** Ce qu'il faut retenir, affiché une fois la mission accomplie. */
  lesson?: string
}

const copy = {
  fr: {
    title: 'Missions',
    progress: (n: number, total: number) => `${n} / ${total} accomplie${n > 1 ? 's' : ''}`,
    accomplished: 'Mission accomplie',
    todo: 'Mission à accomplir',
    allDone: (badge: string) => `Toutes les missions sont accomplies : badge « ${badge} » débloqué !`,
    replay: 'Rejouer les missions',
    latest: (label: string) => `Mission accomplie : ${label}`,
  },
  en: {
    title: 'Missions',
    progress: (n: number, total: number) => `${n} / ${total} completed`,
    accomplished: 'Mission completed',
    todo: 'Mission to complete',
    allDone: (badge: string) => `All missions completed: "${badge}" badge unlocked!`,
    replay: 'Replay the missions',
    latest: (label: string) => `Mission completed: ${label}`,
  },
}

/**
 * Tableau de missions d'un labo. Une mission accomplie le reste (même si l'on bouge ensuite les
 * curseurs) et la progression est mémorisée localement : la page d'accueil l'affiche.
 */
export default function MissionBoard({ storageId, missions, badge }: { storageId: string; missions: Mission[]; badge: string }) {
  const c = useCopy(copy)
  const [achieved, setAchieved] = useState<string[]>(() => readJson<MissionProgress | null>(missionsKey(storageId), null)?.achieved ?? [])
  const [latest, setLatest] = useState<string | null>(null)

  // Une condition vient d'être remplie : on l'enregistre pendant le rendu (état dérivé des props).
  const newlyDone = missions.filter((m) => m.done && !achieved.includes(m.id))
  if (newlyDone.length > 0) {
    setAchieved([...achieved, ...newlyDone.map((m) => m.id)])
    setLatest(newlyDone[newlyDone.length - 1].label)
  }

  // Mémorisation locale de la progression, lue par la page d'accueil.
  useEffect(() => {
    writeJson(missionsKey(storageId), { achieved, total: missions.length } satisfies MissionProgress)
  }, [achieved, missions.length, storageId])

  const count = missions.filter((m) => achieved.includes(m.id)).length
  const allDone = count === missions.length

  function replay() {
    setAchieved([])
    setLatest(null)
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-hairline bg-white p-4 sm:p-5" aria-labelledby={`${storageId}-missions`}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h4 id={`${storageId}-missions`} className="flex items-center gap-2 font-semibold">
          <Trophy className={`size-4 ${allDone ? 'text-formula' : 'text-muted'}`} aria-hidden />
          {c.title}
        </h4>
        <div className="flex items-center gap-3">
          <span className="text-xs text-secondary tabular-nums">{c.progress(count, missions.length)}</span>
          {count > 0 && (
            <button type="button" onClick={replay} className="inline-flex items-center gap-1 text-xs text-secondary hover:text-ink">
              <RotateCcw className="size-3.5" aria-hidden /> {c.replay}
            </button>
          )}
        </div>
      </header>
      <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100" aria-hidden>
        <div className="h-full rounded-full bg-good transition-[width] duration-500" style={{ width: `${(count / missions.length) * 100}%` }} />
      </div>
      <ol className="flex flex-col gap-2">
        {missions.map((m, i) => {
          const ok = achieved.includes(m.id)
          return (
            <li
              key={m.id}
              className={`flex gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors ${ok ? 'border-good/40 bg-good/5' : 'border-hairline'}`}
            >
              {ok ? (
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-good-ink" aria-label={c.accomplished} />
              ) : (
                <Target className="mt-0.5 size-4 shrink-0 text-muted" aria-label={c.todo} />
              )}
              <div className="flex flex-col gap-0.5">
                <p className={ok ? 'font-medium text-good-ink' : 'font-medium'}>
                  <span className="text-muted tabular-nums">{i + 1}. </span>
                  {m.label}
                </p>
                {!ok && m.hint && <p className="text-xs text-secondary">{m.hint}</p>}
                {ok && m.lesson && <p className="text-xs text-secondary">{m.lesson}</p>}
              </div>
            </li>
          )
        })}
      </ol>
      <p className="text-sm font-medium text-good-ink" aria-live="polite">
        {allDone ? c.allDone(badge) : latest ? c.latest(latest) : ''}
      </p>
    </section>
  )
}
