import { describe, it, expect } from 'vitest'
import { parseLeumiExcel } from '../../src/parsers/leumiExcelParser'

// Matches real Bank Leumi MAX export format:
// Row 0-2: metadata, Row 3: headers, Row 4+: data
const makeXlsxBuffer = () => {
  const XLSX = require('xlsx')
  const ws = XLSX.utils.aoa_to_sheet([
    ['אמיר מנחם צדוק-34508176', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['5827-MAX Back Total', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['2025-10-01-2026-04-06', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    // Row 3 = headers
    ['תאריך עסקה', 'שם בית העסק', 'קטגוריה', '4 ספרות אחרונות של כרטיס האשראי', 'סוג עסקה', 'סכום חיוב', 'מטבע חיוב', 'סכום עסקה מקורי', 'מטבע עסקה מקורי', 'תאריך חיוב', 'הערות', 'תיוגים', 'מועדון הנחות', 'מפתח דיסקונט', 'אופן ביצוע ההעסקה', 'שער המרה'],
    // Row 4 = data (regular)
    ['14-04-2026', 'שופרסל דיל', 'מזון וצריכה', '5827', 'רגילה', '483.02', '₪', '483.02', '₪', '01-05-2026', '', '', '', '', '', ''],
    // Row 5 = installments
    ['12-04-2026', 'ישיר ביטוח חובה', 'ביטוח', '5827', 'תשלומים', '164.87', '₪', '1978', '₪', '01-05-2026', 'תשלום 1 מתוך 12', '', '', '', '', ''],
    // Row 6 = refund
    ['10-04-2026', 'זיכוי מסעדה', 'מסעדות', '5827', 'קרדיט', '150.00', '₪', '150.00', '₪', '01-05-2026', '', '', '', '', '', ''],
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
}

describe('parseLeumiExcel', () => {
  it('parses transactions from xlsx buffer', () => {
    const result = parseLeumiExcel(makeXlsxBuffer())
    expect(result).toHaveLength(3)
  })

  it('parses date correctly (DD-MM-YYYY → YYYY-MM-DD)', () => {
    const [t] = parseLeumiExcel(makeXlsxBuffer())
    expect(t.date).toBe('2026-04-14')
  })

  it('parses amount correctly', () => {
    const [t] = parseLeumiExcel(makeXlsxBuffer())
    expect(t.amount).toBe(483.02)
  })

  it('parses card number', () => {
    const [t] = parseLeumiExcel(makeXlsxBuffer())
    expect(t.cardNumber).toBe('5827')
  })

  it('parses installments from הערות column', () => {
    const txns = parseLeumiExcel(makeXlsxBuffer())
    expect(txns[1].installments).toEqual({ current: 1, total: 12 })
  })

  it('marks קרדיט as refund', () => {
    const txns = parseLeumiExcel(makeXlsxBuffer())
    expect(txns[2].paymentType).toBe('refund')
  })

  it('sets source to leumi_excel', () => {
    const [t] = parseLeumiExcel(makeXlsxBuffer())
    expect(t.source).toBe('leumi_excel')
  })
})
