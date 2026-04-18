export function formatCurrency(amount: number): string {
  return `₪${Math.abs(amount).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatDate(iso: string): string {
  // YYYY-MM-DD → DD/MM/YYYY
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export const CATEGORY_COLORS: Record<string, string> = {
  'מזון ותואלטיקה': '#4ade80',
  'פארם וביוטי': '#f472b6',
  'חוגים': '#a78bfa',
  'לימודים': '#60a5fa',
  'פסיכולוג': '#34d399',
  'כללית': '#f97316',
  'ביטוח משכנתא': '#94a3b8',
  'חשמל': '#fbbf24',
  'מים': '#38bdf8',
  'בית כללי': '#a3e635',
  'ביטוח בריאות': '#e879f9',
  'ביטוח חיים': '#c084fc',
  'משכנתא': '#6366f1',
  'גז': '#f87171',
  'אינטרנט': '#22d3ee',
  'סלולר': '#2dd4bf',
  'Spotify': '#1db954',
  'בתי ספר': '#fde68a',
  'רכב': '#9ca3af',
  'ביטוח רכב': '#cbd5e1',
  'דלק': '#fb923c',
  'בילוי': '#f43f5e',
  'דמי כיס': '#86efac',
  'בגדים': '#d946ef',
  'כביש 6': '#64748b',
  'תחב"צ': '#0ea5e9',
  'משכורת': '#10b981',
  'חנייה': '#78716c',
  'לא מסווג': '#374151',
}
