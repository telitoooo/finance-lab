// Préférences locales (meilleurs scores de quiz, missions des labos). Le stockage peut être indisponible
// (navigation privée, données bloquées) : le site doit fonctionner sans.

const PREFIX = 'finance-lab:'

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Stockage indisponible : on ignore, le score n'est simplement pas mémorisé.
  }
}

export interface BestScore {
  score: number
  max: number
}

export const bestScoreKey = (quizId: string) => `quiz:${quizId}:best`

/** Missions accomplies dans un labo (affichées sur la page d'accueil). */
export interface MissionProgress {
  achieved: string[]
  total: number
}

export const missionsKey = (labId: string) => `missions:${labId}`
