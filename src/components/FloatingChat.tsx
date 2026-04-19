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

const QUICK = ['נתח את החודש', 'כמה על ביטוחים?', 'איך לחסוך?', 'ההוצאה הגדולה?']

export function FloatingChat({ appData }: { appData: AppData }) {
  const { accessToken } = useAuth()
  const [open, setOpen] = useState(false)
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
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const hasKey = !!appData.config.claudeApiKey

  const getChatsFolderId = useCallback(async (client: DriveClient) => {
    const expensesId = await client.ensureFolder('Expenses')
    return client.ensureFolder('ai-chats', expensesId)
  }, [])

  async function sendMessage(text: string, img?: ImageAttachment) {
    const content = text.trim()
    if (!content && !img) return
    if (!hasKey) return
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
          'x-api-key': appData.config.claudeApiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          system: buildSystemPrompt(appData),
          messages: toApiMessages(newMessages),
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input, attachedImage ?? undefined)
    }
  }

  function handleImageFile(file: File) {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1]
      const mediaType = file.type as ImageAttachment['mediaType']
      setAttachedImage({ base64, mediaType, name: file.name })
    }
    reader.readAsDataURL(file)
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
      const chatData: ChatFile = {
        messages,
        savedAt: now.toISOString(),
        monthName: appData.monthData?.folder.name ?? '',
      }
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

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start">
      {open && (
        <div className="mb-3 w-80 sm:w-96 bg-[#1a1d2e] border border-[#2d3148] rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ height: 500 }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2d3148] bg-[#12152a]">
            <span className="text-white font-semibold text-sm">✨ יועץ פיננסי AI</span>
            <div className="flex gap-2 items-center">
              {messages.length > 0 && (
                <>
                  <button
                    onClick={saveChat}
                    disabled={saving}
                    title="שמור שיחה"
                    className="text-slate-400 hover:text-white text-sm disabled:opacity-40"
                  >
                    {saving ? '...' : '💾'}
                  </button>
                  <button onClick={() => setMessages([])} className="text-slate-500 hover:text-white text-xs">נקה</button>
                </>
              )}
              <button onClick={openHistory} title="שיחות קודמות" className="text-slate-400 hover:text-white text-sm">📂</button>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white text-lg leading-none">×</button>
            </div>
          </div>

          {/* History overlay */}
          {showHistory && (
            <div className="absolute inset-0 bg-[#1a1d2e] z-10 flex flex-col rounded-2xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#2d3148] bg-[#12152a]">
                <span className="text-white font-semibold text-sm">📂 שיחות שמורות</span>
                <button onClick={() => setShowHistory(false)} className="text-slate-500 hover:text-white text-lg leading-none">×</button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {historyLoading && <p className="text-slate-500 text-xs text-center mt-4">טוען...</p>}
                {!historyLoading && savedChats.length === 0 && (
                  <p className="text-slate-500 text-xs text-center mt-4">אין שיחות שמורות</p>
                )}
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
                  {m.image && (
                    <img
                      src={`data:${m.image.mediaType};base64,${m.image.base64}`}
                      alt={m.image.name}
                      className="rounded mb-1 max-w-full max-h-32 object-contain"
                    />
                  )}
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
            <div className="flex flex-col gap-1 p-3 border-t border-[#2d3148]">
              {attachedImage && (
                <div className="flex items-center gap-2 bg-[#0f1117] border border-[#2d3148] rounded-lg px-2 py-1">
                  <img
                    src={`data:${attachedImage.mediaType};base64,${attachedImage.base64}`}
                    alt={attachedImage.name}
                    className="h-8 w-8 object-cover rounded"
                  />
                  <span className="text-slate-400 text-xs flex-1 truncate">{attachedImage.name}</span>
                  <button onClick={() => setAttachedImage(null)} className="text-slate-500 hover:text-white text-sm">×</button>
                </div>
              )}
              <div className="flex gap-2">
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
                  className="text-slate-400 hover:text-white text-lg px-1"
                >
                  📎
                </button>
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
                  onClick={() => sendMessage(input, attachedImage ?? undefined)}
                  disabled={loading || (!input.trim() && !attachedImage)}
                  className="bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white px-3 rounded-lg text-sm"
                >
                  ➤
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        className="w-12 h-12 bg-violet-600 hover:bg-violet-700 text-white rounded-full shadow-lg flex items-center justify-center text-xl transition-transform hover:scale-105"
      >
        {open ? '×' : '✨'}
      </button>
    </div>
  )
}
