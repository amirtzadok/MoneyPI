# MoneyPI — Project Memory

**Last session (2026-04-18):** Built full 5-tab dashboard, all parsers, Drive integration, AI insights. App live on GitHub Pages.

---

## What Is This

Personal finance SPA for an Israeli family. Parses Leumi bank Excel/HTML exports, stores data in Google Drive, shows dashboard with charts, budget tracking, cash management, and Claude AI analysis.

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
│   ├── useMonthData.ts       — navigates Expenses→Expenses 2025/2026→Month folders
│   └── types.ts              — AppConfig, MerchantMappings, CashEntry, MonthFolder, MonthData
├── parsers/
│   ├── types.ts              — Transaction interface, CATEGORIES (27 Hebrew items)
│   ├── categorizer.ts        — categorize(description, mappings) with RULES regex array
│   ├── leumiExcelParser.ts   — xlsx: headers row 3, data row 4, cols {DATE:0,MERCHANT:1,CARD:3,TYPE:4,AMOUNT:5,NOTES:10}
│   ├── leumiHtmlParser.ts    — xls (HTML): DOMParser, debit col[4] / credit col[5]
│   └── fileDetector.ts       — .xlsx→leumi_excel, .xls→leumi_html, .pdf→discount_pdf
├── hooks/
│   └── useAppData.ts         — central state: init + auto-load last month + auto-logout on 401
├── components/
│   ├── Nav.tsx               — 5 tabs: סקירה/עסקאות/תקציב/מזומן/✨AI
│   ├── CategoryBadge.tsx     — colored pill with CATEGORY_COLORS
│   ├── MonthSelector.tsx     — Hebrew month dropdown + "טען נתונים" button
│   └── LoadingSpinner.tsx
├── pages/
│   ├── LoginPage.tsx
│   ├── OverviewPage.tsx      — 4 cards + donut pie chart + budget bars
│   ├── TransactionsPage.tsx  — filter panel + table + inline merchant categorization
│   ├── BudgetPage.tsx        — per-category monthly budget inputs, saves to Drive config.json
│   ├── CashPage.tsx          — cash entry form + list, persisted to Drive cash-entries.json
│   └── InsightsPage.tsx      — Claude API key setup + Hebrew AI analysis
└── utils/
    ├── formatters.ts         — formatCurrency (₪ he-IL), formatDate, CATEGORY_COLORS (27)
    ├── summary.ts            — computeSummary → {totalExpense, totalIncome, byCategory, installmentsDebt}
    └── filters.ts            — filterTransactions with search/categories/paymentTypes/amount range
scripts/
└── seed-local.cjs            — Node.js: reads local Expenses/ → outputs scripts/output/<Month YYYY>/transactions.json
```

---

## Drive Folder Structure

```
My Drive/
└── Expenses/
    ├── Expenses 2025/
    │   ├── October 2025/
    │   │   └── transactions.json
    │   ├── November 2025/
    │   │   └── transactions.json
    │   └── December 2025/
    │       └── transactions.json
    └── Expenses 2026/
        ├── January 2026/
        │   └── transactions.json
        ├── February 2026/
        │   └── transactions.json
        ├── March 2026/
        │   └── transactions.json
        └── April 2026/
            └── transactions.json   ← or raw .xlsx/.xls files
```

App also stores (in root Expenses/ folder):
- `config.json` — Claude API key + per-category budgets
- `mappings.json` — merchant → category overrides
- `cash-entries.json` — manual cash expenses

---

## Key Decisions & Fixes

- **OAuth scope**: `drive` (not `drive.file`) — app needs to see user-created folders
- **401 handling**: `driveClient.ts` throws `TOKEN_EXPIRED` → `useAppData` catches → auto-logout → user re-logs in (token valid 1 hour)
- **Real xlsx format**: headers at row 3, data row 4, 11 columns (not 16). Installments in col 10 as "תשלום 1 מתוך 12"
- **Rules of Hooks**: `useMemo` must be called before any `if (!data) return` early returns
- **TypeScript**: `verbatimModuleSyntax` = must use `import type` for type-only imports
- **Auto-load**: `useAppData.initialize()` auto-loads last month's data on startup
- **CATEGORY_COLORS**: no duplicate hex values — סלולר=#2dd4bf, כללית=#f97316

---

## Categories (27)

מזון ותואלטיקה, פארם וביוטי, חוגים, לימודים, פסיכולוג, כללית, ביטוח משכנתא, חשמל, מים, בית כללי, ביטוח בריאות, ביטוח חיים, משכנתא, גז, אינטרנט, סלולר, Spotify, בתי ספר, רכב, ביטוח רכב, דלק, בילוי, דמי כיס, בגדים, כביש 6, תחב"צ, לא מסווג

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
- ✅ Drive folder navigation + month loading
- ✅ Excel (.xlsx) and HTML-Excel (.xls) parsing
- ✅ Auto-categorization with manual override (saves to mappings.json)
- ✅ Overview: 4 summary cards + donut pie chart + budget progress bars
- ✅ Transactions: filter by search/category/payment type/amount range
- ✅ Budget: set per-category limits, see current month spend %
- ✅ Cash: log manual cash expenses, persisted to Drive
- ✅ AI Insights: Claude API key stored in Drive, Hebrew analysis
- ✅ Auto-load last month on startup
- ✅ Auto-logout on token expiry (401)
- ✅ 38 tests passing

## What's Not Done

- ❌ Light mode toggle (skipped by user)
- ❌ PDF parser (discount_pdf stub only)
- ❌ Multi-month comparison view
- ❌ Token auto-refresh (re-login required every ~1 hour)
