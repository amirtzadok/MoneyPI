import { useState, useMemo, useEffect } from 'react'
import { filterTransactions } from '../utils/filters'
import { formatCurrency, formatDate } from '../utils/formatters'
import { CategoryBadge } from '../components/CategoryBadge'
import { CATEGORIES } from '../parsers/types'
import type { Transaction } from '../parsers/types'
import type { useAppData } from '../hooks/useAppData'
type AppData = ReturnType<typeof useAppData>

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  credit: 'אשראי',
  debit: 'חיוב ישיר',
  standing_order: 'הוראת קבע',
  refund: 'זיכוי',
  cash: 'מזומן',
}

const INSURANCE_CATEGORIES = CATEGORIES.filter(c => c.includes('ביטוח'))

type SortCol = 'date' | 'description' | 'category' | 'paymentType' | 'installments' | 'amount' | 'cardNumber'
type SortDir = 'asc' | 'desc'

function sortTransactions(txs: Transaction[], col: SortCol, dir: SortDir): Transaction[] {
  return [...txs].sort((a, b) => {
    let cmp = 0
    if (col === 'date') cmp = a.date.localeCompare(b.date)
    else if (col === 'description') cmp = a.description.localeCompare(b.description)
    else if (col === 'category') cmp = a.category.localeCompare(b.category)
    else if (col === 'paymentType') cmp = a.paymentType.localeCompare(b.paymentType)
    else if (col === 'amount') cmp = a.amount - b.amount
    else if (col === 'cardNumber') cmp = a.cardNumber.localeCompare(b.cardNumber)
    else if (col === 'installments') {
      const ai = a.installments?.total ?? 0
      const bi = b.installments?.total ?? 0
      cmp = ai - bi
    }
    return dir === 'asc' ? cmp : -cmp
  })
}

interface Props {
  appData: AppData
  forcedCategory?: string | null
  onForcedCategoryConsumed?: () => void
}

