import { useState, useRef, useEffect, useCallback } from 'react'
import { computeSummary } from '../utils/summary'
import { useAuth } from '../auth/useAuth'
import { DriveClient } from '../drive/driveClient'
import type { useAppData } from '../hooks/useAppData'
type AppData = ReturnType<typeof useAppData>

interface ImageAttachment {
  base64: string
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
  name: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  image?: ImageAttachment
}

interface SavedChat {
  id: string
  name: string
}

interface ChatFile {
  messages: Message[]
  savedAt: string
  monthName: string
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

function toApiMessages(messages: Message[]) {
  return messages.map(m => {
    if (m.image) {
      return {
        role: m.role,
        content: [
          { type: 'image', source: { type: 'base64', media_type: m.image.mediaType, data: m.image.base64 } },
          ...(m.content ? [{ type: 'text', text: m.content }] : []),
        ],
      }
    }
    return { role: m.role, content: m.content }
  })
}

const QUICK_QUESTIONS = [
  'נתח את החודש שלי',
  'כמה הוצאתי על ביטוחים?',
  'איך אני יכול לחסוך כסף?',
  'מה ההוצאה הגדולה ביותר שלי?',
]

export function InsightsPage({ appData }: { appData: AppData }) {
  const { accessToken } = useAuth()
  const { config, monthData, saveConfig } = appData
  const [apiKey, setApiKey] = useState(config.claudeApiKey ?? '')
  const [savingKey, setSavingKey] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attachedImage, setAttachedImage] = useState<ImageAttachment | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [savedChats, setSavedChats] = useState<SavedChat[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const getChatsFolderId = useCallback(async (client: DriveClient) => {
    const expensesId = await client.ensureFolder('Expenses')
    return client.ensureFolder('ai-chats', expensesId)
  }, [])

  async function handleSaveKey() {
    setSavingKey(true)
    await saveConfig({ ...config, claudeApiKey: apiKey })
    setSavingKey(false)
  }

  function handleImageFile(file: File) {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1]
      setAttachedImage({ base64, mediaType: file.type as ImageAttachment['mediaType'], name: file.name })
    }
    reader.readAsDataURL(file)
  }

  async function sendMessage(text: string, img?: ImageAttachment) {
    const content = text.trim()
    if (!content && !img) return
    if (!config.claudeApiKey || !monthData) return
    setError(null)

    const userMsg: Message = { role: 'user', content, ...(img ? { image: img } : {}) }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setAttachedImage(null)
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
          messages: toApiMessages(newMessages),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? `HTTP ${res.status}`)
      }
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.content[0]?.text ?? '' }])
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input, attachedImage ?? undefined)
    }
  }

  async function saveChat() {
    if (!accessToken || messages.length === 0) return
    setSaving(true)
    try {
      const client = new DriveClient(accessToken)
      const folderId = await getChatsFolderId(client)
      const now = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      const filename = `chat_${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.json`
      const chatData: ChatFile = { messages, savedAt: now.toISOString(), monthName: monthData?.folder.name ?? '' }
      await client.writeJson(folderId, filename, chatData)
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  async function loadHistory() {
    if (!accessToken) return
    setHistoryLoading(true)
    try {
      const client = new DriveClient(accessToken)
      const folderId = await getChatsFolderId(client)
      const files = await client.listFiles(folderId)
      setSavedChats(
        files
          .filter(f => f.name.endsWith('.json'))
          .sort((a, b) => b.name.localeCompare(a.name))
          .map(f => ({ id: f.id, name: f.name.replace('.json', '').replace('chat_', '') }))
      )
    } catch {
      setSavedChats([])
    } finally {
      setHistoryLoading(false)
    }
  }

  async function loadChat(fileId: string) {
    if (!accessToken) return
    try {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      if (!res.ok) return
      const data: ChatFile = await res.json()
      setMessages(data.messages)
      setShowHistory(false)
    } catch (e) {
      setError(String(e))
    }
  }

  function openHistory() {
    setShowHistory(true)
    loadHistory()
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
        <div className="mb-3 flex items-center gap-3 flex-wrap">
          <div className="text-green-400 text-sm">✓ API Key מוגדר</div>
          <button onClick={() => saveConfig({ ...config, claudeApiKey: '' })} className="text-xs text-slate-600 hover:text-white">
            שנה מפתח
          </button>
          {messages.length > 0 && (
            <>
              <button
                onClick={saveChat}
                disabled={saving}
                className="text-xs text-slate-400 hover:text-white disabled:opacity-40 mr-auto"
              >
                {saving ? 'שומר...' : '💾 שמור שיחה'}
              </button>
              <button onClick={() => setMessages([])} className="text-xs text-slate-600 hover:text-white">
                נקה שיחה
              </button>
            </>
          )}
          <button onClick={openHistory} className="text-xs text-slate-400 hover:text-white">
            📂 שיחות קודמות
          </button>
        </div>
      )}

      {/* History panel */}
      {showHistory && (
        <div className="mb-4 bg-[#1a1d2e] border border-[#2d3148] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white text-sm font-semibold">📂 שיחות שמורות</span>
            <button onClick={() => setShowHistory(false)} className="text-slate-500 hover:text-white text-sm">×</button>
          </div>
          {historyLoading && <p className="text-slate-500 text-xs text-center py-2">טוען...</p>}
          {!historyLoading && savedChats.length === 0 && (
            <p className="text-slate-500 text-xs text-center py-2">אין שיחות שמורות</p>
          )}
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {savedChats.map(chat => (
              <button
                key={chat.id}
                onClick={() => loadChat(chat.id)}
                className="w-full text-right text-xs text-slate-300 bg-[#0f1117] border border-[#2d3148] hover:border-violet-500 px-3 py-2 rounded-lg"
              >
                {chat.name.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      {!monthData && <p className="text-white mb-4">טען חודש כדי לשאול שאלות</p>}

      {canChat && (
        <>
          {messages.length === 0 && (
            <div className="mb-4">
              <p className="text-slate-500 text-xs mb-2">שאלות מהירות:</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_QUESTIONS.map(q => (
                  <button key={q} onClick={() => sendMessage(q)}
                    className="text-xs bg-[#1a1d2e] border border-[#2d3148] text-white px-3 py-1.5 rounded-full hover:border-violet-500 transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto bg-[#1a1d2e] border border-[#2d3148] rounded-xl p-4 space-y-4 mb-4">
            {messages.length === 0 && (
              <p className="text-slate-600 text-sm text-center mt-8">
                שאל אותי כל שאלה על ההוצאות של {monthData.folder.name}
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user' ? 'bg-violet-600 text-white' : 'bg-[#0f1117] text-slate-200 border border-[#2d3148]'
                }`}>
                  {m.image && (
                    <img
                      src={`data:${m.image.mediaType};base64,${m.image.base64}`}
                      alt={m.image.name}
                      className="rounded mb-2 max-w-full max-h-48 object-contain"
                    />
                  )}
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-end">
                <div className="bg-[#0f1117] border border-[#2d3148] rounded-xl px-4 py-3">
                  <span className="flex gap-1">
                    {[0, 150, 300].map(d => (
                      <span key={d} className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {error && (
            <div className="p-3 bg-red-900/30 border border-red-700 text-red-300 rounded-xl text-sm mb-3">
              שגיאה: {error}
            </div>
          )}

          {attachedImage && (
            <div className="flex items-center gap-2 bg-[#1a1d2e] border border-[#2d3148] rounded-lg px-3 py-2 mb-2">
              <img
                src={`data:${attachedImage.mediaType};base64,${attachedImage.base64}`}
                alt={attachedImage.name}
                className="h-10 w-10 object-cover rounded"
              />
              <span className="text-slate-400 text-xs flex-1 truncate">{attachedImage.name}</span>
              <button onClick={() => setAttachedImage(null)} className="text-slate-500 hover:text-white">×</button>
            </div>
          )}

          <div className="flex gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = '' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              title="צרף תמונה"
              className="text-slate-400 hover:text-white text-xl px-1 self-end pb-2"
            >
              📎
            </button>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="שאל שאלה על ההוצאות שלך... (Enter לשליחה)"
              rows={2}
              className="flex-1 bg-[#1a1d2e] border border-[#2d3148] text-slate-200 px-4 py-3 rounded-xl text-sm placeholder:text-slate-600 resize-none focus:border-violet-500 outline-none"
            />
            <button
              onClick={() => sendMessage(input, attachedImage ?? undefined)}
              disabled={loading || (!input.trim() && !attachedImage)}
              className="bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white px-5 rounded-xl font-medium self-end"
            >
              ➤
            </button>
          </div>
        </>
      )}
    </div>
  )
}
