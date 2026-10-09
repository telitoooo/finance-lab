import { useId, type ReactNode } from 'react'

export default function Toggle({
  checked,
  onChange,
  children,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
}) {
  const labelId = useId()
  return (
    <div className="flex items-start gap-3 text-sm">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:ring-4 focus-visible:ring-ink/20 focus-visible:outline-none ${
          checked ? 'bg-ink' : 'bg-neutral-300'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`}
        />
      </button>
      <span id={labelId} className="cursor-pointer text-secondary" onClick={() => onChange(!checked)}>
        {children}
      </span>
    </div>
  )
}
