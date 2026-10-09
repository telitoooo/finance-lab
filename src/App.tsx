import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import { useLang } from './i18n/lang'
import { modules, views } from './data'
import HomePage from './pages/HomePage'

// KaTeX et Recharts ne sont chargés qu'à l'ouverture d'un module ou du quiz.
const ModulePage = lazy(() => import('./pages/ModulePage'))
const QuizPage = lazy(() => import('./pages/QuizPage'))

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        {/* Une vue à plusieurs modules redirige vers son premier module. */}
        {views
          .filter((view) => view.modules.length > 1)
          .map((view) => (
            <Route
              key={view.id}
              path={view.path}
              element={<Navigate to={modules.find((m) => m.id === view.modules[0])!.path} replace />}
            />
          ))}
        {modules.map((mod) => (
          <Route
            key={mod.id}
            path={mod.path}
            element={
              <Suspense fallback={<PageFallback />}>
                <ModulePage moduleId={mod.id} />
              </Suspense>
            }
          />
        ))}
        <Route
          path="/quiz"
          element={
            <Suspense fallback={<PageFallback />}>
              <QuizPage />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function PageFallback() {
  const loading = useLang() === 'fr' ? 'Chargement' : 'Loading'
  return <div className="h-96 animate-pulse rounded-2xl bg-neutral-100" aria-label={loading} />
}
