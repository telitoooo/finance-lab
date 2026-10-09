import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useCopy } from '../../i18n/lang'
import LanguageSwitch from './LanguageSwitch'
import Sidebar from './Sidebar'

const copy = {
  fr: { open: 'Ouvrir le menu', close: 'Fermer le menu' },
  en: { open: 'Open menu', close: 'Close menu' },
}

export default function AppLayout() {
  const c = useCopy(copy)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh border-r border-neutral-200 bg-white lg:block">
        <Sidebar />
      </aside>

      {/* Mobile : barre supérieure + tiroir */}
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <span className="font-semibold tracking-tight">Finance Lab</span>
        <div className="flex items-center gap-3">
          <LanguageSwitch />
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-md p-1.5 hover:bg-neutral-100"
            aria-label={menuOpen ? c.close : c.open}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </header>
      {menuOpen && (
        <div className="fixed inset-0 z-10 bg-white pt-14 lg:hidden">
          <Sidebar onNavigate={() => setMenuOpen(false)} />
        </div>
      )}

      <main className="mx-auto w-full max-w-5xl min-w-0 overflow-x-clip px-4 py-8 sm:px-8 lg:py-12">
        <Outlet />
      </main>
    </div>
  )
}
