import { useEffect, useState } from 'react'
import { useAuth } from './auth/useAuth'
import { useAppData } from './hooks/useAppData'
import { LoginPage } from './pages/LoginPage'
import { LoadingSpinner } from './components/LoadingSpinner'
import { Nav } from './components/Nav'
import { MonthSelector } from './components/MonthSelector'
import { OverviewPage } from './pages/OverviewPage'
import { TransactionsPage } from './pages/TransactionsPage'
import { BudgetPage } from './pages/BudgetPage'
import { CashPage } from './pages/CashPage'
import { InsightsPage } from './pages/InsightsPage'
import type { Tab } from './components/Nav'

export default function App() {
  const { isLoggedIn, user, logout } = useAuth()
  const appData = useAppData()
  const [tab, setTab] = useState<Tab>('overview')

  useEffect(() => {
    if (isLoggedIn) appData.initialize()
  }, [isLoggedIn]) // eslint-disable-line

  if (!isLoggedIn) return <LoginPage />

  if (!appData.initialized) return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center" dir="rtl">
      <LoadingSpinner label="טוען נתונים..." />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200" dir="rtl">
      {/* Top bar */}
      <div className="bg-[#1a1d2e] border-b border-[#2d3148] px-6 py-3 flex justify-between items-center gap-4">
        <div className="text-violet-500 font-bold text-lg shrink-0">💰 MoneyPI</div>
        <Nav active={tab} onChange={setTab} />
        <div className="flex items-center gap-3 shrink-0">
          <MonthSelector
            folders={appData.folders}
            selected={appData.selectedFolder}
            onSelect={appData.setSelectedFolder}
            onLoad={() => appData.loadMonth()}
            loading={appData.monthLoading}
          />
          <img src={user?.picture} className="w-7 h-7 rounded-full" alt="" />
          <button onClick={logout} className="text-xs text-white hover:text-slate-300">התנתק</button>
        </div>
      </div>

      {/* Page content */}
      <div className="p-6">
        {appData.error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700 text-red-300 rounded-lg text-sm">
            שגיאה: {appData.error}
          </div>
        )}
        {tab === 'overview' && <OverviewPage appData={appData} />}
        {tab === 'transactions' && <TransactionsPage appData={appData} />}
        {tab === 'budget' && <BudgetPage appData={appData} />}
        {tab === 'cash' && <CashPage appData={appData} />}
        {tab === 'insights' && <InsightsPage appData={appData} />}
      </div>
    </div>
  )
}
