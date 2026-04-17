export interface AppConfig {
  claudeApiKey: string
  budgets: Record<string, number>  // category → monthly limit in ILS
}

export interface MerchantMappings {
  [merchantName: string]: string   // merchant → category
}

export interface CashEntry {
  id: string
  date: string          // ISO YYYY-MM-DD
  amount: number
  category: string
  note: string
}

export const APP_FOLDER_NAME = 'MoneyPI'
export const CONFIG_FILE = 'config.json'
export const MAPPINGS_FILE = 'mappings.json'
export const CASH_FILE = 'cash-entries.json'
