export type FileType = 'leumi_excel' | 'leumi_html' | 'discount_excel' | 'discount_pdf' | 'unknown'

export function detectFileType(filename: string, _buffer: ArrayBuffer): FileType {
  const lower = filename.toLowerCase()

  if (lower.endsWith('.xlsx') && lower.includes('discount')) return 'discount_excel'
  if (lower.endsWith('.xlsx')) return 'leumi_excel'
  if (lower.endsWith('.xls')) return 'leumi_html'
  if (lower.endsWith('.pdf')) return 'discount_pdf'

  return 'unknown'
}
