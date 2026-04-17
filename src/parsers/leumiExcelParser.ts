import * as XLSX from 'xlsx'
import { categorize } from './categorizer'
import type { Transaction } from './types'

// Column indices in the xlsx (0-based), row 4 is header
const COL = {
  DATE: 0,           // תאריך עסקה
  MERCHANT: 2,       // שם בית עסק
  AMOUNT: 3,         // סכום עסקה
  INSTALLMENTS_TOTAL: 7,   // מספר תשלומים
  INSTALLMENTS_CURRENT: 8, // תשלום מספר
  TRANSACTION_TYPE: 9,     // סוג עסקה
  CARD: 12,          // מספר כרטיס
}

function parseDate(raw: string): string {
  // Input: DD-MM-YYYY → Output: YYYY-MM-DD
  const parts = String(raw).split('-')
  if (parts.length !== 3) return raw
  return `${parts[2]}-${parts[1]}-${parts[0]}`
}

function generateId(t: Partial<Transaction>): string {
  return `${t.date}-${t.cardNumber}-${t.amount}-${t.rawDescription}`.replace(/\s/g, '_')
}

export function parseLeumiExcel(
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

  // Skip first 4 rows (metadata), row 4 is headers, data starts at row 5
  const dataRows = rows.slice(5)

  const transactions: Transaction[] = []

  for (const row of dataRows) {
    const merchant = String(row[COL.MERCHANT] ?? '').trim()
    if (!merchant) continue

    const rawAmount = String(row[COL.AMOUNT] ?? '0').replace(/,/g, '')
    const amount = parseFloat(rawAmount) || 0
    if (amount === 0) continue

    const totalStr = String(row[COL.INSTALLMENTS_TOTAL] ?? '1')
    const currentStr = String(row[COL.INSTALLMENTS_CURRENT] ?? '1')
    const total = parseInt(totalStr) || 1
    const current = parseInt(currentStr) || 1

    const txType = String(row[COL.TRANSACTION_TYPE] ?? '').trim()
    const paymentType = txType.includes('תשלומים') ? 'credit'
      : txType.includes('הוראת קבע') ? 'standing_order'
      : txType.includes('זיכוי') ? 'refund'
      : 'credit'

    const t: Transaction = {
      id: '',
      date: parseDate(String(row[COL.DATE] ?? '')),
      description: merchant,
      rawDescription: merchant,
      amount,
      category: categorize(merchant, mappings) as Transaction['category'],
      cardNumber: String(row[COL.CARD] ?? '').trim(),
      paymentType,
      source: 'leumi_excel',
      ...(total > 1 ? { installments: { current, total } } : {}),
    }
    t.id = generateId(t)
    transactions.push(t)
  }

  return transactions
}
