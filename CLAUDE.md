# MoneyPI — Project Memory

**Last session (2026-04-18):** Added multi-bank/multi-card support, Discount bank parser, sortable columns, pie→category drill-down, improved categorization rules.

---

## What Is This

Personal finance SPA for an Israeli family. Parses Leumi bank Excel/HTML exports + Discount bank Excel, stores data in Google Drive, shows dashboard with charts, budget tracking, cash management, and Claude AI analysis.

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
│   ├── AuthContext.tsx       — token stored in sessionStorage
│   ├── GoogleAuthButton.tsx  — scope: drive + profile + email
│   └── useAuth.ts
├── drive/
│   ├── driveClient.ts        — Drive REST API wrapper (throws TOKEN_EXPIRED on 401)
│   ├── useDrive.ts           — config/mappings/cash CRUD
│   ├── useMonthData.ts       — navigates Expenses→Expenses 2026→Month folders (2026 only)
│   └── types.ts              — AppConfig, MerchantMappings, CashEntry, MonthFolder, MonthData
├── parsers/
│   ├── types.ts              — Transaction interface, CATEGORIES (29 Hebrew items)
│   ├── categorizer.ts        — categorize(description, mappings) with RULES regex array
│   ├── leumiExcelParser.ts   — xlsx: headers row 3, data row 4, cols {DATE:0,MERCHANT:1,CARD:3,TYPE:4,AMOUNT:5,NOTES:10}
│   ├── leumiHtmlParser.ts    — xls (HTML): DOMParser, debit col[4] / credit col[5]
│   ├── discountExcelParser.ts — Discount bank xlsx: headers row 7, data row 8, cols {DATE:0,DESC:2,AMOUNT:3}
│   └── fileDetector.ts       — discount_*.xlsx→discount_excel, *.xlsx→leumi_excel, *.xls→leumi_html
├── hooks/
│   └── useAppData.ts         — central state: init + auto-load PREVIOUS month + auto-logout on 401
├── components/
│   ├── Nav.tsx               — 5 tabs: סקירה/עסקאות/תקציב/מזומן/✨AI
│   ├── CategoryBadge.tsx     — colored pill with CATEGORY_COLORS
│   ├── MonthSelector.tsx     — Hebrew month dropdown + "טען נתונים" button
│   └── LoadingSpinner.tsx
├── pages/
│   ├── LoginPage.tsx
│   ├── OverviewPage.tsx      — 4 cards + donut pie chart (clickable→drill-down) + budget bars
│   ├── TransactionsPage.tsx  — sortable columns + filter panel (incl. ביטוח quick-filter) + table
│   ├── BudgetPage.tsx        — per-category monthly budget inputs, saves to Drive config.json
│   ├── CashPage.tsx          — cash entry form + list, persisted to Drive cash-entries.json
│   └── InsightsPage.tsx      — Claude API key setup + Hebrew AI analysis
└── utils/
    ├── formatters.ts         — formatCurrency (₪ he-IL), formatDate, CATEGORY_COLORS (29)
    ├── summary.ts            — computeSummary → {totalExpense, totalIncome, byCategory, installmentsDebt}
    └── filters.ts            — filterTransactions: search matches description + category name
scripts/
└── seed-local.cjs            — Node.js: reads local Expenses/ → outputs scripts/output/<Month YYYY>/transactions.json
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
        ├── February 2026/  (same structure)
        └── March 2026/     (same structure)
