import type { ReactNode } from 'react'

/** Carte blanche des labos, avec titre et sous-titre facultatifs. */
export default function Panel({
  title,
  subtitle,
  actions,
  children,
  className = '',
}: {
  title?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`flex min-w-0 flex-col gap-4 rounded-2xl border border-hairline bg-surface p-4 sm:p-6 ${className}`}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h3 className="font-semibold">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-sm text-secondary">{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  )
}
