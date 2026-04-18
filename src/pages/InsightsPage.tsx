import { useState } from 'react'
import { computeSummary } from '../utils/summary'
import { formatCurrency } from '../utils/formatters'
import type { useAppData } from '../hooks/useAppData'
type AppData = ReturnType<typeof useAppData>

function buildPrompt(appData: AppData): string {
  const { monthData, config, cashEntries } = appData
  if (!monthData) return ''

  const summary = computeSummary(monthData.transactions)
  const topCategories = Object.entries(summary.byCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([cat, amount]) => `${cat}: ₪${amount.toFixed(0)}`)
    .join('\n')

  const budgetAlerts = Object.entries(config.budgets)
    .filter(([cat, budget]) => {
      const spent = summary.byCategory[cat] ?? 0
      return spent > budget * 0.8
    })
    .map(([cat, budget]) => {
      const spent = summary.byCategory[cat] ?? 0
      const pct = Math.round((spent / budget) * 100)
      return `${cat}: ${pct}% מהתקציב (₪${spent.toFixed(0)} מתוך ₪${budget})`
    })

  const cashTotal = cashEntries.reduce((s, e) => s + e.amount, 0)

  return `אתה יועץ פיננסי למשפחה ישראלית. נתח את נתוני ההוצאות הבאים ותן תובנות בעברית.

חודש: ${monthData.folder.name}
סה"כ הוצאות: ₪${summary.totalExpense.toFixed(0)}
סה"כ זיכויים: ₪${summary.totalIncome.toFixed(0)}
נטו: ₪${(summary.totalExpense - summary.totalIncome).toFixed(0)}
חוב תשלומים עתידי: ₪${summary.installmentsDebt.toFixed(0)}
הוצאות מזומן: ₪${cashTotal.toFixed(0)}
מספר עסקאות: ${summary.transactionCount}

הוצאות לפי קטגוריה:
${topCategories}

${budgetAlerts.length > 0 ? `התראות תקציב:\n${budgetAlerts.join('\n')}` : 'אין חריגות תקציב.'}

אנא ספק:
1. סיכום קצר (2-3 משפטים) של חודש ההוצאות
2. 3-4 תובנות ספציפיות (דפוסי הוצאה, אנומליות, השוואה לצפוי)
3. 2-3 המלצות קונקרטיות לחיסכון
4. הערכה כללית של הבריאות הפיננסית החודשית`
}

export function InsightsPage({ appData }: { appData: AppData }) {
  const { config, monthData, saveConfig } = appData
  const [apiKey, setApiKey] = useState(config.claudeApiKey ?? '')
  const [savingKey, setSavingKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [insight, setInsight] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSaveKey() {
    setSavingKey(true)
    await saveConfig({ ...config, claudeApiKey: apiKey })
    setSavingKey(false)
  }

  async function handleAnalyze() {
    if (!config.claudeApiKey) return
    setLoading(true)
    setError(null)
    setInsight(null)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.claudeApiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1500,
          messages: [{ role: 'user', content: buildPrompt(appData) }],
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? `HTTP ${res.status}`)
      }
      const data = await res.json()
      setInsight(data.content[0]?.text ?? '')
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-slate-200 text-xl font-bold mb-6">✨ תובנות AI</h1>

      {/* API key setup */}
      {!config.claudeApiKey && (
        <div className="bg-[#1a1d2e] border border-[#2d3148] rounded-xl p-5 mb-6">
          <p className="text-slate-400 text-sm mb-3">
            הזן את Claude API Key שלך. המפתח נשמר ב-Google Drive שלך בלבד.
          </p>
          <div className="flex gap-3">
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="flex-1 bg-[#0f1117] border border-[#2d3148] text-slate-200 px-3 py-2 rounded-lg text-sm"
            />
            <button
              onClick={handleSaveKey}
              disabled={savingKey || !apiKey}
              className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm"
            >
              {savingKey ? 'שומר...' : 'שמור'}
            </button>
          </div>
        </div>
      )}

      {config.claudeApiKey && (
        <div className="mb-6 flex items-center gap-3">
          <div className="text-green-400 text-sm">✓ API Key מוגדר</div>
          <button
            onClick={() => saveConfig({ ...config, claudeApiKey: '' })}
            className="text-xs text-slate-600 hover:text-slate-400"
          >
            שנה מפתח
          </button>
        </div>
      )}

      {/* Analyze button */}
      {monthData ? (
        <button
          onClick={handleAnalyze}
          disabled={loading || !config.claudeApiKey}
          className="mb-6 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              מנתח...
            </>
          ) : '✨ נתח את החודש'}
        </button>
      ) : (
        <p className="text-slate-500 mb-6">טען חודש קודם כדי לנתח</p>
      )}

      {/* Results */}
      {error && (
        <div className="p-4 bg-red-900/30 border border-red-700 text-red-300 rounded-xl text-sm mb-4">
          שגיאה: {error}
        </div>
      )}

      {insight && (
        <div className="bg-[#1a1d2e] border border-[#2d3148] rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-violet-400 font-semibold">ניתוח {monthData?.folder.name}</h2>
            <span className="text-slate-600 text-xs">
              {formatCurrency(computeSummary(monthData!.transactions).totalExpense)} סה״כ
            </span>
          </div>
          <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
            {insight}
          </div>
        </div>
      )}
    </div>
  )
}
