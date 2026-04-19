export const CATEGORIES = [
  'מזון ותואלטיקה', 'פארם וביוטי', 'חוגים', 'לימודים', 'פסיכולוג',
  'כללית', 'ביטוח משכנתא', 'חשמל', 'מים', 'בית כללי', 'ביטוח בריאות',
  'ביטוח חיים', 'משכנתא', 'גז', 'אינטרנט', 'סלולר', 'Spotify',
  'בתי ספר', 'רכב', 'ביטוח רכב', 'דלק', 'בילוי', 'דמי כיס',
  'בגדים', 'כביש 6', 'תחב"צ', 'משכורת', 'חנייה', 'עמלות בנק',
  'ביטוח', 'הוראת קבע', 'לא מסווג',
] as const

export type Category = typeof CATEGORIES[number]

export type PaymentType = 'credit' | 'debit' | 'standing_order' | 'cash' | 'refund'
export type DataSource = 'leumi_excel' | 'leumi_html' | 'discount_excel' | 'discount_pdf' | 'manual_cash'

export interface Transaction {
  id: string
  date: string              // ISO YYYY-MM-DD
  description: string       // normalized merchant name
  rawDescription: string    // original from file
  amount: number            // positive = expense, negative = refund/credit
  category: Category
  cardNumber: string        // last 4 digits, or 'account'
  installments?: { current: number; total: number }
  paymentType: PaymentType
  source: DataSource
}
