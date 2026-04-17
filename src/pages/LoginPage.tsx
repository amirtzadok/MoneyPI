import { GoogleAuthButton } from '../auth/GoogleAuthButton'

export function LoginPage() {
  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center" dir="rtl">
      <div className="bg-[#1a1d2e] border border-[#2d3148] rounded-2xl p-10 flex flex-col items-center gap-6 w-full max-w-sm">
        <div className="text-4xl font-bold text-violet-500">💰 MoneyPI</div>
        <p className="text-slate-400 text-sm text-center">
          לוח בקרה פיננסי משפחתי
        </p>
        <GoogleAuthButton />
        <p className="text-xs text-slate-600 text-center">
          הנתונים שלך נשמרים אך ורק ב-Google Drive האישי שלך
        </p>
      </div>
    </div>
  )
}
