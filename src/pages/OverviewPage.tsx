import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { computeSummary } from '../utils/summary'
import { formatCurrency, formatDate, CATEGORY_COLORS } from '../utils/formatters'
import { CategoryBadge } from '../components/CategoryBadge'
import type { useAppData } from '../hooks/useAppData'
type AppData = ReturnType<typeof useAppData>

type CardFilter = 'expenses' | 'income' | 'net' | 'installments'

interface SummaryCardProps {
  label: string
  value: string
  sub?: string
  color?: string
  active?: boolean
  onClick?: () => void
}

function SummaryCard({ label, value, sub, color = 'text-slate-200', active, onClick }: SummaryCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-[#1a1d2e] border rounded-xl p-5 transition-colors ${
        onClick ? 'cursor-pointer hover:border-violet-500' : ''
      } ${active ? 'border-violet-500' : 'border-[#2d3148]'}`}
    >
      <p className="text-white text-sm mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-white text-xs mt-1">{sub}</p>}
    </div>
  )
}

function BudgetBar({ category, spent, budget }: { category: string; spent: number; budget: number }) {
  const pct = Math.min((spent / budget) * 100, 100)
  const color = pct >= 95 ? 'bg-red-500' : pct >= 80 ? 'bg-yellow-500' : 'bg-green-500'
  const textColor = pct >= 95 ? 'text-red-400' : pct >= 80 ? 'text-yellow-400' : 'text-green-400'
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1 text-sm">
        <CategoryBadge category={category} />
        <span className={textColor}>{formatCurrency(spent)} / {formatCurrency(budget)}</span>
      </div>
      <div className="h-2 bg-[#2d3148] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function OverviewPage({ appData }: { appData: AppData }) {
  const { monthData, config } = appData
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedCard, setSelectedCard] = useState<CardFilter | null>(null)

  function selectCard(card: CardFilter) {
    setSelectedCard(prev => prev === card ? null : card)
    setSelectedCategory(null)
  }

  function selectCategory(name: string) {
    setSelectedCategory(prev => prev === name ? null : name)
    setSelectedCard(null)
  }

  const summary = useMemo(() => computeSummary(monthData?.transactions ?? []), [monthData])

  const pieData = useMemo(() =>
    Object.entries(summary.byCategory)
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 12)
      .map(([name, value]) => ({ name, value: Math.round(value) })),
    [summary]
  )

  const budgetCategories = Object.entries(config.budgets).filter(([, v]) => v > 0)

  const categoryTransactions = useMemo(() => {
    if (!selectedCategory || !monthData) return []
    return monthData.transactions.filter(t => t.category === selectedCategory)
  }, [selectedCategory, monthData])

  const cardTransactions = useMemo(() => {
    if (!selectedCard || !monthData) return []
    const txs = monthData.transactions
    if (selectedCard === 'expenses') return txs.filter(t => t.amount > 0)
    if (selectedCard === 'income') return txs.filter(t => t.amount < 0)
    if (selectedCard === 'net') return txs
    if (selectedCard === 'installments') return txs.filter(t => t.installments)
    return []
  }, [selectedCard, monthData])

  const CARD_LABELS: Record<CardFilter, string> = {
    expenses: 'סה״כ הוצאות',
    income: 'סה״כ זיכויים',
    net: 'כל העסקאות',
    installments: 'חוב תשלומים עתידי',
  }

  if (!monthData) {
    return (
      <div className="text-center text-white mt-20">
        <p className="text-4xl mb-4">📊</p>
        <p>בחר חודש ולחץ "טען נתונים"</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="סה״כ הוצאות" value={formatCurrency(summary.totalExpense)} color="text-red-400" active={selectedCard === 'expenses'} onClick={() => selectCard('expenses')} />
        <SummaryCard label="סה״כ זיכויים" value={formatCurrency(summary.totalIncome)} color="text-green-400" active={selectedCard === 'income'} onClick={() => selectCard('income')} />
        <SummaryCard label="נטו" value={formatCurrency(summary.totalExpense - summary.totalIncome)} color="text-slate-200" active={selectedCard === 'net'} onClick={() => selectCard('net')} />
        <SummaryCard label="חוב תשלומים עתידי" value={formatCurrency(summary.installmentsDebt)} sub="סה״כ תשלומים שנותרו" color="text-yellow-400" active={selectedCard === 'installments'} onClick={() => selectCard('installments')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie chart */}
        <div className="bg-[#1a1d2e] border border-[#2d3148] rounded-xl p-5">
          <h2 className="text-slate-300 font-semibold mb-4">פילוח קטגוריות</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={110}
                paddingAngle={2}
                dataKey="value"
                onClick={(entry) => {
                  if (!entry?.name) return
                  selectCategory(entry.name as string)
                }}
                style={{ cursor: 'pointer' }}
              >
                {pieData.map(entry => (
                  <Cell
                    key={entry.name}
                    fill={CATEGORY_COLORS[entry.name] ?? '#374151'}
                    opacity={selectedCategory && selectedCategory !== entry.name ? 0.35 : 1}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [formatCurrency(Number(value)), '']}
                contentStyle={{ backgroundColor: '#1a1d2e', border: '1px solid #2d3148', borderRadius: 8 }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Legend
                onClick={(entry) => selectCategory(entry.value as string)}
                formatter={(value) => (
                  <span style={{
                    color: selectedCategory && selectedCategory !== value ? '#4b5563' : '#94a3b8',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}>
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Right panel: card transactions, category transactions, or totals list */}
        <div className="bg-[#1a1d2e] border border-[#2d3148] rounded-xl p-5">
          {selectedCard ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-slate-300 font-semibold">{CARD_LABELS[selectedCard]}</h2>
                <button onClick={() => setSelectedCard(null)} className="text-white hover:text-slate-300 text-lg leading-none">✕</button>
              </div>
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {cardTransactions.map(t => (
                  <div key={t.id} className="flex justify-between items-center py-1.5 border-b border-[#2d3148] text-sm">
                    <div className="flex flex-col">
                      <span className="text-white">{t.description}</span>
                      <span className="text-slate-500 text-xs">{formatDate(t.date)} · {t.category}</span>
                    </div>
                    <span className={`font-medium ${t.amount < 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : selectedCategory ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <CategoryBadge category={selectedCategory} />
                  <span className="text-red-400 font-bold text-sm mr-2">
                    {formatCurrency(summary.byCategory[selectedCategory] ?? 0)}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-white hover:text-slate-300 text-lg leading-none"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {categoryTransactions.map(t => (
                  <div key={t.id} className="flex justify-between items-center py-1.5 border-b border-[#2d3148] text-sm">
                    <div className="flex flex-col">
                      <span className="text-white">{t.description}</span>
                      <span className="text-slate-500 text-xs">{formatDate(t.date)}</span>
                    </div>
                    <span className={`font-medium ${t.amount < 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <h2 className="text-slate-300 font-semibold mb-4">הוצאות לפי קטגוריה</h2>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {Object.entries(summary.byCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, amount]) => (
                    <div key={cat} className="flex justify-between items-center py-1 border-b border-[#2d3148]">
                      <CategoryBadge category={cat} />
                      <span className="text-red-400 font-medium text-sm">{formatCurrency(amount)}</span>
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Budget bars */}
      {budgetCategories.length > 0 && (
        <div className="bg-[#1a1d2e] border border-[#2d3148] rounded-xl p-5">
          <h2 className="text-slate-300 font-semibold mb-4">מעקב תקציב</h2>
          {budgetCategories.map(([cat, budget]) => (
            <BudgetBar key={cat} category={cat} spent={summary.byCategory[cat] ?? 0} budget={budget} />
          ))}
        </div>
      )}
    </div>
  )
}
