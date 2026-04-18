import { useState, useMemo } from 'react'
import { filterTransactions } from '../utils/filters'
import { formatCurrency, formatDate } from '../utils/formatters'
import { CategoryBadge } from '../components/CategoryBadge'
import { CATEGORIES } from '../parsers/types'
import type { useAppData } from '../hooks/useAppData'
type AppData = ReturnType<typeof useAppData>

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  credit: 'אשראי',
  debit: 'חיוב ישיר',
  standing_order: 'הוראת קבע',
  refund: 'זיכוי',
  cash: 'מזומן',
}

export function TransactionsPage({ appData }: { appData: AppData }) {
  const { monthData, mappings, saveMappings } = appData
  const [search, setSearch] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedPaymentTypes, setSelectedPaymentTypes] = useState<string[]>([])
  const [minAmount, setMinAmount] = useState<string>('')
  const [maxAmount, setMaxAmount] = useState<string>('')
  const [categorizingId, setCategorizingId] = useState<string | null>(null)
  const [categoryOverride, setCategoryOverride] = useState<string>('')

  const allTransactions = useMemo(() => {
    if (!monthData) return []
    return monthData.transactions
  }, [monthData])

  const filtered = useMemo(() => filterTransactions(allTransactions, {
    categories: selectedCategories,
    search,
    paymentTypes: selectedPaymentTypes,
    minAmount: minAmount ? parseFloat(minAmount) : null,
    maxAmount: maxAmount ? parseFloat(maxAmount) : null,
  }), [allTransactions, search, selectedCategories, selectedPaymentTypes, minAmount, maxAmount])

  const totalFiltered = useMemo(() =>
    filtered.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0),
    [filtered]
  )

  function toggleCategory(cat: string) {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  function togglePaymentType(pt: string) {
    setSelectedPaymentTypes(prev =>
      prev.includes(pt) ? prev.filter(p => p !== pt) : [...prev, pt]
    )
  }

  async function handleCategoryAssign(description: string) {
    if (!categoryOverride) return
    const updated = { ...mappings, [description]: categoryOverride }
    await saveMappings(updated)
    setCategorizingId(null)
    setCategoryOverride('')
  }

  if (!monthData) {
    return <div className="text-slate-500 text-center mt-20">טען חודש כדי לראות עסקאות</div>
  }

  return (
    <div className="flex gap-4">
      {/* Filter panel */}
      <div className="w-64 shrink-0 bg-[#1a1d2e] border border-[#2d3148] rounded-xl p-4 h-fit sticky top-4">
        <h2 className="text-slate-300 font-semibold mb-4">סינון</h2>

        {/* Search */}
        <div className="mb-4">
          <label className="text-slate-400 text-xs mb-1 block">חיפוש עסק</label>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="שם עסק..."
            className="w-full bg-[#0f1117] border border-[#2d3148] text-slate-200 px-3 py-1.5 rounded-lg text-sm placeholder:text-slate-600"
          />
        </div>

        {/* Amount range */}
        <div className="mb-4">
          <label className="text-slate-400 text-xs mb-1 block">טווח סכום (₪)</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={minAmount}
              onChange={e => setMinAmount(e.target.value)}
              placeholder="מינ׳"
              className="w-full bg-[#0f1117] border border-[#2d3148] text-slate-200 px-2 py-1.5 rounded-lg text-sm placeholder:text-slate-600"
            />
            <input
              type="number"
              value={maxAmount}
              onChange={e => setMaxAmount(e.target.value)}
              placeholder="מקס׳"
              className="w-full bg-[#0f1117] border border-[#2d3148] text-slate-200 px-2 py-1.5 rounded-lg text-sm placeholder:text-slate-600"
            />
          </div>
        </div>

        {/* Payment types */}
        <div className="mb-4">
          <label className="text-slate-400 text-xs mb-2 block">סוג תשלום</label>
          <div className="flex flex-wrap gap-1">
            {Object.entries(PAYMENT_TYPE_LABELS).map(([pt, label]) => (
              <button
                key={pt}
                onClick={() => togglePaymentType(pt)}
                className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                  selectedPaymentTypes.includes(pt)
                    ? 'bg-violet-600 border-violet-600 text-white'
                    : 'border-[#2d3148] text-slate-400 hover:border-violet-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div>
          <label className="text-slate-400 text-xs mb-2 block">קטגוריה</label>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {[...CATEGORIES].map(cat => (
              <label key={cat} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(cat)}
                  onChange={() => toggleCategory(cat)}
                  className="accent-violet-600"
                />
                <span className="text-slate-400 text-xs">{cat}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Clear filters */}
        {(search || selectedCategories.length > 0 || selectedPaymentTypes.length > 0 || minAmount || maxAmount) && (
          <button
            onClick={() => {
              setSearch(''); setSelectedCategories([]); setSelectedPaymentTypes([])
              setMinAmount(''); setMaxAmount('')
            }}
            className="mt-4 w-full text-xs text-slate-500 hover:text-slate-300 border border-[#2d3148] rounded-lg py-1.5"
          >
            נקה סינונים
          </button>
        )}
      </div>

      {/* Results */}
      <div className="flex-1">
        <div className="flex justify-between items-center mb-3">
          <span className="text-slate-400 text-sm">{filtered.length} עסקאות</span>
          <span className="text-red-400 font-bold">{formatCurrency(totalFiltered)}</span>
        </div>

        <div className="bg-[#1a1d2e] rounded-xl border border-[#2d3148] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2d3148]">
                <th className="text-right p-3 text-slate-500 font-medium">תאריך</th>
                <th className="text-right p-3 text-slate-500 font-medium">עסק</th>
                <th className="text-right p-3 text-slate-500 font-medium">קטגוריה</th>
                <th className="text-right p-3 text-slate-500 font-medium">סוג</th>
                <th className="text-right p-3 text-slate-500 font-medium">תשלומים</th>
                <th className="text-right p-3 text-slate-500 font-medium">סכום</th>
                <th className="text-right p-3 text-slate-500 font-medium">כרטיס</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} className="border-b border-[#141620] hover:bg-[#1e2135]">
                  <td className="p-3 text-slate-400 whitespace-nowrap">{formatDate(t.date)}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span>{t.description}</span>
                      {t.category === 'לא מסווג' && (
                        <button
                          onClick={() => { setCategorizingId(t.id); setCategoryOverride('') }}
                          className="text-xs bg-amber-900/40 text-amber-400 px-2 py-0.5 rounded-full hover:bg-amber-900/60"
                        >
                          סווג
                        </button>
                      )}
                    </div>
                    {/* Category assignment modal inline */}
                    {categorizingId === t.id && (
                      <div className="mt-2 flex gap-2">
                        <select
                          value={categoryOverride}
                          onChange={e => setCategoryOverride(e.target.value)}
                          className="flex-1 bg-[#0f1117] border border-[#2d3148] text-slate-200 px-2 py-1 rounded text-xs"
                        >
                          <option value="">בחר קטגוריה</option>
                          {[...CATEGORIES].filter(c => c !== 'לא מסווג').map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleCategoryAssign(t.description)}
                          className="text-xs bg-violet-600 text-white px-2 py-1 rounded"
                        >
                          שמור
                        </button>
                        <button
                          onClick={() => setCategorizingId(null)}
                          className="text-xs text-slate-500 px-1"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="p-3"><CategoryBadge category={t.category} /></td>
                  <td className="p-3 text-white text-xs">{PAYMENT_TYPE_LABELS[t.paymentType] ?? t.paymentType}</td>
                  <td className="p-3 text-white text-xs">
                    {t.installments ? `${t.installments.current}/${t.installments.total}` : '—'}
                  </td>
                  <td className={`p-3 font-bold ${t.amount < 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(t.amount)}
                  </td>
                  <td className="p-3 text-white">{t.cardNumber}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
