import { describe, it, expect } from 'vitest'
import { parseLeumiExcel } from '../../src/parsers/leumiExcelParser'

// Minimal xlsx buffer that mimics the real format
// Row 0: cardholder info
// Row 1-3: metadata
// Row 4: headers
// Row 5+: data
const makeXlsxBuffer = () => {
  const XLSX = require('xlsx')
  const ws = XLSX.utils.aoa_to_sheet([
    ['כרטיס אשראי לאומי', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['שם בעל הכרטיס:', 'אמיר מנחם צדוק', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['מספר כרטיס:', '5827', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['תקופה:', '10/2025 - 04/2026', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    // Row 4 = headers
    ['תאריך עסקה', 'תאריך חיוב', 'שם בית עסק', 'סכום עסקה', 'מטבע', 'סכום חיוב', 'מטבע חיוב', 'מספר תשלומים', 'תשלום מספר', 'סוג עסקה', 'קוד מנפיק', 'קוד ענף', 'מספר כרטיס', 'מספר שובר', 'הערות', 'מועד פירעון'],
    // Row 5 = data
    ['14-04-2026', '01-05-2026', 'שופרסל דיל', '483.02', 'ILS', '483.02', 'ILS', '1', '1', 'רגיל', '', '', '5827', '123456', '', ''],
    ['12-04-2026', '01-05-2026', 'מכבי שירותי בריאות', '250.00', 'ILS', '83.33', 'ILS', '3', '1', 'תשלומים', '', '', '5827', '654321', '', ''],
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
}

describe('parseLeumiExcel', () => {
  it('parses transactions from xlsx buffer', () => {
    const buffer = makeXlsxBuffer()
    const result = parseLeumiExcel(buffer)
    expect(result).toHaveLength(2)
  })

  it('parses date correctly', () => {
    const buffer = makeXlsxBuffer()
    const [t] = parseLeumiExcel(buffer)
    expect(t.date).toBe('2026-04-14')
  })

  it('parses amount correctly', () => {
    const buffer = makeXlsxBuffer()
    const [t] = parseLeumiExcel(buffer)
    expect(t.amount).toBe(483.02)
  })

  it('parses card number', () => {
    const buffer = makeXlsxBuffer()
    const [t] = parseLeumiExcel(buffer)
    expect(t.cardNumber).toBe('5827')
  })

  it('parses installments', () => {
    const buffer = makeXlsxBuffer()
    const txns = parseLeumiExcel(buffer)
    expect(txns[1].installments).toEqual({ current: 1, total: 3 })
  })

  it('sets source to leumi_excel', () => {
    const buffer = makeXlsxBuffer()
    const [t] = parseLeumiExcel(buffer)
    expect(t.source).toBe('leumi_excel')
  })
})
