import { useState, useCallback } from 'react'
import { useAuth } from '../auth/useAuth'
import { DriveClient } from './driveClient'
import { parseLeumiExcel } from '../parsers/leumiExcelParser'
import { parseLeumiHtml } from '../parsers/leumiHtmlParser'
import { detectFileType } from '../parsers/fileDetector'
import type { Transaction } from '../parsers/types'
import type { MonthFolder, MonthData, MerchantMappings } from './types'

const EXPENSES_ROOT = 'Expenses'
const YEAR_FOLDERS = ['Expenses 2025', 'Expenses 2026']

const MONTH_MAP: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4,
  may: 5, june: 6, july: 7, august: 8,
  september: 9, october: 10, november: 11, december: 12,
}

// Parse "April 2026" → { month: 4, year: 2026 }
function parseFolderName(name: string): { month: number; year: number } | null {
  const parts = name.trim().split(/\s+/)
  if (parts.length < 2) return null
  const monthName = parts[0].toLowerCase()
  const year = parseInt(parts[parts.length - 1])
  const month = MONTH_MAP[monthName]
  if (!month || isNaN(year)) return null
  return { month, year }
}

export function useMonthData() {
  const { accessToken } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getClient = useCallback(() => {
    if (!accessToken) throw new Error('Not authenticated')
    return new DriveClient(accessToken)
  }, [accessToken])

  const listMonthFolders = useCallback(async (): Promise<MonthFolder[]> => {
    const client = getClient()
    // Navigate: Expenses → Expenses 2025 + Expenses 2026 → collect all month folders
    const expensesId = await client.ensureFolder(EXPENSES_ROOT)
    const allFolders: MonthFolder[] = []

    for (const yearFolderName of YEAR_FOLDERS) {
      try {
        const yearFolderId = await client.ensureFolder(yearFolderName, expensesId)
        const files = await client.listFiles(yearFolderId)
        for (const f of files) {
          const parsed = parseFolderName(f.name)
          if (parsed) allFolders.push({ id: f.id, name: f.name, ...parsed })
        }
      } catch {
        // Year folder may not exist yet — skip
      }
    }

    return allFolders.sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
  }, [getClient])

  const loadMonthData = useCallback(async (
    folder: MonthFolder,
    mappings: MerchantMappings = {}
  ): Promise<MonthData> => {
    setLoading(true)
    setError(null)
    try {
      const client = getClient()
      const files = await client.listFiles(folder.id)
      const transactions: Transaction[] = []

      // Prefer pre-parsed transactions.json if present (uploaded by seed script)
      const preBuilt = files.find(f => f.name === 'transactions.json')
      if (preBuilt) {
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files/${preBuilt.id}?alt=media`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )
        if (res.ok) {
          const data: Transaction[] = await res.json()
          return {
            folder,
            transactions: data.sort((a, b) => b.date.localeCompare(a.date)),
            loadedAt: new Date().toISOString(),
          }
        }
      }

      // Otherwise parse raw bank export files
      for (const file of files) {
        const fileType = detectFileType(file.name, new ArrayBuffer(0))
        if (fileType === 'unknown') continue

        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )
        if (!res.ok) continue

        if (fileType === 'leumi_excel') {
          const buffer = await res.arrayBuffer()
          transactions.push(...parseLeumiExcel(buffer, mappings))
        } else if (fileType === 'leumi_html') {
          const text = await res.text()
          transactions.push(...parseLeumiHtml(text, mappings))
        }
        // discount_pdf: fee entries only, skip for now
      }

      return {
        folder,
        transactions: transactions.sort((a, b) => b.date.localeCompare(a.date)),
        loadedAt: new Date().toISOString(),
      }
    } catch (e) {
      setError(String(e))
      throw e
    } finally {
      setLoading(false)
    }
  }, [getClient, accessToken])

  return { loading, error, listMonthFolders, loadMonthData }
}
