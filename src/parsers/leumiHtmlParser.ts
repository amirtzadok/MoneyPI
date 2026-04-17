import { categorize } from './categorizer'
import type { Transaction } from './types'

function parseAmount(raw: string): number {
  return parseFloat(raw.replace(/,/g, '').trim()) || 0
}

function parseDate(raw: string): string {
  // Input: DD/MM/YYYY → Output: YYYY-MM-DD
  const parts = raw.trim().split('/')
  if (parts.length !== 3) return raw
  return `${parts[2]}-${parts[1]}-${parts[0]}`
}

function generateId(t: Partial<Transaction>): string {
  return `${t.date}-account-${t.amount}-${t.rawDescription}`.replace(/\s/g, '_')
}

export function parseLeumiHtml(
  htmlContent: string,
  mappings: Record<string, string> = {}
): Transaction[] {
  // Parse HTML in browser using DOMParser
  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlContent, 'text/html')
  const rows = Array.from(doc.querySelectorAll('table tr'))

  const transactions: Transaction[] = []

  // Skip header row (index 0)
  for (const row of rows.slice(1)) {
    const cells = Array.from(row.querySelectorAll('td')).map(td => td.textContent?.trim() ?? '')
    if (cells.length < 5) continue

    const dateStr = cells[0]
    const description = cells[2]
    const debitStr = cells[4]
    const creditStr = cells[5]

    if (!dateStr || !description) continue

    const debit = parseAmount(debitStr)
    const credit = parseAmount(creditStr)

    if (debit === 0 && credit === 0) continue

    const isCredit = credit > 0
    const amount = isCredit ? -credit : debit

    const t: Transaction = {
      id: '',
      date: parseDate(dateStr),
      description,
      rawDescription: description,
      amount,
      category: categorize(description, mappings) as Transaction['category'],
      cardNumber: 'account',
      paymentType: isCredit ? 'refund' : 'debit',
      source: 'leumi_html',
    }
    t.id = generateId(t)
    transactions.push(t)
  }

  return transactions
}
