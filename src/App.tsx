import { useAuth } from './auth/useAuth'
import { LoginPage } from './pages/LoginPage'

export default function App() {
  const { isLoggedIn } = useAuth()

  if (!isLoggedIn) return <LoginPage />

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200" dir="rtl">
      <p className="p-4 text-violet-400">✅ מחובר — Dashboard בקרוב</p>
    </div>
  )
}
