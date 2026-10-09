import { Banknote, Calculator, ChartCandlestick, Percent, Receipt, Rocket, Scale, ShieldCheck, Sprout, Timer, TrendingUp, type LucideIcon } from 'lucide-react'

// modules.json nomme ses icônes ; seules celles-ci sont importées, pour ne pas embarquer toute la librairie.
const icons: Record<string, LucideIcon> = { Banknote, Calculator, ChartCandlestick, Percent, Receipt, Rocket, Scale, ShieldCheck, Sprout, Timer, TrendingUp }

export const moduleIcon = (name: string): LucideIcon => icons[name] ?? Scale
