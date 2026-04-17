import { describe, it, expect } from 'vitest'
import { computeSummary } from '../../src/utils/summary'
import type { Transaction } from '../../src/parsers/types'

const tx = (amount: number, category = 'מזון ותואלטיקה', installments?: { current: number; total: number }): Transaction => ({
  id: `t-${amount}`,
  date: '2026-03-01',
  description: 'test',
  rawDescription: 'test',
  amount,
  category: category as Transaction['category'],
  cardNumber: '5827',
  paymentType: 'credit',
  source: 'leumi_excel',
  ...(installments ? { installments } : {}),
})

describe('computeSummary', () => {
  it('sums expenses', () => {
    const s = computeSummary([tx(100), tx(200)])
    expect(s.totalExpense).toBe(300)
  })

  it('sums income (negative amounts)', () => {
    const s = computeSummary([tx(100), tx(-50)])
    expect(s.totalIncome).toBe(50)
    expect(s.totalExpense).toBe(100)
  })

  it('groups by category', () => {
    const s = computeSummary([tx(100, 'מזון ותואלטיקה'), tx(200, 'דלק')])
    expect(s.byCategory['מזון ותואלטיקה']).toBe(100)
    expect(s.byCategory['דלק']).toBe(200)
  })

  it('computes installments debt', () => {
    // current=1 of 3, amount=100 per payment → 2 remaining = 200 debt
    const s = computeSummary([tx(100, 'מזון ותואלטיקה', { current: 1, total: 3 })])
    expect(s.installmentsDebt).toBe(200)
  })

  it('no debt when last installment', () => {
    const s = computeSummary([tx(100, 'מזון ותואלטיקה', { current: 3, total: 3 })])
    expect(s.installmentsDebt).toBe(0)
  })
})
