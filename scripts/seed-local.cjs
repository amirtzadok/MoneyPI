#!/usr/bin/env node
/**
 * Seed script: reads local Expenses/ folder, parses bank files,
 * and writes JSON files to scripts/output/<Month YYYY>/transactions.json
 *
 * Run: node scripts/seed-local.cjs
 * Output files can then be uploaded to Drive: Expenses/Expenses 2026/<Month YYYY>/
 */

const fs = require('fs')
const path = require('path')
const XLSX = require('xlsx')
const { JSDOM } = require('jsdom')

const ROOT = path.join(__dirname, '..', 'Expenses')
const OUT = path.join(__dirname, 'output')

// ── Categories & keyword rules (mirror of src/parsers/categorizer.ts) ──────
const RULES = [
  [/שופרסל|רמי לוי|מגה|יינות ביתן|ויקטורי|סופר|טיב טעם|חצי חינם|AM:PM|מינימרקט|פמלי|חפר|השרון|מינכל/i, 'מזון ותואלטיקה'],
  [/סופר.?פארם|super.?pharm|נעמן|dm |be |רילייף|כללית פארמה/i, 'פארם וביוטי'],
  [/פז|דלק|סונול|Ten|טן |ספידי|yellow|גז סטיישן|fuel|פנגו|יילו/i, 'דלק'],
  [/כביש.?6|נתיבי ישראל|trans.?israel/i, 'כביש 6'],
  [/spotify/i, 'Spotify'],
  [/פרטנר|partner|סלקום|cellcom|HOT mobile|019|012|רמי לוי תקשורת/i, 'סלולר'],
  [/HOT |בזק|bezeq|012 smile|internet|אינטרנט|אינטלאלקטורנ/i, 'אינטרנט'],
  [/ביטוח משכנתא|הראל משכנתא|מגדל משכנתא/i, 'ביטוח משכנתא'],
  [/ביטוח בריאות|מנורה|כלל בריאות|הראל בריאות/i, 'ביטוח בריאות'],
  [/ביטוח חיים|ריסק/i, 'ביטוח חיים'],
  [/ישיר ביטוח|ביטוח חובה|direct insurance|הכשרה רכב|הפניקס רכב/i, 'ביטוח רכב'],
  [/כללית|מכבי|מאוחדת|לאומית רפואה|רופא|קופת חולים|pharmacy/i, 'כללית'],
  [/טסט|רישיון|מוסך|חניה|parking|רכב תיקון/i, 'רכב'],
  [/חברת חשמל|IEC|חשמל/i, 'חשמל'],
  [/מקורות|עיריית.*מים|water|מים/i, 'מים'],
  [/אמישראגז|סופרגז|פזגז|גז ישראל/i, 'גז'],
  [/משכנתא|לאומי למשכנתאות|מזרחי משכנתא/i, 'משכנתא'],
  [/חוג|studio|סטודיו|gym|כושר|מכון כושר|pilates|פילאטיס|yoga|יוגה/i, 'חוגים'],
  [/אוניברסיטה|מכללה|לימודים|קורס|udemy|coursera/i, 'לימודים'],
  [/בית ספר|גן ילדים|צהרון|חינוך/i, 'בתי ספר'],
  [/פסיכולוג|טיפול נפשי|פסיכיאטר/i, 'פסיכולוג'],
  [/זארה|ZARA|H&M|קסטרו|FOX|פוקס|מנגו|MANGO|בגד|ביגוד|SHEIN|asos/i, 'בגדים'],
  [/מסעדה|restaurant|בר |cafe|קפה|סינמה|cinema|בילוי|אירוע|פאב|מלך החיות/i, 'בילוי'],
  [/רב קו|רכבת|אגד|דן |מטרו/i, 'תחב"צ'],
  [/אייקאה|IKEA|ACE|home center|הום סנטר|שיפוץ|קרמיקה/i, 'בית כללי'],
  [/לאומי ויזה|מקס איט|כרטיסי אשראי|עמל\.|עמ\./i, 'לא מסווג'], // bank fees
]

function categorize(desc) {
  for (const [pattern, cat] of RULES) {
    if (pattern.test(desc)) return cat
  }
  return 'לא מסווג'
}

// ── Date parsers ─────────────────────────────────────────────────────────────
function parseDateDash(raw) {
  // DD-MM-YYYY → YYYY-MM-DD
  const p = String(raw).split('-')
  if (p.length !== 3) return raw
  return `${p[2]}-${p[1]}-${p[0]}`
}

function parseDateSlash(raw) {
  // DD/MM/YYYY → YYYY-MM-DD
  const p = String(raw).split('/')
  if (p.length !== 3) return raw
  return `${p[2]}-${p[1]}-${p[0]}`
}

function parseAmount(str) {
  return parseFloat(String(str).replace(/,/g, '').trim()) || 0
}

