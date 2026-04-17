import { describe, it, expect } from 'vitest'
import { filterTransactions } from '../../src/utils/filters'
import type { Transaction } from '../../src/parsers/types'

const tx = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 't1',
  date: '2026-03-01',
  description: 'שופרסל',
  rawDescription: 'שופרסל',
  amount: 100,
  category: 'מזון ותואלטיקה',
  cardNumber: '5827',
  paymentType: 'credit',
  source: 'leumi_excel',
  ...overrides,
})

describe('filterTransactions', () => {
  it('returns all when no filters', () => {
    const result = filterTransactions([tx(), tx({ id: 't2' })], {
      categories: [], search: '', paymentTypes: [], minAmount: null, maxAmount: null,
    })
    expect(result).toHaveLength(2)
  })

  it('filters by category', () => {
    const result = filterTransactions(
      [tx({ category: 'מזון ותואלטיקה' }), tx({ id: 't2', category: 'דלק' })],
      { categories: ['דלק'], search: '', paymentTypes: [], minAmount: null, maxAmount: null }
    )
    expect(result).toHaveLength(1)
    expect(result[0].category).toBe('דלק')
  })

  it('filters by search (case-insensitive)', () => {
    const result = filterTransactions(
      [tx({ description: 'שופרסל' }), tx({ id: 't2', description: 'פז' })],
      { categories: [], search: 'פז', paymentTypes: [], minAmount: null, maxAmount: null }
    )
    expect(result).toHaveLength(1)
  })

  it('filters by amount range', () => {
    const result = filterTransactions(
      [tx({ amount: 50 }), tx({ id: 't2', amount: 200 })],
      { categories: [], search: '', paymentTypes: [], minAmount: 100, maxAmount: null }
    )
    expect(result).toHaveLength(1)
    expect(result[0].amount).toBe(200)
  })

  it('filters by payment type', () => {
    const result = filterTransactions(
      [tx({ paymentType: 'credit' }), tx({ id: 't2', paymentType: 'debit' })],
      { categories: [], search: '', paymentTypes: ['debit'], minAmount: null, maxAmount: null }
    )
    expect(result).toHaveLength(1)
  })
})
