import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { computeSummary } from '../utils/summary'
import { formatCurrency, CATEGORY_COLORS } from '../utils/formatters'
import { CategoryBadge } from '../components/CategoryBadge'
import type { useAppData } from '../hooks/useAppData'
type AppData = ReturnType<typeof useAppData>

interface SummaryCardProps {
  label: string
  value: string
  sub?: string
  color?: string
}

function SummaryCard({ label, value, sub, color = 'text-slate-200' }: SummaryCardProps) {
  return (
    <div className="bg-[#1a1d2e] border border-[#2d3148] rounded-xl p-5">
      <p className="text-slate-500 text-sm mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-slate-600 text-xs mt-1">{sub}</p>}
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

  // Hooks MUST be called before any early returns
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

  // Early return AFTER all hooks
  if (!monthData) {
    return (
      <div className="text-center text-slate-500 mt-20">
        <p className="text-4xl mb-4">📊</p>
        <p>בחר חודש ולחץ "טען נתונים"</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="סה״כ הוצאות"
          value={formatCurrency(summary.totalExpense)}
          color="text-red-400"
        />
        <SummaryCard
          label="סה״כ זיכויים"
          value={formatCurrency(summary.totalIncome)}
          color="text-green-400"
        />
        <SummaryCard
          label="נטו"
          value={formatCurrency(summary.totalExpense - summary.totalIncome)}
          color="text-slate-200"
        />
        <SummaryCard
          label="חוב תשלומים עתידי"
          value={formatCurrency(summary.installmentsDebt)}
          sub="סה״כ תשלומים שנותרו"
          color="text-yellow-400"
        />
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
              >
                {pieData.map(entry => (
                  <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] ?? '#374151'} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [formatCurrency(Number(value)), '']}
                contentStyle={{ backgroundColor: '#1a1d2e', border: '1px solid #2d3148', borderRadius: 8 }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Legend
                formatter={(value) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top spending */}
        <div className="bg-[#1a1d2e] border border-[#2d3148] rounded-xl p-5">
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
        </div>
      </div>

      {/* Budget bars */}
      {budgetCategories.length > 0 && (
        <div className="bg-[#1a1d2e] border border-[#2d3148] rounded-xl p-5">
          <h2 className="text-slate-300 font-semibold mb-4">מעקב תקציב</h2>
          {budgetCategories.map(([cat, budget]) => (
            <BudgetBar
              key={cat}
              category={cat}
              spent={summary.byCategory[cat] ?? 0}
              budget={budget}
            />
          ))}
        </div>
      )}
    </div>
  )
}
