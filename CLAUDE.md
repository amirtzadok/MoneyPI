# MoneyPI — Project Memory

**Last session (2026-04-18):** Multi-bank support, Discount parser, sortable columns, pie drill-down, AI free chat, floating chat widget, improved categorization.

---

## What Is This

Personal finance SPA for an Israeli family. Parses Leumi bank Excel/HTML exports + Discount bank Excel, stores data in Google Drive, shows dashboard with charts, budget tracking, cash management, and Claude AI chat.

**Live URL:** `https://amirtzadok.github.io/MoneyPI/`
**Repo:** `https://github.com/amirtzadok/MoneyPI`

---

## Tech Stack

- React 18 + Vite + TypeScript
- Tailwind CSS v4 (RTL, `dir="rtl"`)
- Google OAuth 2.0 (`drive` scope) via `@react-oauth/google`
- Google Drive REST API v3 — stores all data (no backend)
- SheetJS (`xlsx`) for Excel parsing
- Recharts for pie chart
- Vitest + React Testing Library (38 tests)
- GitHub Actions → GitHub Pages (auto-deploy on push to main)

---

## Architecture

```
src/
├── auth/
│   ├── AuthContext.tsx         — token stored in sessionStorage
│   ├── GoogleAuthButton.tsx    — scope: drive + profile + email
│   └── useAuth.ts
├── drive/
│   ├── driveClient.ts          — Drive REST API wrapper (throws TOKEN_EXPIRED on 401)
│   ├── useDrive.ts             — config/mappings/cash CRUD
│   ├── useMonthData.ts         — Expenses 2026 only; merges all files; filters by folder month
│   └── types.ts                — AppConfig, MerchantMappings, CashEntry, MonthFolder, MonthData
├── parsers/
│   ├── types.ts                — Transaction interface, CATEGORIES (30 items)
│   ├── categorizer.ts          — categorize(desc, mappings) — RULES regex array
│   ├── leumiExcelParser.ts     — xlsx: headers row 3, data row 4, cols {DATE:0,MERCHANT:1,CARD:3,TYPE:4,AMOUNT:5,NOTES:10}
│   ├── leumiHtmlParser.ts      — xls (HTML): DOMParser, debit col[4] / credit col[5]
│   ├── discountExcelParser.ts  — xlsx: headers row 7, data row 8, {DATE:0,DESC:2,AMOUNT:3}, date M/D/YY
│   └── fileDetector.ts         — discount_*.xlsx→discount_excel, *.xlsx→leumi_excel, *.xls→leumi_html
├── hooks/
│   └── useAppData.ts           — central state: init + auto-load PREVIOUS month + auto-logout on 401
├── components/
│   ├── Nav.tsx                 — 5 tabs: סקירה/עסקאות/תקציב/מזומן/✨AI
│   ├── CategoryBadge.tsx       — colored pill with CATEGORY_COLORS
│   ├── MonthSelector.tsx       — Hebrew month dropdown + "טען נתונים" button
│   ├── LoadingSpinner.tsx
│   └── FloatingChat.tsx        — fixed ✨ button (bottom-left), chat panel, full expense context
├── pages/
│   ├── LoginPage.tsx
│   ├── OverviewPage.tsx        — 4 cards + clickable pie (slice+legend→drill-down) + budget bars
│   ├── TransactionsPage.tsx    — sortable columns + filter panel (ביטוח quick-filter) + search by desc+cat
│   ├── BudgetPage.tsx          — per-category budget inputs → Drive config.json
│   ├── CashPage.tsx            — cash entry form + list → Drive cash-entries.json
│   └── InsightsPage.tsx        — free-form AI chat with full transaction context + history
└── utils/
    ├── formatters.ts           — formatCurrency, formatDate, CATEGORY_COLORS (30)
    ├── summary.ts              — computeSummary → {totalExpense, totalIncome, byCategory, installmentsDebt}
    └── filters.ts              — filterTransactions: search matches description + category name
scripts/
└── seed-local.cjs             — reads local Expenses/ → outputs scripts/output/<Month>/transactions.json
```

---

## Drive Folder Structure

```
My Drive/
└── Expenses/
    └── Expenses 2026/
        ├── January 2026/
        │   ├── leumi_5827.xlsx
        │   ├── leumi_4549.xlsx
        │   ├── leumi_6546.xlsx
        │   └── discount_*.xlsx
        ├── February 2026/  (same)
        └── March 2026/     (same)
```

**Rules:**
- Do NOT place `transactions.json` in 2026 folders — breaks raw parsing
- Discount file must contain "discount" in filename for detection
- App only scans `Expenses 2026` (YEAR_FOLDERS constant)

