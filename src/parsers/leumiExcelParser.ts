import * as XLSX from 'xlsx'
import { categorize } from './categorizer'
import type { Transaction } from './types'

// Real column layout (0-based), headers at row 3, data from row 4
const COL = {
  DATE: 0,              // תאריך עסקה        DD-MM-YYYY
  MERCHANT: 1,          // שם בית העסק
  CARD: 3,              // 4 ספרות אחרונות
  TRANSACTION_TYPE: 4,  // סוג עסקה (רגילה / תשלומים / קרדיט)
  AMOUNT: 5,            // סכום חיוב
  NOTES: 10,            // הערות — contains "תשלום 1 מתוך 12" for installments
}

function parseDate(raw: string): string {
  // Input: DD-MM-YYYY → Output: YYYY-MM-DD
  const parts = String(raw).split('-')
  if (parts.length !== 3) return raw
  return `${parts[2]}-${parts[1]}-${parts[0]}`
}

// Parse "תשלום 1 מתוך 12" → { current: 1, total: 12 }
function parseInstallments(notes: string): { current: number; total: number } | undefined {
  const m = notes.match(/תשלום\s+(\d+)\s+מתוך\s+(\d+)/)
  if (!m) return undefined
  return { current: parseInt(m[1]), total: parseInt(m[2]) }
}

function generateId(t: Partial<Transaction>): string {
  return `${t.date}-${t.cardNumber}-${t.amount}-${t.rawDescription}`.replace(/\s/g, '_')
}

function parseSheet(
  ws: XLSX.WorkSheet,
  mappings: Record<string, string>
): Transaction[] {
  const rows: string[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: '',
    raw: false,
  }) as string[][]

  const dataRows = rows.slice(4) // rows 0-2: metadata, row 3: headers
  const transactions: Transaction[] = []

  for (const row of dataRows) {
    const merchant = String(row[COL.MERCHANT] ?? '').trim()
    if (!merchant) continue

    const rawAmount = String(row[COL.AMOUNT] ?? '0').replace(/,/g, '')
    const amount = parseFloat(rawAmount) || 0
    if (amount === 0) continue

    const txType = String(row[COL.TRANSACTION_TYPE] ?? '').trim()
    const paymentType = txType === 'תשלומים' ? 'credit'
      : txType === 'קרדיט' ? 'refund'
      : txType === 'חיוב עסקות מיידי' ? 'debit'
      : 'credit'

    const installments = parseInstallments(String(row[COL.NOTES] ?? ''))

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
      ...(installments ? { installments } : {}),
    }
    t.id = generateId(t)
    transactions.push(t)
  }

  return transactions
}

export function parseLeumiExcel(
  buffer: ArrayBuffer | number[],
  mappings: Record<string, string> = {}
): Transaction[] {
  const wb = XLSX.read(buffer, { type: 'array' })
  const allTransactions: Transaction[] = []

  for (const sheetName of wb.SheetNames) {
    allTransactions.push(...parseSheet(wb.Sheets[sheetName], mappings))
  }

  return allTransactions
}
