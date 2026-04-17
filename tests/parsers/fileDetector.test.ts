import { describe, it, expect } from 'vitest'
import { detectFileType } from '../../src/parsers/fileDetector'

describe('detectFileType', () => {
  it('detects leumi_excel for .xlsx', () => {
    expect(detectFileType('102025-042026.xlsx', new ArrayBuffer(0))).toBe('leumi_excel')
  })

  it('detects leumi_html for .xls', () => {
    expect(detectFileType('תנועות בחשבון 6_4_2026.xls', new ArrayBuffer(0))).toBe('leumi_html')
  })

  it('detects discount_pdf for pdf with fees in name', () => {
    expect(detectFileType('fees_info_query_06042026.pdf', new ArrayBuffer(0))).toBe('discount_pdf')
  })

  it('returns unknown for unrecognized', () => {
    expect(detectFileType('random.csv', new ArrayBuffer(0))).toBe('unknown')
  })
})
