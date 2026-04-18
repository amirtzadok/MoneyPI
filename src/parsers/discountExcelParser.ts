import * as XLSX from 'xlsx'
import { categorize } from './categorizer'
import type { Transaction } from './types'

// Column layout (0-based), headers at row 7, data from row 8
// ["תאריך","יום ערך","תיאור התנועה","₪ זכות/חובה","₪ יתרה","אסמכתה","עמלה","ערוץ ביצוע"]
const COL = {
  DATE: 0,         // M/D/YY format
  DESCRIPTION: 2,  // תיאור התנועה
  AMOUNT: 3,       // negative = debit/expense, positive = credit/income
}

// Input: "4/12/26" (M/D/YY) → Output: "2026-04-12"
function parseDate(raw: string): string {
  const parts = String(raw).split('/')
  if (parts.length !== 3) return raw
  const month = parts[0].padStart(2, '0')
  const day = parts[1].padStart(2, '0')
  const year = 2000 + parseInt(parts[2])
  return `${year}-${month}-${day}`
}

function generateId(t: Partial<Transaction>): string {
  return `${t.date}-discount-${t.amount}-${t.rawDescription}`.replace(/\s/g, '_')
}

export function parseDiscountExcel(
  buffer: ArrayBuffer | number[],
  mappings: Record<string, string> = {}
): Transaction[] {
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows: string[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: '',
    raw: false,
  }) as string[][]

  // Rows 0-7: metadata + headers, data starts at row 8
  const dataRows = rows.slice(8)
  const transactions: Transaction[] = []

  for (const row of dataRows) {
    const description = String(row[COL.DESCRIPTION] ?? '').trim()
    if (!description) continue

    const rawAmount = String(row[COL.AMOUNT] ?? '0').replace(/,/g, '')
    const fileAmount = parseFloat(rawAmount) || 0
    if (fileAmount === 0) continue

    // File: negative = money out (expense), positive = money in (income/refund)
    // App convention: positive = expense, negative = refund/credit
    const amount = -fileAmount
    const paymentType = amount > 0 ? 'debit' : 'refund'

    const t: Transaction = {
      id: '',
      date: parseDate(String(row[COL.DATE] ?? '')),
      description,
      rawDescription: description,
      amount,
      category: categorize(description, mappings) as Transaction['category'],
      cardNumber: 'account',
      paymentType,
      source: 'discount_excel',
    }
    t.id = generateId(t)
    transactions.push(t)
  }

  return transactions
}
