import type { Transaction } from '../parsers/types'

export interface TransactionFilters {
  categories: string[]
  search: string
  paymentTypes: string[]
  minAmount: number | null
  maxAmount: number | null
}

export function filterTransactions(
  transactions: Transaction[],
  filters: TransactionFilters
): Transaction[] {
  return transactions.filter(t => {
    if (filters.categories.length > 0 && !filters.categories.includes(t.category)) return false
    if (filters.search && !t.description.toLowerCase().includes(filters.search.toLowerCase())) return false
    if (filters.paymentTypes.length > 0 && !filters.paymentTypes.includes(t.paymentType)) return false
    if (filters.minAmount !== null && Math.abs(t.amount) < filters.minAmount) return false
    if (filters.maxAmount !== null && Math.abs(t.amount) > filters.maxAmount) return false
    return true
  })
}
