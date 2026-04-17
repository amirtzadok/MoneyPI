import { useState } from 'react'
import { CATEGORIES } from '../parsers/types'
import { formatCurrency } from '../utils/formatters'
import { CategoryBadge } from '../components/CategoryBadge'
import type { useAppData } from '../hooks/useAppData'
type AppData = ReturnType<typeof useAppData>

export function BudgetPage({ appData }: { appData: AppData }) {
  const { config, saveConfig, monthData } = appData
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const spentByCategory = monthData
    ? monthData.transactions
        .filter(t => t.amount > 0)
        .reduce((acc, t) => {
          acc[t.category] = (acc[t.category] ?? 0) + t.amount
          return acc
        }, {} as Record<string, number>)
    : {}

  function handleEdit(cat: string, val: string) {
    setEditing(prev => ({ ...prev, [cat]: val }))
  }

  async function handleSave() {
    setSaving(true)
    const updatedBudgets = { ...config.budgets }
    for (const [cat, val] of Object.entries(editing)) {
      const num = parseFloat(val)
      if (!isNaN(num) && num > 0) updatedBudgets[cat] = num
      else if (val === '' || val === '0') delete updatedBudgets[cat]
    }
    await saveConfig({ ...config, budgets: updatedBudgets })
    setEditing({})
    setSaving(false)
  }

  const hasChanges = Object.keys(editing).length > 0

  return (
    <div className="max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-slate-200 text-xl font-bold">הגדרת תקציב חודשי</h1>
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm"
          >
            {saving ? 'שומר...' : 'שמור שינויים'}
          </button>
        )}
      </div>

      <div className="bg-[#1a1d2e] border border-[#2d3148] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2d3148]">
              <th className="text-right p-3 text-slate-500 font-medium">קטגוריה</th>
              <th className="text-right p-3 text-slate-500 font-medium">הוצאה החודש</th>
              <th className="text-right p-3 text-slate-500 font-medium">תקציב חודשי (₪)</th>
            </tr>
          </thead>
          <tbody>
            {[...CATEGORIES].filter(c => c !== 'לא מסווג').map(cat => {
              const budget = editing[cat] !== undefined ? editing[cat] : (config.budgets[cat]?.toString() ?? '')
              const spent = spentByCategory[cat] ?? 0
              const budgetNum = parseFloat(budget) || 0
              const pct = budgetNum > 0 ? Math.round((spent / budgetNum) * 100) : null
              return (
                <tr key={cat} className="border-b border-[#141620] hover:bg-[#1e2135]">
                  <td className="p-3"><CategoryBadge category={cat} /></td>
                  <td className="p-3 text-slate-400">
                    {spent > 0 ? (
                      <span className={pct !== null && pct >= 95 ? 'text-red-400' : pct !== null && pct >= 80 ? 'text-yellow-400' : 'text-slate-300'}>
                        {formatCurrency(spent)} {pct !== null ? `(${pct}%)` : ''}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      value={budget}
                      onChange={e => handleEdit(cat, e.target.value)}
                      placeholder="ללא הגבלה"
                      className="w-32 bg-[#0f1117] border border-[#2d3148] text-slate-200 px-2 py-1 rounded text-sm placeholder:text-slate-600"
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