export function TransactionsPage({ appData, forcedCategory, onForcedCategoryConsumed }: Props) {
  const { monthData, mappings, saveMappings } = appData
  const [search, setSearch] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedPaymentTypes, setSelectedPaymentTypes] = useState<string[]>([])
  const [minAmount, setMinAmount] = useState<string>('')
  const [maxAmount, setMaxAmount] = useState<string>('')
  const [categorizingId, setCategorizingId] = useState<string | null>(null)
  const [categoryOverride, setCategoryOverride] = useState<string>('')
  const [sortCol, setSortCol] = useState<SortCol>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  useEffect(() => {
    if (forcedCategory) {
      setSelectedCategories([forcedCategory])
      setSearch('')
      setSelectedPaymentTypes([])
      setMinAmount('')
      setMaxAmount('')
      onForcedCategoryConsumed?.()
    }
  }, [forcedCategory]) // eslint-disable-line

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

  const sorted = useMemo(() => sortTransactions(filtered, sortCol, sortDir), [filtered, sortCol, sortDir])

  const totalFiltered = useMemo(() =>
    filtered.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0),
    [filtered]
  )

  function handleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
  }

  function SortArrow({ col }: { col: SortCol }) {
    if (sortCol !== col) return <span className="text-slate-600 ml-1">↕</span>
    return <span className="text-violet-400 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

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

  function toggleInsurance() {
    const allSelected = INSURANCE_CATEGORIES.every(c => selectedCategories.includes(c))
    if (allSelected) {
      setSelectedCategories(prev => prev.filter(c => !INSURANCE_CATEGORIES.includes(c as typeof INSURANCE_CATEGORIES[number])))
    } else {
      setSelectedCategories(prev => [...new Set([...prev, ...INSURANCE_CATEGORIES])])
    }
  }

  async function handleCategoryAssign(description: string) {
    if (!categoryOverride) return
    const updated = { ...mappings, [description]: categoryOverride }
    await saveMappings(updated)
    setCategorizingId(null)
    setCategoryOverride('')
  }

  const hasFilters = search || selectedCategories.length > 0 || selectedPaymentTypes.length > 0 || minAmount || maxAmount
  const insuranceActive = INSURANCE_CATEGORIES.every(c => selectedCategories.includes(c))

  if (!monthData) {
    return <div className="text-white text-center mt-20">טען חודש כדי לראות עסקאות</div>
  }

  function Th({ col, label }: { col: SortCol; label: string }) {
    return (
      <th
        className="text-right p-3 text-white font-medium cursor-pointer hover:text-violet-300 select-none"
        onClick={() => handleSort(col)}
      >
        {label}<SortArrow col={col} />
      </th>
    )
  }

  return (
    <div className="flex gap-4">
      {/* Filter panel */}
      <div className="w-64 shrink-0 bg-[#1a1d2e] border border-[#2d3148] rounded-xl p-4 h-fit sticky top-4">
        <h2 className="text-slate-300 font-semibold mb-4">סינון</h2>

        {/* Search */}
        <div className="mb-4">
          <label className="text-white text-xs mb-1 block">חיפוש עסק</label>
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
          <label className="text-white text-xs mb-1 block">טווח סכום (₪)</label>
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
          <label className="text-white text-xs mb-2 block">סוג תשלום</label>
          <div className="flex flex-wrap gap-1">
            {Object.entries(PAYMENT_TYPE_LABELS).map(([pt, label]) => (
              <button
                key={pt}
                onClick={() => togglePaymentType(pt)}
                className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                  selectedPaymentTypes.includes(pt)
                    ? 'bg-violet-600 border-violet-600 text-white'
                    : 'border-[#2d3148] text-white hover:border-violet-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Quick filters */}
        <div className="mb-4">
          <label className="text-white text-xs mb-2 block">סינון מהיר</label>
          <button
            onClick={toggleInsurance}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors w-full text-right ${
              insuranceActive
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-[#2d3148] text-white hover:border-blue-500'
            }`}
          >
            🛡️ כל הביטוחים
          </button>
        </div>

        {/* Categories */}
        <div>
          <label className="text-white text-xs mb-2 block">קטגוריה</label>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {[...CATEGORIES].map(cat => (
              <label key={cat} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(cat)}
                  onChange={() => toggleCategory(cat)}
                  className="accent-violet-600"
                />
                <span className="text-white text-xs">{cat}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Clear filters */}
        {hasFilters && (
          <button
            onClick={() => {
              setSearch(''); setSelectedCategories([]); setSelectedPaymentTypes([])
              setMinAmount(''); setMaxAmount('')
            }}
            className="mt-4 w-full text-xs text-white hover:text-slate-300 border border-[#2d3148] rounded-lg py-1.5"
          >
            נקה סינונים
          </button>
        )}
      </div>

      {/* Results */}
      <div className="flex-1">
        <div className="flex justify-between items-center mb-3">
          <span className="text-white text-sm">{sorted.length} עסקאות</span>
          <span className="text-red-400 font-bold">{formatCurrency(totalFiltered)}</span>
        </div>

        <div className="bg-[#1a1d2e] rounded-xl border border-[#2d3148] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2d3148]">
                <Th col="date" label="תאריך" />
                <Th col="description" label="עסק" />
                <Th col="category" label="קטגוריה" />
                <Th col="paymentType" label="סוג" />
                <Th col="installments" label="תשלומים" />
                <Th col="amount" label="סכום" />
                <Th col="cardNumber" label="כרטיס" />
              </tr>
            </thead>
            <tbody>
              {sorted.map(t => (
                <tr key={t.id} className="border-b border-[#141620] hover:bg-[#1e2135]">
                  <td className="p-3 text-white whitespace-nowrap">{formatDate(t.date)}</td>
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
                          className="text-xs text-white px-1"
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
