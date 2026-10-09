// Données sources (françaises). Pour afficher du texte, passer par useContent() (src/i18n/content.ts),
// qui superpose la traduction anglaise ; les imports directs d'ici ne servent qu'aux chiffres et aux ids.
import adidasJson from './adidas.json'
import formulasJson from './formulas.json'
import modulesJson from './modules.json'
import quizJson from './quiz.json'
import type { AdidasDataset, CourseModule, Formula, QuizBank, View } from './types'

export const formulas = formulasJson as Formula[]
export const modules = modulesJson.modules as CourseModule[]
export const views = modulesJson.views as View[]
export const quiz = quizJson as QuizBank
export const adidas = adidasJson as AdidasDataset

export type * from './types'
