import { useEffect, useState } from 'react'
import { useAuth } from './auth/useAuth'
import { useDrive } from './drive/useDrive'
import { LoginPage } from './pages/LoginPage'
import { LoadingSpinner } from './components/LoadingSpinner'

export default function App() {
  const { isLoggedIn, user } = useAuth()
  const { ensureAppFolder, error } = useDrive()
  const [driveReady, setDriveReady] = useState(false)

  useEffect(() => {
    if (!isLoggedIn) return
    ensureAppFolder().then(() => setDriveReady(true))
  }, [isLoggedIn, ensureAppFolder])

  if (!isLoggedIn) return <LoginPage />

  if (!driveReady) return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center" dir="rtl">
      <LoadingSpinner label="מתחבר ל-Google Drive..." />
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center text-red-400" dir="rtl">
      שגיאה בחיבור ל-Drive: {error}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200" dir="rtl">
      <div className="p-6">
        <p className="text-violet-400 text-lg font-bold">✅ MoneyPI מחובר</p>
        <p className="text-slate-400 text-sm mt-1">שלום, {user?.name}</p>
        <p className="text-slate-600 text-xs mt-1">תיקיית Drive נוצרה בהצלחה</p>
      </div>
    </div>
  )
}
