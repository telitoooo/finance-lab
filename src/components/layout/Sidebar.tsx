import { BarChart3, GraduationCap, Home } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useContent } from '../../i18n/content'
import { useCopy } from '../../i18n/lang'
import { moduleIcon } from './icons'
import LanguageSwitch from './LanguageSwitch'

const copy = {
  fr: { nav: 'Navigation principale', home: 'Accueil', quiz: 'Révision QCM' },
  en: { nav: 'Main navigation', home: 'Home', quiz: 'MCQ review' },
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
    isActive ? 'bg-ink text-white' : 'text-neutral-600 hover:bg-neutral-100 hover:text-ink'
  }`

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const c = useCopy(copy)
  const { views, modules } = useContent()
  return (
    <nav className="flex h-full flex-col gap-6 overflow-y-auto p-4" aria-label={c.nav}>
      <div className="flex items-center gap-2 px-3 pt-1">
        <BarChart3 className="size-5" aria-hidden />
        <span className="font-semibold tracking-tight">Finance Lab</span>
        <span className="ml-auto">
          <LanguageSwitch />
        </span>
      </div>

      <NavLink to="/" end className={linkClass} onClick={onNavigate}>
        <Home className="size-4" aria-hidden />
        {c.home}
      </NavLink>

      {views.map((view) => (
        <div key={view.id} className="flex flex-col gap-1">
          <p className="px-3 text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">{view.title}</p>
          {view.modules.map((id) => {
            const mod = modules.find((m) => m.id === id)!
            const Icon = moduleIcon(mod.icon)
            return (
              <NavLink key={mod.id} to={mod.path} className={linkClass} onClick={onNavigate}>
                <Icon className="size-4" aria-hidden />
                {mod.title}
              </NavLink>
            )
          })}
        </div>
      ))}

      <div className="mt-auto border-t border-neutral-200 pt-4">
        <NavLink to="/quiz" className={linkClass} onClick={onNavigate}>
          <GraduationCap className="size-4" aria-hidden />
          {c.quiz}
        </NavLink>
      </div>
    </nav>
  )
}
