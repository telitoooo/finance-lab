import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { LabKind } from '../data'

/** Un composant de labo par `lab.kind` de modules.json, chargé à la demande (Recharts est lourd). */
export const labs: Record<LabKind, LazyExoticComponent<ComponentType>> = {
  'balance-sheet-explorer': lazy(() => import('./BalanceSheetLab')),
  'pnl-waterfall': lazy(() => import('./PnlLab')),
  'wcr-simulator': lazy(() => import('./WcrLab')),
  'leverage-simulator': lazy(() => import('./LeverageLab')),
  'wacc-simulator': lazy(() => import('./WaccLab')),
  'npv-simulator': lazy(() => import('./NpvLab')),
}
