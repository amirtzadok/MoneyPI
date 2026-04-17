import type { useAppData } from '../hooks/useAppData'
type AppData = ReturnType<typeof useAppData>
export function TransactionsPage({ appData }: { appData: AppData }) {
  if (!appData.monthData) return <div className="text-slate-500 text-center mt-20">טען חודש כדי לראות עסקאות</div>
  return <div className="text-slate-400">עסקאות — בקרוב</div>
}
