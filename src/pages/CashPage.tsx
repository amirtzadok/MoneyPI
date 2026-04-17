import { useState } from 'react'
import { CATEGORIES } from '../parsers/types'
import { formatCurrency, formatDate } from '../utils/formatters'
import { CategoryBadge } from '../components/CategoryBadge'
import type { CashEntry } from '../drive/types'
import type { useAppData } from '../hooks/useAppData'
type AppData = ReturnType<typeof useAppData>

export function CashPage({ appData }: { appData: AppData }) {
  const { cashEntries, addCashEntry, deleteCashEntry } = appData
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<string>('מזון ותואלטיקה')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    const num = parseFloat(amount)
    if (isNaN(num) || num <= 0 || !date) return
    setSaving(true)
    const entry: CashEntry = {
      id: `cash-${Date.now()}`,
      date,
      amount: num,
      category,
      note,
    }
    await addCashEntry(entry)
    setAmount('')
    setNote('')
    setSaving(false)
  }

  const total = cashEntries.reduce((s, e) => s + e.amount, 0)

  return (
    <div className="max-w-2xl">
      <h1 className="text-slate-200 text-xl font-bold mb-6">רישום הוצאות מזומן</h1>

      {/* Add form */}
      <div className="bg-[#1a1d2e] border border-[#2d3148] rounded-xl p-5 mb-6">
        <h2 className="text-slate-400 text-sm font-medium mb-4">הוספת הוצאה</h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-slate-500 text-xs mb-1 block">תאריך</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-[#0f1117] border border-[#2d3148] text-slate-200 px-3 py-1.5 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="text-slate-500 text-xs mb-1 block">סכום (₪)</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              className="w-full bg-[#0f1117] border border-[#2d3148] text-slate-200 px-3 py-1.5 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="text-slate-500 text-xs mb-1 block">קטגוריה</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-[#0f1117] border border-[#2d3148] text-slate-200 px-3 py-1.5 rounded-lg text-sm"
            >
              {[...CATEGORIES].filter(c => c !== 'לא מסווג').map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-slate-500 text-xs mb-1 block">הערה</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="רשות..."
              className="w-full bg-[#0f1117] border border-[#2d3148] text-slate-200 px-3 py-1.5 rounded-lg text-sm"
            />
          </div>
        </div>
        <button
          onClick={handleAdd}
          disabled={saving || !amount || !date}
          className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm"
        >
          {saving ? 'שומר...' : '+ הוסף'}
        </button>
      </div>

      {/* Entries list */}
      {cashEntries.length > 0 ? (
        <div className="bg-[#1a1d2e] border border-[#2d3148] rounded-xl overflow-hidden">
          <div className="flex justify-between items-center p-3 border-b border-[#2d3148]">
            <span className="text-slate-500 text-sm">{cashEntries.length} רשומות</span>
            <span className="text-red-400 font-bold">{formatCurrency(total)}</span>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {[...cashEntries].sort((a, b) => b.date.localeCompare(a.date)).map(e => (
                <tr key={e.id} className="border-b border-[#141620] hover:bg-[#1e2135]">
                  <td className="p-3 text-slate-400">{formatDate(e.date)}</td>
                  <td className="p-3"><CategoryBadge category={e.category} /></td>
                  <td className="p-3 text-slate-300">{e.note || '—'}</td>
                  <td className="p-3 text-red-400 font-bold">{formatCurrency(e.amount)}</td>
                  <td className="p-3">
                    <button
                      onClick={() => deleteCashEntry(e.id)}
                      className="text-slate-600 hover:text-red-400 text-xs"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-slate-600 text-center">אין רשומות עדיין</p>
      )}
    </div>
  )
}