Config files (root Expenses/ folder): `config.json`, `mappings.json`, `cash-entries.json`

---

## Bank File Formats

| Bank | Extension | Detection | Headers row | Data row | Key cols |
|------|-----------|-----------|-------------|----------|----------|
| Leumi credit | .xlsx | not "discount" | 3 | 4 | DATE:0, MERCHANT:1, CARD:3, TYPE:4, AMOUNT:5, NOTES:10 |
| Leumi account | .xls | .xls | HTML table | - | debit col[4], credit col[5] |
| Discount account | .xlsx | "discount" in name | 7 | 8 | DATE:0 (M/D/YY), DESC:2, AMOUNT:3 (neg=expense) |

---

## Key Decisions & Fixes

- **OAuth scope**: `drive` (not `drive.file`) — needs to see user-created folders
- **401 handling**: throws `TOKEN_EXPIRED` → auto-logout
- **Auto-load**: opens PREVIOUS month (current month - 1) on startup
- **Multi-file merge**: loads ALL files in folder, merges, then filters to folder's month/year
- **Search**: matches both description AND category name
- **Pie chart**: slice click OR legend click → shows that category's transactions in right panel (same page). Click again to deselect.
- **Sortable columns**: click any header in TransactionsPage to toggle asc/desc
- **Floating chat**: ✨ button fixed bottom-left, available on all tabs, full expense context per message
- **Rules of Hooks**: `useMemo` before any early returns
- **TypeScript**: `verbatimModuleSyntax` → use `import type` for type-only imports

---

## Categories (30)

מזון ותואלטיקה, פארם וביוטי, חוגים, לימודים, פסיכולוג, כללית, ביטוח משכנתא, חשמל, מים, בית כללי, ביטוח בריאות, ביטוח חיים, משכנתא, גז, אינטרנט, סלולר, Spotify, בתי ספר, רכב, ביטוח רכב, דלק, בילוי, דמי כיס, בגדים, כביש 6, תחב"צ, **משכורת**, **חנייה**, **עמלות בנק**, לא מסווג

---

## Known Merchant → Category Rules (user-confirmed)

| Merchant pattern | Category |
|-----------------|----------|
| הראל פנסיה חיוב | ביטוח חיים |
| פמלי/פמילי מרקט | מזון ותואלטיקה |
| טלראן-תקשורת | אינטרנט |
| מור מכון למידע רפואי | כללית |
| פרי טיוי | בית כללי |
| בנק לאומי משכורת | משכורת |
| PET SALE | בית כללי |
| הפניקס רכב חובה | ביטוח רכב |
| חניון | חנייה |
| בני אחמד סלאמה לגז | גז |
| בלוק ושתיל | בית כללי |
| עמלת פעולה | עמלות בנק |
| אינטלאלקטורנ-י | משכורת |
| מקס איט פיננ-י | **EXCLUDED** — credit card billing (already in card files, skip in leumiHtmlParser) |

---

## Google Cloud Setup

- Project: MoneyPI
- OAuth client: Web application
- Authorized JS origins: `http://localhost:5173`, `https://amirtzadok.github.io`
- Test users: both emails added
- GitHub secret: `VITE_GOOGLE_CLIENT_ID` set

---

## Deploy

GitHub Actions auto-deploys on push to `main` → publishes `dist/` to GitHub Pages. Base path: `/MoneyPI/`

---

## What's Working

- ✅ Google OAuth login/logout
- ✅ Drive folder navigation (Expenses 2026 only)
- ✅ Leumi xlsx + xls parsing — 3 cards: 5827, 4549, 6546
- ✅ Discount bank xlsx parsing (account 104669766, cardNumber: "discount")
- ✅ Multi-file merge per month + date filtering to folder month
- ✅ Auto-categorization (30 rules) + manual override → mappings.json
- ✅ Overview: 4 cards + clickable pie/legend drill-down + budget bars
- ✅ Transactions: sortable columns + search (desc+cat) + ביטוח quick-filter
- ✅ Budget: per-category limits + spend %
- ✅ Cash: manual cash expenses → Drive
- ✅ AI Insights: free-form chat with full transaction context + history
- ✅ Floating chat ✨ — all tabs, bottom-left
- ✅ Auto-load previous month on startup
- ✅ Auto-logout on token expiry (401)
- ✅ 38 tests passing

## What's Not Done

- ❌ PDF parser (discount_pdf stub only)
- ❌ Multi-month comparison view
- ❌ Token auto-refresh (re-login required every ~1 hour)
