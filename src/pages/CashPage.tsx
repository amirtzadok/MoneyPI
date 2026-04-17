import type { useAppData } from '../hooks/useAppData'
type AppData = ReturnType<typeof useAppData>
export function CashPage({ appData: _ }: { appData: AppData }) {
  return <div className="text-slate-400">מזומן — בקרוב</div>
}
