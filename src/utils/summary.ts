import type { Transaction } from '../parsers/types'

export interface MonthSummary {
  totalExpense: number
  totalIncome: number
  byCategory: Record<string, number>
  installmentsDebt: number
  transactionCount: number
}

export function computeSummary(transactions: Transaction[]): MonthSummary {
  const byCategory: Record<string, number> = {}
  let totalExpense = 0
  let totalIncome = 0
  let installmentsDebt = 0

  for (const t of transactions) {
    if (t.amount > 0) {
      totalExpense += t.amount
      byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount
      if (t.installments && t.installments.current < t.installments.total) {
        const remaining = t.installments.total - t.installments.current
        installmentsDebt += t.amount * remaining
      }
    } else {
      totalIncome += Math.abs(t.amount)
    }
  }

  return { totalExpense, totalIncome, byCategory, installmentsDebt, transactionCount: transactions.length }
}
