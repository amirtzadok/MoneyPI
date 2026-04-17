import type { useAppData } from '../hooks/useAppData'
type AppData = ReturnType<typeof useAppData>
export function InsightsPage({ appData: _ }: { appData: AppData }) {
  return <div className="text-slate-400">AI Insights — בקרוב</div>
}
