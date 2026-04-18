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
  if (!monthData) return 'אתה יועץ פיננסי. אין נתוני חודש טעונים כרגע.'

  const summary = computeSummary(monthData.transactions)
  const categories = Object.entries(summary.byCategory)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, amt]) => `  ${cat}: ₪${amt.toFixed(2)}`)
    .join('\n')

  const transactions = monthData.transactions
    .slice(0, 200)
    .map(t => `  ${t.date} | ${t.description} | ${t.category} | ₪${t.amount.toFixed(2)} | ${t.cardNumber}`)
    .join('\n')

  const budgetLines = Object.entries(config.budgets)
    .filter(([, v]) => v > 0)
    .map(([cat, budget]) => {
      const spent = summary.byCategory[cat] ?? 0
      return `  ${cat}: ₪${spent.toFixed(0)} מתוך ₪${budget}`
    }).join('\n')

  const cashTotal = cashEntries.reduce((s, e) => s + e.amount, 0)

  return `אתה יועץ פיננסי אישי למשפחה ישראלית. ענה תמיד בעברית. היה ספציפי עם מספרים ותן עצות מעשיות.

=== ${monthData.folder.name} ===
סה"כ הוצאות: ₪${summary.totalExpense.toFixed(2)}
סה"כ הכנסות: ₪${summary.totalIncome.toFixed(2)}
נטו: ₪${(summary.totalExpense - summary.totalIncome).toFixed(2)}
חוב תשלומים: ₪${summary.installmentsDebt.toFixed(2)}
מזומן: ₪${cashTotal.toFixed(2)}

קטגוריות:
${categories}

${budgetLines ? `תקציב:\n${budgetLines}` : ''}

עסקאות:
${transactions}`
}

const QUICK = ['נתח את החודש', 'כמה על ביטוחים?', 'איך לחסוך?', 'ההוצאה הגדולה?']

export function FloatingChat({ appData }: { appData: AppData }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const hasKey = !!appData.config.claudeApiKey

  async function sendMessage(text: string) {
    if (!text.trim() || !hasKey) return
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
          'x-api-key': appData.config.claudeApiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          system: buildSystemPrompt(appData),
          messages: newMessages,
        }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message ?? `HTTP ${res.status}`) }
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.content[0]?.text ?? '' }])
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start">
      {/* Chat panel */}
      {open && (
        <div className="mb-3 w-80 sm:w-96 bg-[#1a1d2e] border border-[#2d3148] rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ height: 480 }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2d3148] bg-[#12152a]">
            <span className="text-white font-semibold text-sm">✨ יועץ פיננסי AI</span>
            <div className="flex gap-2">
              {messages.length > 0 && (
                <button onClick={() => setMessages([])} className="text-slate-500 hover:text-white text-xs">נקה</button>
              )}
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white text-lg leading-none">×</button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {!hasKey && (
              <div className="text-center text-white text-xs mt-4 px-2">
                הגדר Claude API Key בלשונית ה-AI כדי להשתמש בצ'אט
              </div>
            )}
            {hasKey && messages.length === 0 && (
              <>
                <p className="text-slate-600 text-xs text-center mt-2">
                  {appData.monthData ? `שאל על ${appData.monthData.folder.name}` : 'טען חודש כדי לשאול שאלות'}
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center mt-3">
                  {QUICK.map(q => (
                    <button key={q} onClick={() => sendMessage(q)}
                      className="text-xs bg-[#0f1117] border border-[#2d3148] text-white px-2.5 py-1 rounded-full hover:border-violet-500">
                      {q}
                    </button>
                  ))}
                </div>
              </>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user' ? 'bg-violet-600 text-white' : 'bg-[#0f1117] text-slate-200 border border-[#2d3148]'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-end">
                <div className="bg-[#0f1117] border border-[#2d3148] rounded-xl px-3 py-2">
                  <span className="flex gap-1">
                    {[0, 150, 300].map(d => (
                      <span key={d} className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </span>
                </div>
              </div>
            )}
            {error && <p className="text-red-400 text-xs text-center">{error}</p>}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          {hasKey && (
            <div className="flex gap-2 p-3 border-t border-[#2d3148]">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="שאל שאלה... (Enter לשליחה)"
                rows={1}
                className="flex-1 bg-[#0f1117] border border-[#2d3148] text-slate-200 px-3 py-2 rounded-lg text-xs placeholder:text-slate-600 resize-none focus:border-violet-500 outline-none"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={loading || !input.trim()}
                className="bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white px-3 rounded-lg text-sm"
              >
                ➤
              </button>
            </div>
          )}
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-12 h-12 bg-violet-600 hover:bg-violet-700 text-white rounded-full shadow-lg flex items-center justify-center text-xl transition-transform hover:scale-105"
      >
        {open ? '×' : '✨'}
      </button>
    </div>
  )
}
