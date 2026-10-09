import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'

export type Tone = 'neutral' | 'good' | 'warning' | 'critical'

const toneStyles: Record<Tone, { ring: string; text: string; Icon?: typeof CheckCircle2 }> = {
  neutral: { ring: 'border-hairline', text: 'text-secondary' },
  good: { ring: 'border-good/40', text: 'text-good-ink', Icon: CheckCircle2 },
  warning: { ring: 'border-warning/60', text: 'text-[#8a5a00]', Icon: AlertTriangle },
  critical: { ring: 'border-critical/40', text: 'text-critical', Icon: XCircle },
}

/** Tuile chiffre clé : libellé, valeur, et un statut toujours doublé d'une icône et d'un texte. */
export default function StatTile({
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: Tone
}) {
  const style = toneStyles[tone]
  return (
    <div className={`flex flex-col gap-1 rounded-xl border bg-white p-4 ${style.ring}`}>
      <p className="text-xs text-secondary">{label}</p>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      {sub && (
        <p className={`flex items-start gap-1 text-xs ${style.text}`}>
          {style.Icon && <style.Icon className="mt-px size-3.5 shrink-0" aria-hidden />}
          <span>{sub}</span>
        </p>
      )}
    </div>
  )
}
