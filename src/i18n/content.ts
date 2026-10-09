// Contenu du site dans la langue courante. Les JSON français (src/data) sont la source :
// ils portent les chiffres et les identifiants. Les JSON anglais (src/data/en) ne portent
// que les textes, rangés par identifiant, et viennent se superposer aux français.
import adidasEn from '../data/en/adidas.json'
import formulasEn from '../data/en/formulas.json'
import modulesEn from '../data/en/modules.json'
import quizEn from '../data/en/quiz.json'
import { adidas, formulas, modules, quiz, views } from '../data'
import type { AdidasDataset, CourseModule, Formula, FormulaSymbol, ModuleId, QuizBank, View } from '../data/types'
import { useLang, type Lang } from './lang'

export interface FormulaText {
  name: string
  latex: string
  symbols?: FormulaSymbol[]
  note?: string
}
export interface ModulesText {
  views: Record<string, { title: string }>
  modules: Record<
    string,
    {
      title: string
      altTitle: string
      concept: string
      toolbox: string[]
      lab: { title: string; goal: string }
      pdfExample: { original: string; adidas: string }
    }
  >
}
export type QuizText = Record<string, { topic: string; question: string; choices: string[]; explanation: string }>
export interface AdidasText {
  meta: { source: string; disclaimer: string; cashFlowNote: string }
  taxRateNote: string
  balanceSheet: Record<string, { label: string; lines: Record<string, { label: string; detail?: string }> }>
  wcrDaysNote: string
  scenarios: Record<string, { title: string; pdfOrigin: string; story: string }>
  guessCompany: { title: string; pdfOrigin: string; rows: Record<string, string>; hints: Record<string, string> }
}

export const english = {
  formulas: formulasEn as Record<string, FormulaText>,
  modules: modulesEn as ModulesText,
  quiz: quizEn as QuizText,
  adidas: adidasEn as AdidasText,
}

export interface Content {
  formulas: Formula[]
  modules: CourseModule[]
  views: View[]
  quiz: QuizBank
  adidas: AdidasDataset
  getFormula: (id: string) => Formula
  getModule: (id: ModuleId) => CourseModule
  questionsFor: (id: ModuleId) => QuizBank['questions']
}

function build(f: Formula[], m: CourseModule[], v: View[], q: QuizBank, a: AdidasDataset): Content {
  const byId = new Map(f.map((x) => [x.id, x]))
  return {
    formulas: f,
    modules: m,
    views: v,
    quiz: q,
    adidas: a,
    getFormula: (id) => byId.get(id)!,
    getModule: (id) => m.find((x) => x.id === id)!,
    questionsFor: (id) => q.questions.filter((x) => x.module === id),
  }
}

function translateAdidas(en: AdidasText): AdidasDataset {
  const side = (blocks: AdidasDataset['balanceSheet']['assets']) =>
    blocks.map((block) => ({
      ...block,
      label: en.balanceSheet[block.id].label,
      lines: block.lines.map((line) => ({ ...line, ...en.balanceSheet[block.id].lines[line.id] })),
    }))
  return {
    ...adidas,
    meta: { ...adidas.meta, ...en.meta },
    incomeStatement: { ...adidas.incomeStatement, taxRateNote: en.taxRateNote },
    balanceSheet: { assets: side(adidas.balanceSheet.assets), liabilities: side(adidas.balanceSheet.liabilities) },
    wcrDays: { ...adidas.wcrDays, note: en.wcrDaysNote },
    scenarios: Object.fromEntries(Object.entries(adidas.scenarios).map(([key, s]) => [key, { ...s, ...en.scenarios[key] }])),
    guessCompany: {
      ...adidas.guessCompany,
      title: en.guessCompany.title,
      pdfOrigin: en.guessCompany.pdfOrigin,
      rows: {
        assets: adidas.guessCompany.rows.assets.map((r) => ({ ...r, label: en.guessCompany.rows[r.id] })),
        liabilities: adidas.guessCompany.rows.liabilities.map((r) => ({ ...r, label: en.guessCompany.rows[r.id] })),
      },
      columns: adidas.guessCompany.columns.map((c) => ({ ...c, hint: en.guessCompany.hints[c.id] })),
    },
  }
}

function buildEnglish(): Content {
  const { formulas: fEn, modules: mEn, quiz: qEn, adidas: aEn } = english
  return build(
    formulas.map((x) => ({ ...x, ...fEn[x.id] })),
    modules.map((x) => {
      const t = mEn.modules[x.id]
      return {
        ...x,
        title: t.title,
        altTitle: t.altTitle,
        concept: t.concept,
        toolbox: x.toolbox.map((group, i) => ({ ...group, title: t.toolbox[i] })),
        lab: { ...x.lab, ...t.lab },
        pdfExample: t.pdfExample,
      }
    }),
    views.map((x) => ({ ...x, title: mEn.views[x.id].title })),
    { ...quiz, questions: quiz.questions.map((x) => ({ ...x, ...qEn[x.id] })) },
    translateAdidas(aEn),
  )
}

const cache: Partial<Record<Lang, Content>> = {}

export function getContent(lang: Lang): Content {
  cache[lang] ??= lang === 'fr' ? build(formulas, modules, views, quiz, adidas) : buildEnglish()
  return cache[lang]
}

export const useContent = () => getContent(useLang())
