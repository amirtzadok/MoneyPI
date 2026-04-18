import { useState, useRef, useEffect } from 'react'
import { computeSummary } from '../utils/summary'
import type { useAppData } from '../hooks/useAppData'
type AppData = ReturnType<typeof useAppData>

interface Message {
  role: 'user' | 'assistant'
  content: string
}

function buildSystemPrompt(appData: AppData): string {
  const { monthData, config, cashEntries } = appData
  if (!monthData) return ''

  const summary = computeSummary(monthData.transactions)

  const allCategories = Object.entries(summary.byCategory)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, amount]) => `  ${cat}: ₪${amount.toFixed(2)}`)
    .join('\n')

  const transactions = monthData.transactions
    .slice(0, 200)
    .map(t => `  ${t.date} | ${t.description} | ${t.category} | ₪${t.amount.toFixed(2)} | כרטיס: ${t.cardNumber}`)
    .join('\n')

  const budgetLines = Object.entries(config.budgets)
    .filter(([, v]) => v > 0)
    .map(([cat, budget]) => {
      const spent = summary.byCategory[cat] ?? 0
      const pct = Math.round((spent / budget) * 100)
      return `  ${cat}: הוצאה ₪${spent.toFixed(0)} מתוך תקציב ₪${budget} (${pct}%)`
    }).join('\n')

  const cashTotal = cashEntries.reduce((s, e) => s + e.amount, 0)

  return `אתה יועץ פיננסי אישי למשפחה ישראלית. יש לך גישה לנתוני ההוצאות המלאים של החודש.
ענה תמיד בעברית. היה ספציפי עם מספרים. תן עצות מעשיות וישירות.

=== נתוני ${monthData.folder.name} ===

סיכום:
  סה"כ הוצאות: ₪${summary.totalExpense.toFixed(2)}
  סה"כ זיכויים/הכנסות: ₪${summary.totalIncome.toFixed(2)}
  נטו: ₪${(summary.totalExpense - summary.totalIncome).toFixed(2)}
  חוב תשלומים עתידי: ₪${summary.installmentsDebt.toFixed(2)}
  הוצאות מזומן: ₪${cashTotal.toFixed(2)}
  מספר עסקאות: ${summary.transactionCount}

הוצאות לפי קטגוריה:
${allCategories}

${budgetLines ? `תקציב:\n${budgetLines}` : ''}

רשימת עסקאות מלאה:
${transactions}
`
}

const QUICK_QUESTIONS = [
  'נתח את החודש שלי',
  'כמה הוצאתי על ביטוחים?',
  'איך אני יכול לחסוך כסף?',
  'מה ההוצאה הגדולה ביותר שלי?',
]

export function InsightsPage({ appData }: { appData: AppData }) {
  const { config, monthData, saveConfig } = appData
  const [apiKey, setApiKey] = useState(config.claudeApiKey ?? '')
  const [savingKey, setSavingKey] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function handleSaveKey() {
    setSavingKey(true)
    await saveConfig({ ...config, claudeApiKey: apiKey })
    setSavingKey(false)
  }

  async function sendMessage(text: string) {
    if (!text.trim() || !config.claudeApiKey || !monthData) return
    setError(null)

    const userMsg: Message = { role: 'user', content: text.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

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
          system: buildSystemPrompt(appData),
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? `HTTP ${res.status}`)
      }
      const data = await res.json()
      const reply = data.content[0]?.text ?? ''
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const canChat = !!config.claudeApiKey && !!monthData

  return (
    <div className="max-w-3xl flex flex-col h-[calc(100vh-120px)]">
      <h1 className="text-slate-200 text-xl font-bold mb-4">✨ שאל את ה-AI</h1>

      {/* API key setup */}
      {!config.claudeApiKey && (
        <div className="bg-[#1a1d2e] border border-[#2d3148] rounded-xl p-5 mb-4">
          <p className="text-white text-sm mb-3">
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
        <div className="mb-3 flex items-center gap-3">
          <div className="text-green-400 text-sm">✓ API Key מוגדר</div>
          <button
            onClick={() => saveConfig({ ...config, claudeApiKey: '' })}
            className="text-xs text-slate-600 hover:text-white"
          >
            שנה מפתח
          </button>
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="text-xs text-slate-600 hover:text-white mr-auto"
            >
              נקה שיחה
            </button>
          )}
        </div>
      )}

      {!monthData && (
        <p className="text-white mb-4">טען חודש כדי לשאול שאלות</p>
      )}

      {/* Chat area */}
      {canChat && (
        <>
          {/* Quick questions */}
          {messages.length === 0 && (
            <div className="mb-4">
              <p className="text-slate-500 text-xs mb-2">שאלות מהירות:</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_QUESTIONS.map(q => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-xs bg-[#1a1d2e] border border-[#2d3148] text-white px-3 py-1.5 rounded-full hover:border-violet-500 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-[#1a1d2e] border border-[#2d3148] rounded-xl p-4 space-y-4 mb-4">
            {messages.length === 0 && (
              <p className="text-slate-600 text-sm text-center mt-8">
                שאל אותי כל שאלה על ההוצאות של {monthData.folder.name}
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-violet-600 text-white'
                    : 'bg-[#0f1117] text-slate-200 border border-[#2d3148]'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-end">
                <div className="bg-[#0f1117] border border-[#2d3148] rounded-xl px-4 py-3">
                  <span className="flex gap-1">
                    <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-700 text-red-300 rounded-xl text-sm mb-3">
              שגיאה: {error}
            </div>
          )}

          {/* Input */}
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="שאל שאלה על ההוצאות שלך... (Enter לשליחה)"
              rows={2}
              className="flex-1 bg-[#1a1d2e] border border-[#2d3148] text-slate-200 px-4 py-3 rounded-xl text-sm placeholder:text-slate-600 resize-none focus:border-violet-500 outline-none"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              className="bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white px-5 rounded-xl font-medium"
            >
              ➤
            </button>
          </div>
        </>
      )}
    </div>
  )
}