```

**Important:** Do NOT place `transactions.json` in 2026 folders — app parses raw xlsx directly.
App also stores (in root Expenses/ folder):
- `config.json` — Claude API key + per-category budgets
- `mappings.json` — merchant → category overrides
- `cash-entries.json` — manual cash expenses

---

## Bank File Naming Conventions

- Leumi cards: `leumi_5827.xlsx`, `leumi_4549.xlsx`, `leumi_6546.xlsx`
- Discount account: any filename containing "discount" → `discount_*.xlsx`
- Detection: filename-based. Discount xlsx: headers row 7, date format M/D/YY, amount col 3 (negative=expense)

---

## Key Decisions & Fixes

- **OAuth scope**: `drive` (not `drive.file`) — app needs to see user-created folders
- **401 handling**: `driveClient.ts` throws `TOKEN_EXPIRED` → `useAppData` catches → auto-logout
- **Auto-load**: opens PREVIOUS month by default (current month - 1)
- **Multi-file merge**: `loadMonthData` iterates ALL files in folder, merges transactions, then filters to folder's month/year (handles multi-month Discount exports)
- **YEAR_FOLDERS**: only `['Expenses 2026']` — 2025 data excluded
- **Search**: matches both description AND category name
- **Pie chart**: clicking a slice shows that category's transactions in the left panel (same page)
- **Sortable columns**: click any header in TransactionsPage to sort asc/desc
- **Rules of Hooks**: `useMemo` must be called before any `if (!data) return` early returns
- **TypeScript**: `verbatimModuleSyntax` = must use `import type` for type-only imports

---

## Categories (29)

מזון ותואלטיקה, פארם וביוטי, חוגים, לימודים, פסיכולוג, כללית, ביטוח משכנתא, חשמל, מים, בית כללי, ביטוח בריאות, ביטוח חיים, משכנתא, גז, אינטרנט, סלולר, Spotify, בתי ספר, רכב, ביטוח רכב, דלק, בילוי, דמי כיס, בגדים, כביש 6, תחב"צ, **משכורת**, **חנייה**, לא מסווג

---

## Known Merchant → Category Rules (user-confirmed)

| Merchant | Category |
|----------|----------|
| הראל פנסיה חיוב | ביטוח חיים |
| פמילי מרקט / י.א.פמילי מרקט | מזון ותואלטיקה |
| טלראן-תקשורת | אינטרנט |
| מור מכון למידע רפואי | כללית |
| פרי טיוי | בית כללי |
| בנק לאומי משכורת | משכורת |
| PET SALE | בית כללי |
| הפניקס רכב חובה | ביטוח רכב |
| חניון | חנייה |
| בני אחמד סלאמה לגז | גז |

---

## Google Cloud Setup

- Project: MoneyPI
- OAuth client: Web application
- Authorized JS origins: `http://localhost:5173`, `https://amirtzadok.github.io`
- Test users: both emails added
- GitHub secret: `VITE_GOOGLE_CLIENT_ID` set

---

## Deploy

GitHub Actions auto-deploys on push to `main`:
- Runs `npm run build` with `VITE_GOOGLE_CLIENT_ID` secret
- Publishes `dist/` to GitHub Pages
- Base path: `/MoneyPI/`

---

## What's Working

- ✅ Google OAuth login/logout
- ✅ Drive folder navigation + month loading (Expenses 2026 only)
- ✅ Leumi Excel (.xlsx) and HTML-Excel (.xls) parsing — 3 cards: 5827, 4549, 6546
- ✅ Discount bank Excel parsing (account 104669766)
- ✅ Multi-file merge per month + month-date filtering
- ✅ Auto-categorization with manual override (saves to mappings.json)
- ✅ Overview: 4 summary cards + donut pie chart (clickable drill-down) + budget bars
- ✅ Transactions: sortable columns + filter by search(desc+cat)/category/payment type/amount
- ✅ ביטוח quick-filter button (selects all 4 insurance categories)
- ✅ Budget: set per-category limits, see current month spend %
- ✅ Cash: log manual cash expenses, persisted to Drive
- ✅ AI Insights: Claude API key stored in Drive, Hebrew analysis
- ✅ Auto-load previous month on startup
- ✅ Auto-logout on token expiry (401)
- ✅ 38 tests passing

## What's Not Done

- ❌ Light mode toggle (skipped by user)
- ❌ PDF parser (discount_pdf stub only)
- ❌ Multi-month comparison view
- ❌ Token auto-refresh (re-login required every ~1 hour)