function genId(date, card, amount, desc) {
  return `${date}-${card}-${amount}-${desc}`.replace(/\s/g, '_')
}

// ── Parse installments from notes "תשלום 1 מתוך 12" ─────────────────────────
function parseInstallments(notes) {
  const m = String(notes).match(/תשלום\s+(\d+)\s+מתוך\s+(\d+)/)
  if (!m) return undefined
  return { current: parseInt(m[1]), total: parseInt(m[2]) }
}

// ── Bank Leumi Excel parser ──────────────────────────────────────────────────
function parseLeumiExcel(filePath) {
  const wb = XLSX.readFile(filePath)
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false })
  const txns = []

  // rows 0-2: metadata, row 3: headers, row 4+: data
  for (const row of rows.slice(4)) {
    const merchant = String(row[1] ?? '').trim()
    if (!merchant) continue
    const amount = parseAmount(row[5])
    if (amount === 0) continue

    const txType = String(row[4] ?? '').trim()
    const paymentType = txType === 'תשלומים' ? 'credit'
      : txType === 'קרדיט' ? 'refund'
      : txType === 'חיוב עסקות מיידי' ? 'debit'
      : 'credit'

    const installments = parseInstallments(row[10] ?? '')
    const date = parseDateDash(row[0])
    const card = String(row[3] ?? '').trim()

    txns.push({
      id: genId(date, card, amount, merchant),
      date,
      description: merchant,
      rawDescription: merchant,
      amount,
      category: categorize(merchant),
      cardNumber: card,
      paymentType,
      source: 'leumi_excel',
      ...(installments ? { installments } : {}),
    })
  }
  return txns
}

// ── Bank Leumi HTML/XLS parser ───────────────────────────────────────────────
function parseLeumiHtml(filePath) {
  const html = fs.readFileSync(filePath, 'utf8')
  const dom = new JSDOM(html)
  const rows = Array.from(dom.window.document.querySelectorAll('table tr'))
  const txns = []

  for (const row of rows) {
    const cells = Array.from(row.querySelectorAll('td')).map(td => td.textContent?.trim() ?? '')
    if (cells.length < 5) continue
    const dateStr = cells[0]
    if (!dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) continue

    const description = cells[2]
    const debit = parseAmount(cells[4])
    const credit = parseAmount(cells[5])
    if (debit === 0 && credit === 0) continue

    const isCredit = credit > 0
    const amount = isCredit ? -credit : debit
    const date = parseDateSlash(dateStr)

    txns.push({
      id: genId(date, 'account', amount, description),
      date,
      description,
      rawDescription: description,
      amount,
      category: categorize(description),
      cardNumber: 'account',
      paymentType: isCredit ? 'refund' : 'debit',
      source: 'leumi_html',
    })
  }
  return txns
}

// ── Group transactions by month ───────────────────────────────────────────────
const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

function groupByMonth(txns) {
  const map = {}
  for (const t of txns) {
    const [year, month] = t.date.split('-')
    const key = `${MONTH_NAMES[parseInt(month)]} ${year}`
    if (!map[key]) map[key] = []
    map[key].push(t)
  }
  return map
}

// ── Main ──────────────────────────────────────────────────────────────────────
let all = []

// Parse the big xlsx (all cards)
const xlsxPath = path.join(ROOT, 'Bank Leumi', '102025-042026.xlsx')
if (fs.existsSync(xlsxPath)) {
  const txns = parseLeumiExcel(xlsxPath)
  console.log(`xlsx: ${txns.length} transactions`)
  all.push(...txns)
}

// Parse account movements xls
const xlsFiles = fs.readdirSync(path.join(ROOT, 'Bank Leumi'))
  .filter(f => f.endsWith('.xls'))
  .map(f => path.join(ROOT, 'Bank Leumi', f))

for (const f of xlsFiles) {
  const txns = parseLeumiHtml(f)
  console.log(`xls ${path.basename(f)}: ${txns.length} transactions`)
  all.push(...txns)
}

// Deduplicate by id
const seen = new Set()
all = all.filter(t => {
  if (seen.has(t.id)) return false
  seen.add(t.id)
  return true
})

console.log(`Total unique: ${all.length}`)

// Group and write output files
const byMonth = groupByMonth(all)
fs.mkdirSync(OUT, { recursive: true })

for (const [monthName, txns] of Object.entries(byMonth)) {
  const dir = path.join(OUT, monthName)
  fs.mkdirSync(dir, { recursive: true })
  txns.sort((a, b) => b.date.localeCompare(a.date))
  fs.writeFileSync(path.join(dir, 'transactions.json'), JSON.stringify(txns, null, 2))
  console.log(`  ${monthName}: ${txns.length} transactions → ${dir}`)
}

console.log('\nDone. Upload each folder to Drive: Expenses/Expenses 2026/<Month YYYY>/')
console.log('Or upload transactions.json inside the existing April 2026 folder.')
