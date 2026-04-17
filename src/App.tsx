import { useEffect, useState, useCallback } from 'react'
import { useAuth } from './auth/useAuth'
import { useDrive } from './drive/useDrive'
import { useMonthData } from './drive/useMonthData'
import { LoginPage } from './pages/LoginPage'
import { LoadingSpinner } from './components/LoadingSpinner'
import { MonthSelector } from './components/MonthSelector'
import type { MonthFolder, MonthData } from './drive/types'

export default function App() {
  const { isLoggedIn, user, logout } = useAuth()
  const { ensureAppFolder, error: driveError, readMappings } = useDrive()
  const { listMonthFolders, loadMonthData, loading: dataLoading } = useMonthData()
  const [driveReady, setDriveReady] = useState(false)
  const [folders, setFolders] = useState<MonthFolder[]>([])
  const [selectedFolder, setSelectedFolder] = useState<MonthFolder | null>(null)
  const [monthData, setMonthData] = useState<MonthData | null>(null)

  useEffect(() => {
    if (!isLoggedIn) return
    ensureAppFolder()
      .then(() => listMonthFolders())
      .then(f => {
        setFolders(f)
        if (f.length > 0) setSelectedFolder(f[f.length - 1])
        setDriveReady(true)
      })
      .catch(() => setDriveReady(true))
  }, [isLoggedIn, ensureAppFolder, listMonthFolders])

  const handleLoad = useCallback(async () => {
    if (!selectedFolder) return
    const mappings = await readMappings()
    const data = await loadMonthData(selectedFolder, mappings)
    setMonthData(data)
  }, [selectedFolder, readMappings, loadMonthData])

  if (!isLoggedIn) return <LoginPage />
  if (!driveReady) return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center" dir="rtl">
      <LoadingSpinner label="מתחבר ל-Google Drive..." />
    </div>
  )
  if (driveError) return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center text-red-400" dir="rtl">
      שגיאה: {driveError}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200" dir="rtl">
      {/* Top bar */}
      <div className="bg-[#1a1d2e] border-b border-[#2d3148] px-6 py-3 flex justify-between items-center">
        <div className="text-violet-500 font-bold text-lg">💰 MoneyPI</div>
        <MonthSelector
          folders={folders}
          selected={selectedFolder}
          onSelect={setSelectedFolder}
          onLoad={handleLoad}
          loading={dataLoading}
        />
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <img src={user?.picture} className="w-7 h-7 rounded-full" alt="" />
          <span>{user?.name}</span>
          <button onClick={logout} className="text-xs text-slate-600 hover:text-slate-300 mr-1">התנתק</button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {!monthData ? (
          <div className="text-center text-slate-500 mt-20">
            <p className="text-4xl mb-4">📊</p>
            <p>בחר חודש ולחץ "טען נתונים" כדי להתחיל</p>
            {folders.length === 0 && (
              <p className="text-sm mt-2 text-slate-600">
                לא נמצאו תיקיות חודש ב-Drive. בדוק תיקיית Expenses › Expenses 2026.
              </p>
            )}
          </div>
        ) : (
          <div>
            <p className="text-green-400 font-bold text-lg mb-4">
              ✅ {monthData.transactions.length} עסקאות — {monthData.folder.name}
            </p>
            <div className="bg-[#1a1d2e] rounded-xl border border-[#2d3148] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2d3148]">
                    <th className="text-right p-3 text-slate-500 font-medium">תאריך</th>
                    <th className="text-right p-3 text-slate-500 font-medium">עסק</th>
                    <th className="text-right p-3 text-slate-500 font-medium">קטגוריה</th>
                    <th className="text-right p-3 text-slate-500 font-medium">סכום</th>
                    <th className="text-right p-3 text-slate-500 font-medium">כרטיס</th>
                  </tr>
                </thead>
                <tbody>
                  {monthData.transactions.slice(0, 50).map(t => (
                    <tr key={t.id} className="border-b border-[#141620] hover:bg-[#1e2135]">
                      <td className="p-3 text-slate-400">{t.date}</td>
                      <td className="p-3">{t.description}</td>
                      <td className="p-3">
                        <span className="bg-[#1e1b4b] text-violet-300 text-xs px-2 py-1 rounded">
                          {t.category}
                        </span>
                      </td>
                      <td className={`p-3 font-bold ${t.amount < 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ₪{Math.abs(t.amount).toFixed(2)}
                      </td>
                      <td className="p-3 text-slate-500">{t.cardNumber}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
